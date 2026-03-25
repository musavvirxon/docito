-- 1. Allow public read of profiles for verified doctors (needed for doctor_profiles_view / doctor_public_profile_view)
CREATE POLICY "Public can view verified doctor profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.user_id = profiles.user_id
      AND d.verified = true
  )
);

-- 2. Allow public read of schedule_settings (needed for availability display)
CREATE POLICY "Public can view doctor schedule settings"
ON public.schedule_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- 3. Allow public read of blocked_times (needed for availability calculation)
CREATE POLICY "Public can view doctor blocked times"
ON public.blocked_times
FOR SELECT
TO anon, authenticated
USING (true);
