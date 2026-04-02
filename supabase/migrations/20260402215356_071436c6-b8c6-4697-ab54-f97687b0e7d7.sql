
-- 1. Fix job_posts: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "用户可以查看可见的招聘信息" ON public.job_posts;
CREATE POLICY "用户可以查看可见的招聘信息"
ON public.job_posts
FOR SELECT
TO authenticated
USING ((is_visible = true) OR (user_id = auth.uid()));

-- 2. Fix housing_posts: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "用户可以查看可见的租房信息" ON public.housing_posts;
CREATE POLICY "用户可以查看可见的租房信息"
ON public.housing_posts
FOR SELECT
TO authenticated
USING ((is_visible = true) OR (user_id = auth.uid()));

-- 3. Fix rides: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "用户可以查看可见的行程" ON public.rides;
CREATE POLICY "用户可以查看可见的行程"
ON public.rides
FOR SELECT
TO authenticated
USING ((is_visible = true) OR (user_id = auth.uid()));

-- 4. Fix ratings: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "所有人可以查看评分" ON public.ratings;
CREATE POLICY "认证用户可以查看评分"
ON public.ratings
FOR SELECT
TO authenticated
USING (true);

-- 5. Fix community_comments: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "所有人可以查看评论" ON public.community_comments;
CREATE POLICY "认证用户可以查看评论"
ON public.community_comments
FOR SELECT
TO authenticated
USING (true);

-- 6. Fix function search_path: handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 7. Fix function search_path: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 8. Fix function search_path: update_user_rating_stats
CREATE OR REPLACE FUNCTION public.update_user_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET
    total_ratings = COALESCE(total_ratings, 0) + 1,
    rating_sum = COALESCE(rating_sum, 0) + NEW.rating,
    average_rating = (COALESCE(rating_sum, 0) + NEW.rating)::numeric / (COALESCE(total_ratings, 0) + 1)
  WHERE id = NEW.rated_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 9. Fix handle_new_user with validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _user_type public.user_type;
BEGIN
  BEGIN
    _user_type := COALESCE((NEW.raw_user_meta_data->>'user_type')::public.user_type, 'passenger');
  EXCEPTION WHEN OTHERS THEN
    _user_type := 'passenger';
  END;
  
  INSERT INTO public.profiles (id, user_type, name, wechat_id, phone)
  VALUES (
    NEW.id,
    _user_type,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'wechat_id',
    NEW.phone
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
