CREATE OR REPLACE FUNCTION recalculate_user_rating()
RETURNS TRIGGER AS $$
DECLARE
  _receiver_id UUID;
  _sum INTEGER;
  _count INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _receiver_id := OLD.receiver_id;
  ELSE
    _receiver_id := NEW.receiver_id;
  END IF;

  SELECT COALESCE(SUM(rating), 0), COUNT(*)
  INTO _sum, _count
  FROM public.reviews
  WHERE receiver_id = _receiver_id;

  UPDATE public.profiles
  SET rating_sum = _sum,
      total_ratings = _count,
      updated_at = now()
  WHERE id = _receiver_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;