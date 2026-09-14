-- 1. 后台可调价格表
CREATE TABLE public.pricing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  plan_type text NOT NULL DEFAULT 'post',
  category text,
  duration_days integer NOT NULL DEFAULT 30,
  amount_cents integer NOT NULL DEFAULT 199,
  currency text NOT NULL DEFAULT 'usd',
  post_credits integer NOT NULL DEFAULT 0,
  unlimited_posts boolean NOT NULL DEFAULT false,
  is_boost boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pricing_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_plans TO authenticated;
GRANT ALL ON public.pricing_plans TO service_role;

ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "任何人可以查看启用的价格方案"
ON public.pricing_plans FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "管理员可以创建价格方案"
ON public.pricing_plans FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "管理员可以更新价格方案"
ON public.pricing_plans FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "管理员可以删除价格方案"
ON public.pricing_plans FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_pricing_plans_updated_at
BEFORE UPDATE ON public.pricing_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. 用户额度表
CREATE TABLE public.user_credits (
  user_id uuid PRIMARY KEY,
  post_credits integer NOT NULL DEFAULT 0,
  unlimited_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_credits TO authenticated;
GRANT ALL ON public.user_credits TO service_role;

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看自己的额度"
ON public.user_credits FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_user_credits_updated_at
BEFORE UPDATE ON public.user_credits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. 扩展 payments 表
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS plan_key text,
  ADD COLUMN IF NOT EXISTS plan_name text,
  ADD COLUMN IF NOT EXISTS duration_days integer,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'usd',
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.payments ALTER COLUMN post_id DROP NOT NULL;
ALTER TABLE public.payments ALTER COLUMN post_type SET DEFAULT 'post';

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_session ON public.payments(stripe_session_id) WHERE stripe_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id, created_at DESC);

-- 4. posts 付费相关字段
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_boosted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS boost_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS bumped_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_until timestamptz;

-- 5. 额度消费函数（发帖时扣额度）
CREATE OR REPLACE FUNCTION public.consume_post_credit(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.user_credits;
BEGIN
  SELECT * INTO rec FROM public.user_credits WHERE user_id = _user_id FOR UPDATE;

  IF rec.user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_credits');
  END IF;

  IF rec.unlimited_until IS NOT NULL AND rec.unlimited_until > now() THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'unlimited');
  END IF;

  IF rec.post_credits > 0 THEN
    UPDATE public.user_credits
      SET post_credits = post_credits - 1
      WHERE user_id = _user_id;
    RETURN jsonb_build_object('allowed', true, 'reason', 'credit_used');
  END IF;

  RETURN jsonb_build_object('allowed', false, 'reason', 'no_credits');
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_post_credit(uuid) TO authenticated;
