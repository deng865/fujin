CREATE POLICY "Authenticated users can view profiles via public_profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);