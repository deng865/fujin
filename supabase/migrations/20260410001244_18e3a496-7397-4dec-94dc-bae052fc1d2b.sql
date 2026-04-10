
-- Create trigger function to check duplicate contact info per category
CREATE OR REPLACE FUNCTION public.check_duplicate_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Check duplicate phone
  IF NEW.contact_phone IS NOT NULL AND NEW.contact_phone != '' THEN
    IF EXISTS (
      SELECT 1 FROM public.posts
      WHERE contact_phone = NEW.contact_phone
        AND category = NEW.category
        AND is_visible = true
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'CONTACT_DUPLICATE: 该手机号在此分类下已有活跃信息';
    END IF;
  END IF;

  -- Check duplicate wechat
  IF NEW.contact_wechat IS NOT NULL AND NEW.contact_wechat != '' THEN
    IF EXISTS (
      SELECT 1 FROM public.posts
      WHERE contact_wechat = NEW.contact_wechat
        AND category = NEW.category
        AND is_visible = true
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'CONTACT_DUPLICATE: 该微信号在此分类下已有活跃信息';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on INSERT only (edit uses UPDATE, not affected)
CREATE TRIGGER check_contact_duplicate_before_insert
  BEFORE INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_duplicate_contact();
