DO $$
BEGIN
  -- Allow selecting doctor profiles (public fields) for verified doctors
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Anyone can view verified doctor profiles'
  ) THEN
    EXECUTE 'DROP POLICY "Anyone can view verified doctor profiles" ON public.profiles';
  END IF;

  EXECUTE $pol$
    CREATE POLICY "Anyone can view verified doctor profiles"
    ON public.profiles
    FOR SELECT
    USING (
      -- user can always view their own profile
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1
        FROM public.doctors d
        WHERE d.user_id = public.profiles.user_id
          AND coalesce(d.verified, false) = true
      )
      OR EXISTS (
        -- authenticated patients can also view doctor profiles for doctors they have appointments with
        SELECT 1
        FROM public.doctors d2
        JOIN public.appointments a
          ON a.doctor_id = d2.id
        WHERE d2.user_id = public.profiles.user_id
          AND a.patient_id = auth.uid()
      )
    )
  $pol$;
END $$;
