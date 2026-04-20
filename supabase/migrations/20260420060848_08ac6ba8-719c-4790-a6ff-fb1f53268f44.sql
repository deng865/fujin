
-- 1. Fix public phone/wechat exposure on posts table
-- Drop the overly permissive policy that allows anyone (including anon) to read all visible posts including contact info
DROP POLICY IF EXISTS "Anyone can view visible posts" ON public.posts;

-- Create a public-safe view that excludes contact info for anon/public consumption
CREATE OR REPLACE VIEW public.posts_public AS
SELECT
  id, user_id, title, description, category, price,
  latitude, longitude, image_urls, is_visible, created_at, updated_at,
  is_mobile, mobile_location_precise,
  live_latitude, live_longitude, live_updated_at,
  operating_hours
FROM public.posts
WHERE is_visible = true;

GRANT SELECT ON public.posts_public TO anon, authenticated;

-- Authenticated users may view full visible posts (including contact info)
CREATE POLICY "Authenticated users can view visible posts"
ON public.posts
FOR SELECT
TO authenticated
USING (is_visible = true OR user_id = auth.uid());

-- Owners (even anon-side) cannot see other posts; their own posts are covered by the authenticated policy.

-- 2. Restrict storage listing on post-media bucket (still allow direct file access by public URL)
DROP POLICY IF EXISTS "Anyone can view post media" ON storage.objects;

-- Allow listing/select only for authenticated users; public file URLs still work because public buckets serve files via CDN regardless of RLS
CREATE POLICY "Authenticated users can view post media"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'post-media');

-- 3. Add UPDATE policy for post-media so users can only modify files they own
CREATE POLICY "Users can update own post media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'post-media' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'post-media' AND (auth.uid())::text = (storage.foldername(name))[1]);
