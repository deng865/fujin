
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看自己的收藏"
ON public.favorites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "用户可以添加收藏"
ON public.favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以取消收藏"
ON public.favorites FOR DELETE
USING (auth.uid() = user_id);
