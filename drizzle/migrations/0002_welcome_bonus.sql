CREATE TABLE public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  welcome_bonus_enabled boolean NOT NULL DEFAULT true,
  welcome_bonus_credits integer NOT NULL DEFAULT 2,
  welcome_bonus_days integer NOT NULL DEFAULT 30,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admins update settings" ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS bonus_used integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.get_welcome_bonus(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s public.app_settings; reg timestamptz; used int; exp timestamptz; remaining int;
BEGIN
  SELECT * INTO s FROM public.app_settings LIMIT 1;
  SELECT created_at INTO reg FROM public.profiles WHERE id = _user_id;
  SELECT COALESCE(bonus_used,0) INTO used FROM public.user_credits WHERE user_id = _user_id;
  used := COALESCE(used,0);
  IF s IS NULL OR NOT s.welcome_bonus_enabled OR reg IS NULL THEN
    RETURN jsonb_build_object('enabled', false, 'remaining', 0, 'expires_at', null);
  END IF;
  exp := reg + make_interval(days => s.welcome_bonus_days);
  remaining := CASE WHEN now() < exp THEN GREATEST(s.welcome_bonus_credits - used, 0) ELSE 0 END;
  RETURN jsonb_build_object('enabled', true, 'remaining', remaining, 'expires_at', exp,
    'expired', now() >= exp, 'total', s.welcome_bonus_credits);
END; $$;
GRANT EXECUTE ON FUNCTION public.get_welcome_bonus(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.consume_post_credit(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE rec public.user_credits; bonus jsonb;
BEGIN
  IF auth.uid() IS DISTINCT FROM _user_id THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'forbidden');
  END IF;
  INSERT INTO public.user_credits (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO rec FROM public.user_credits WHERE user_id = _user_id FOR UPDATE;
  IF rec.unlimited_until IS NOT NULL AND rec.unlimited_until > now() THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'unlimited');
  END IF;
  bonus := public.get_welcome_bonus(_user_id);
  IF (bonus->>'remaining')::int > 0 THEN
    UPDATE public.user_credits SET bonus_used = bonus_used + 1 WHERE user_id = _user_id;
    RETURN jsonb_build_object('allowed', true, 'reason', 'bonus_used');
  END IF;
  IF rec.post_credits > 0 THEN
    UPDATE public.user_credits SET post_credits = post_credits - 1 WHERE user_id = _user_id;
    RETURN jsonb_build_object('allowed', true, 'reason', 'credit_used');
  END IF;
  RETURN jsonb_build_object('allowed', false, 'reason', 'no_credits');
END; $$;