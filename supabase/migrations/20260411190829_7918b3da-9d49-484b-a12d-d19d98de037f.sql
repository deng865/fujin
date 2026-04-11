CREATE UNIQUE INDEX idx_posts_one_active_per_user_category
ON public.posts (user_id, category)
WHERE is_visible = true;