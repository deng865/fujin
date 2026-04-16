-- 1. profiles 添加信用分
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS credit_score integer NOT NULL DEFAULT 100;

-- 2. reviews 添加设备/IP/审核状态
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS device_id text,
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';

-- status: 'approved' | 'pending' | 'rejected'
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_device_post ON public.reviews(device_id, post_id, created_at DESC);

-- 3. user_visits: 追踪用户在商家附近的停留
CREATE TABLE IF NOT EXISTS public.user_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  device_id text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  total_duration_seconds integer NOT NULL DEFAULT 0,
  qualified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_user_visits_user ON public.user_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_visits_post ON public.user_visits(post_id);

ALTER TABLE public.user_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own visits" ON public.user_visits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own visits" ON public.user_visits
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own visits" ON public.user_visits
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all visits" ON public.user_visits
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. 校验函数：用户是否有资格评价某商家
CREATE OR REPLACE FUNCTION public.can_user_review_post(_user_id uuid, _post_id uuid, _device_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_mobile boolean;
  _post_owner uuid;
  _credit integer;
  _visit RECORD;
  _recent_count integer;
BEGIN
  -- 取帖子信息
  SELECT is_mobile, user_id INTO _is_mobile, _post_owner
  FROM posts WHERE id = _post_id;

  IF _post_owner IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', '帖子不存在');
  END IF;

  IF _post_owner = _user_id THEN
    RETURN jsonb_build_object('allowed', false, 'reason', '不能评价自己的商家');
  END IF;

  -- 信用分检查
  SELECT credit_score INTO _credit FROM profiles WHERE id = _user_id;
  IF COALESCE(_credit, 100) < 30 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', '您的信用分过低，已被暂停评价权限');
  END IF;

  -- 24h 频率限制：同一 device_id 不能在 24h 内重复评价同一商家
  IF _device_id IS NOT NULL THEN
    SELECT COUNT(*) INTO _recent_count
    FROM reviews
    WHERE post_id = _post_id
      AND device_id = _device_id
      AND created_at > now() - interval '24 hours';
    IF _recent_count > 0 THEN
      RETURN jsonb_build_object('allowed', false, 'reason', '同一设备 24 小时内只能评价该商家一次');
    END IF;
  END IF;

  -- 同一 user 不能重复评价
  SELECT COUNT(*) INTO _recent_count
  FROM reviews
  WHERE post_id = _post_id AND sender_id = _user_id;
  IF _recent_count > 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', '您已评价过该商家');
  END IF;

  -- 仅固定商家需要地理停留校验
  IF _is_mobile = false THEN
    SELECT * INTO _visit FROM user_visits
    WHERE user_id = _user_id AND post_id = _post_id;

    IF NOT FOUND OR _visit.qualified = false THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', '需要在该商家附近（500米内）停留至少 15 分钟后才能评价',
        'requires_visit', true
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- 5. 触发器：updated_at 自动更新
CREATE TRIGGER update_user_visits_updated_at
  BEFORE UPDATE ON public.user_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();