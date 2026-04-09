
-- Create reviews table for two-way rating system
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  tags TEXT[] DEFAULT '{}',
  dispute_status TEXT NOT NULL DEFAULT 'none' CHECK (dispute_status IN ('none', 'disputed', 'resolved')),
  dispute_reason TEXT,
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Each user can only review the other once per post
  UNIQUE(sender_id, receiver_id, post_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view reviews"
ON public.reviews FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can create reviews as sender"
ON public.reviews FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id AND auth.uid() != receiver_id);

CREATE POLICY "Receiver can dispute a review"
ON public.reviews FOR UPDATE TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

CREATE POLICY "Admins can update any review"
ON public.reviews FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reviews"
ON public.reviews FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_reviews_receiver ON public.reviews(receiver_id);
CREATE INDEX idx_reviews_sender ON public.reviews(sender_id);
CREATE INDEX idx_reviews_post ON public.reviews(post_id);

-- Function to recalculate average rating for a user
CREATE OR REPLACE FUNCTION public.recalculate_user_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _receiver_id UUID;
  _sum INTEGER;
  _count INTEGER;
BEGIN
  -- Determine which receiver to update
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
      average_rating = CASE WHEN _count > 0 THEN ROUND(_sum::numeric / _count, 2) ELSE NULL END,
      updated_at = now()
  WHERE id = _receiver_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to auto-update ratings
CREATE TRIGGER trg_recalculate_rating
AFTER INSERT OR UPDATE OF rating OR DELETE
ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_user_rating();

-- Timestamp trigger
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for reviews
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
