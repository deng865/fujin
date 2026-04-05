ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_model text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_color text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS license_plate text;