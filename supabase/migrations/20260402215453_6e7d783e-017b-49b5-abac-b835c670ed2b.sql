
-- Add policy for authenticated users to see profiles (needed for public_profiles view)
CREATE POLICY "Authenticated users can view public profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Recreate view with security_invoker
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS SELECT 
  id,
  name,
  avatar_url,
  user_type,
  verified,
  average_rating,
  total_rides,
  created_at
FROM public.profiles;
