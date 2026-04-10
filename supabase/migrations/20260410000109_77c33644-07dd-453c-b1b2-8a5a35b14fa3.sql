
-- Add device_id column to posts table
ALTER TABLE public.posts ADD COLUMN device_id text;

-- Create trigger function to check duplicate device_id per category
CREATE OR REPLACE FUNCTION public.check_duplicate_device_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.device_id IS NOT NULL AND NEW.device_id != '' THEN
    IF EXISTS (
      SELECT 1 FROM public.posts
      WHERE device_id = NEW.device_id
        AND category = NEW.category
        AND is_visible = true
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'DEVICE_DUPLICATE: 该设备在此分类下已有活跃信息';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on INSERT only (edit mode uses UPDATE)
CREATE TRIGGER check_device_duplicate_before_insert
  BEFORE INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_duplicate_device_post();
