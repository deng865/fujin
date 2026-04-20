
-- Fix SECURITY DEFINER view warning by recreating with security_invoker
DROP VIEW IF EXISTS public.posts_public;

CREATE VIEW public.posts_public
WITH (security_invoker = true)
AS
SELECT
  id, user_id, title, description, category, price,
  latitude, longitude, image_urls, is_visible, created_at, updated_at,
  is_mobile, mobile_location_precise,
  live_latitude, live_longitude, live_updated_at,
  operating_hours
FROM public.posts
WHERE is_visible = true;

GRANT SELECT ON public.posts_public TO anon, authenticated;

-- Add a policy so anon role can read visible posts via the view (without contact info)
-- The view uses security_invoker, so the underlying RLS on posts must allow anon SELECT for visible rows.
-- We expose only safe fields via the view; anon callers querying posts directly still get nothing because
-- only the authenticated SELECT policy exists. So we add an anon SELECT policy scoped to the view's needs.
CREATE POLICY "Anon can view visible posts (no contact)"
ON public.posts
FOR SELECT
TO anon
USING (is_visible = true);

-- Note: anon can technically still query posts.* directly. To truly hide contact_phone/contact_wechat from anon,
-- we revoke column-level SELECT on those columns from anon.
REVOKE SELECT ON public.posts FROM anon;
GRANT SELECT (
  id, user_id, title, description, category, price,
  latitude, longitude, image_urls, is_visible, created_at, updated_at,
  is_mobile, mobile_location_precise,
  live_latitude, live_longitude, live_updated_at,
  operating_hours, device_id
) ON public.posts TO anon;
