CREATE OR REPLACE FUNCTION public.mobile_service_on_duty(hours jsonb) RETURNS boolean LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE local_now timestamp; day_idx integer; entry jsonb; open_min integer; close_min integer; now_min integer;
BEGIN
 IF hours IS NULL OR hours = 'null'::jsonb THEN RETURN true; END IF;
 IF COALESCE((hours->>'is24h')::boolean, false) THEN RETURN true; END IF;
 local_now := now() AT TIME ZONE COALESCE(hours->>'timezone','America/Chicago');
 now_min := extract(hour from local_now)::integer*60 + extract(minute from local_now)::integer;
 IF hours ? 'schedule' THEN
  day_idx := extract(isodow from local_now)::integer - 1;
  SELECT value INTO entry FROM jsonb_array_elements(hours->'schedule') WHERE (value->>'day')::integer=day_idx LIMIT 1;
  IF entry IS NULL OR COALESCE((entry->>'closed')::boolean,false) THEN RETURN false; END IF;
 ELSE entry := hours; END IF;
 IF entry->>'open' IS NULL OR entry->>'close' IS NULL THEN RETURN false; END IF;
 open_min := split_part(entry->>'open',':',1)::integer*60 + split_part(entry->>'open',':',2)::integer;
 close_min := split_part(entry->>'close',':',1)::integer*60 + split_part(entry->>'close',':',2)::integer;
 IF close_min <= open_min THEN RETURN now_min >= open_min OR now_min < close_min; END IF;
 RETURN now_min >= open_min AND now_min < close_min;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
REVOKE ALL ON FUNCTION public.mobile_service_on_duty(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mobile_service_on_duty(jsonb) TO anon, authenticated, service_role;
CREATE POLICY "Off duty mobile services stay private" ON public.posts AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (user_id = auth.uid() OR NOT is_mobile OR (is_visible AND public.mobile_service_on_duty(operating_hours)));
CREATE OR REPLACE FUNCTION public.guard_mobile_location_upload() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.is_mobile AND (NOT NEW.is_visible OR NOT public.mobile_service_on_duty(NEW.operating_hours)) THEN
  NEW.live_latitude := NULL; NEW.live_longitude := NULL; NEW.live_updated_at := NULL;
  IF TG_OP = 'UPDATE' THEN NEW.latitude := OLD.latitude; NEW.longitude := OLD.longitude; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_mobile_location_upload BEFORE INSERT OR UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.guard_mobile_location_upload();