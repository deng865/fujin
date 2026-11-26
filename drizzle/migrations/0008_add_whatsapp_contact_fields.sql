ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS contact_whatsapp text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_id text;