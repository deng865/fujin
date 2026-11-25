ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS apple_transaction_id text,
  ADD COLUMN IF NOT EXISTS apple_original_transaction_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_apple_transaction
ON public.payments(apple_transaction_id)
WHERE apple_transaction_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fulfill_payment(_payment_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.payments;
  c public.user_credits;
  snap jsonb;
  days integer;
  base_time timestamptz;
BEGIN
  SELECT * INTO p FROM public.payments
    WHERE id = _payment_id AND user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF p.payment_status = 'completed' THEN RETURN false; END IF;
  IF p.payment_status <> 'pending' THEN RAISE EXCEPTION 'Payment is not pending'; END IF;

  snap := COALESCE(p.metadata->'snapshot', '{}'::jsonb);
  days := COALESCE(NULLIF(snap->>'duration_days', '')::integer, p.duration_days, 30);
  UPDATE public.payments SET payment_status = 'completed', updated_at = now() WHERE id = p.id;

  IF COALESCE((snap->>'is_boost')::boolean, false) THEN
    IF p.post_id IS NOT NULL THEN
      UPDATE public.posts SET is_boosted = true,
        boost_expires_at = now() + make_interval(days => days), bumped_at = now()
      WHERE id = p.post_id AND user_id = _user_id;
    END IF;
    RETURN true;
  END IF;

  INSERT INTO public.user_credits(user_id, post_credits) VALUES (_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO c FROM public.user_credits WHERE user_id = _user_id FOR UPDATE;

  IF COALESCE((snap->>'unlimited_posts')::boolean, false) THEN
    base_time := CASE WHEN c.unlimited_until > now() THEN c.unlimited_until ELSE now() END;
    UPDATE public.user_credits
      SET unlimited_until = base_time + make_interval(days => days), updated_at = now()
      WHERE user_id = _user_id
      RETURNING unlimited_until INTO p.expires_at;
    UPDATE public.payments SET expires_at = p.expires_at WHERE id = p.id;
  ELSE
    UPDATE public.user_credits
      SET post_credits = c.post_credits + COALESCE(NULLIF(snap->>'post_credits', '')::integer, 0), updated_at = now()
      WHERE user_id = _user_id;
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_payment(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_payment(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.delete_account_data(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.review_prompts WHERE conversation_id IN
    (SELECT id FROM public.conversations WHERE participant_1 = _user_id OR participant_2 = _user_id);
  DELETE FROM public.call_sessions WHERE caller_id = _user_id OR receiver_id = _user_id OR conversation_id IN
    (SELECT id FROM public.conversations WHERE participant_1 = _user_id OR participant_2 = _user_id);
  DELETE FROM public.messages WHERE sender_id = _user_id OR conversation_id IN
    (SELECT id FROM public.conversations WHERE participant_1 = _user_id OR participant_2 = _user_id);
  DELETE FROM public.conversations WHERE participant_1 = _user_id OR participant_2 = _user_id;
  DELETE FROM public.chats WHERE sender_id = _user_id OR receiver_id = _user_id;
  DELETE FROM public.favorites WHERE user_id = _user_id;
  DELETE FROM public.user_blocks WHERE blocker_id = _user_id OR blocked_id = _user_id;
  DELETE FROM public.reviews WHERE sender_id = _user_id OR receiver_id = _user_id;
  DELETE FROM public.ratings WHERE rater_id = _user_id OR rated_id = _user_id;
  DELETE FROM public.reports WHERE reporter_id = _user_id OR post_id IN (SELECT id FROM public.posts WHERE user_id = _user_id);
  DELETE FROM public.user_visits WHERE user_id = _user_id;
  DELETE FROM public.community_comments WHERE user_id = _user_id OR post_id IN (SELECT id FROM public.community_posts WHERE user_id = _user_id);
  DELETE FROM public.community_posts WHERE user_id = _user_id;
  DELETE FROM public.matches WHERE user_id = _user_id OR ride_id IN (SELECT id FROM public.rides WHERE user_id = _user_id);
  DELETE FROM public.rides WHERE user_id = _user_id;
  DELETE FROM public.housing_posts WHERE user_id = _user_id;
  DELETE FROM public.job_posts WHERE user_id = _user_id;
  DELETE FROM public.posts WHERE user_id = _user_id;
  DELETE FROM public.payments WHERE user_id = _user_id;
  DELETE FROM public.user_credits WHERE user_id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  DELETE FROM public.profiles WHERE id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_account_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_account_data(uuid) TO service_role;