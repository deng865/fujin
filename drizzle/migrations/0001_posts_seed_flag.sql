ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_seed boolean NOT NULL DEFAULT false;
DROP INDEX IF EXISTS public.idx_posts_one_active_per_user_category;
CREATE UNIQUE INDEX idx_posts_one_active_per_user_category ON public.posts (user_id, category) WHERE is_visible = true AND is_seed = false;