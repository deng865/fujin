
-- Remove the overly permissive policy that exposes phone/wechat to all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view public profile info" ON public.profiles;
