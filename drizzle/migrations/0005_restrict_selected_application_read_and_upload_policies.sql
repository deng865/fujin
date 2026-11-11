ALTER POLICY "认证用户可以查看评论" ON public.community_comments TO authenticated USING (user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = community_comments.post_id AND (p.is_visible = true OR p.user_id = (SELECT auth.uid()))) OR public.has_role((SELECT auth.uid()), 'admin'));
ALTER POLICY "Authenticated users can view reviews" ON public.reviews TO authenticated USING (sender_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin') OR (status = 'approved' AND created_at <= now() - interval '24 hours'));
ALTER POLICY "Anyone can view visible categories" ON public.categories TO anon, authenticated USING (is_visible = true OR public.has_role((SELECT auth.uid()), 'admin'));
ALTER POLICY "认证用户可以查看评分" ON public.ratings TO authenticated USING (rater_id = (SELECT auth.uid()) OR rated_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'));
ALTER POLICY "Anyone can read settings" ON public.app_settings TO anon, authenticated USING (id = true);
ALTER POLICY "Authenticated users can view post media" ON storage.objects TO authenticated USING (bucket_id = 'post-media' AND owner_id = (SELECT auth.uid()::text));
ALTER POLICY "Authenticated users can upload post media" ON storage.objects TO authenticated WITH CHECK (bucket_id = 'post-media' AND owner_id = (SELECT auth.uid()::text) AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));
CREATE FUNCTION public.get_public_profile_cards() RETURNS TABLE (id uuid, name text, avatar_url text, user_type public.user_type, verified boolean, average_rating numeric, total_rides integer, created_at timestamptz, total_ratings integer, credit_score integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.id, p.name, p.avatar_url, p.user_type, p.verified, p.average_rating, p.total_rides, p.created_at, p.total_ratings, p.credit_score FROM public.profiles p WHERE (SELECT auth.uid()) IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.get_public_profile_cards() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profile_cards() TO authenticated;
CREATE OR REPLACE VIEW public.public_profiles WITH (security_invoker = true) AS SELECT id, name, avatar_url, user_type, verified, average_rating::numeric(3,2) AS average_rating, total_rides, created_at, total_ratings, credit_score FROM public.get_public_profile_cards();
REVOKE ALL ON public.public_profiles FROM PUBLIC, anon;
GRANT SELECT ON public.public_profiles TO authenticated, service_role;
DROP POLICY "Authenticated users can view profiles via public_profiles" ON public.profiles;