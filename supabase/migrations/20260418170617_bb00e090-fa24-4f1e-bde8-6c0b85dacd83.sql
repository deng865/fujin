-- 1. New helper function: check if sender can rate receiver (no post context)
CREATE OR REPLACE FUNCTION public.can_user_rate_target(_sender uuid, _receiver uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  IF _sender IS NULL OR _receiver IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', '参数无效');
  END IF;

  IF _sender = _receiver THEN
    RETURN jsonb_build_object('allowed', false, 'reason', '不能评价自己');
  END IF;

  SELECT COUNT(*) INTO recent_count
  FROM public.reviews
  WHERE sender_id = _sender
    AND receiver_id = _receiver
    AND post_id IS NULL
    AND created_at > now() - interval '24 hours';

  IF recent_count > 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', '24 小时内已评价过该用户');
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- 2. Trigger function: enforce 24h rate limit at DB level (handles NULL post_id properly)
CREATE OR REPLACE FUNCTION public.enforce_review_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dup_count integer;
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    -- Post-scoped review: same sender + same post within 24h is forbidden
    SELECT COUNT(*) INTO dup_count
    FROM public.reviews
    WHERE sender_id = NEW.sender_id
      AND post_id = NEW.post_id
      AND created_at > now() - interval '24 hours'
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF dup_count > 0 THEN
      RAISE EXCEPTION '24 小时内已评价过该商家'
        USING ERRCODE = '23505';
    END IF;
  ELSE
    -- Chat-scoped review (no post): same sender → same receiver within 24h is forbidden
    SELECT COUNT(*) INTO dup_count
    FROM public.reviews
    WHERE sender_id = NEW.sender_id
      AND receiver_id = NEW.receiver_id
      AND post_id IS NULL
      AND created_at > now() - interval '24 hours'
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF dup_count > 0 THEN
      RAISE EXCEPTION '24 小时内已评价过该用户'
        USING ERRCODE = '23505';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Attach trigger to reviews table
DROP TRIGGER IF EXISTS trg_enforce_review_rate_limit ON public.reviews;
CREATE TRIGGER trg_enforce_review_rate_limit
  BEFORE INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_review_rate_limit();

-- 4. Helpful indexes for fast 24h lookups
CREATE INDEX IF NOT EXISTS idx_reviews_sender_post_created
  ON public.reviews (sender_id, post_id, created_at DESC)
  WHERE post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_sender_receiver_created
  ON public.reviews (sender_id, receiver_id, created_at DESC)
  WHERE post_id IS NULL;