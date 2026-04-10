
-- Add mobile/fixed merchant fields to posts
ALTER TABLE public.posts ADD COLUMN is_mobile boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN operating_hours jsonb DEFAULT NULL;
ALTER TABLE public.posts ADD COLUMN live_latitude double precision DEFAULT NULL;
ALTER TABLE public.posts ADD COLUMN live_longitude double precision DEFAULT NULL;
ALTER TABLE public.posts ADD COLUMN live_updated_at timestamptz DEFAULT NULL;

-- Enable realtime for posts table (mobile merchant live location sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
