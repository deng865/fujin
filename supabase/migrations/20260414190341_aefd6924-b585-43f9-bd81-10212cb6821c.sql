
-- 1. Add new columns to reviews table
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

-- 2. Create index on target_type for filtered queries
CREATE INDEX IF NOT EXISTS idx_reviews_target_type ON public.reviews (target_type);

-- 3. Create review_prompts table
CREATE TABLE public.review_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  prompted_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Enable RLS on review_prompts
ALTER TABLE public.review_prompts ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for review_prompts
CREATE POLICY "Conversation participants can view prompts"
  ON public.review_prompts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = review_prompts.conversation_id
    AND (auth.uid() = c.participant_1 OR auth.uid() = c.participant_2)
  ));

CREATE POLICY "Conversation participants can create prompts"
  ON public.review_prompts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = review_prompts.conversation_id
    AND (auth.uid() = c.participant_1 OR auth.uid() = c.participant_2)
  ));

CREATE POLICY "Conversation participants can update prompts"
  ON public.review_prompts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = review_prompts.conversation_id
    AND (auth.uid() = c.participant_1 OR auth.uid() = c.participant_2)
  ));

-- 6. Prevent duplicate prompts per conversation
CREATE UNIQUE INDEX idx_review_prompts_conversation_pending
  ON public.review_prompts (conversation_id)
  WHERE status = 'pending';
