
-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update any profile (block/unblock)
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update any post (moderation)
CREATE POLICY "Admins can update any post"
ON public.posts FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete any post (moderation)
CREATE POLICY "Admins can delete any post"
ON public.posts FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
