-- File: supabase/migrations/20260126094500_allow_authenticated_view_doctors_and_profiles.sql
DO $$
BEGIN
  -- Doctors table: allow authenticated users to read verified doctors, doctors tied to their appointments, or their own doctor row
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'doctors'
      AND policyname = 'Authenticated users can view doctors for appointments'
  ) THEN
    EXECUTE 'DROP POLICY "Authenticated users can view doctors for appointments" ON public.doctors';
  END IF;

  EXECUTE $pol$
    CREATE POLICY "Authenticated users can view doctors for appointments"
    ON public.doctors
    FOR SELECT
    TO authenticated
    USING (
      coalesce(verified, false) = true
      OR user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.appointments a
        WHERE a.doctor_id = public.doctors.id
          AND a.patient_id = auth.uid()
      )
    )
  $pol$;

  -- Profiles table: allow authenticated users to read profiles that belong to doctors (needed for doctor->profiles join)
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Authenticated users can view doctor profiles'
  ) THEN
    EXECUTE 'DROP POLICY "Authenticated users can view doctor profiles" ON public.profiles';
  END IF;

  EXECUTE $pol$
    CREATE POLICY "Authenticated users can view doctor profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1
        FROM public.doctors d
        WHERE d.user_id = public.profiles.user_id
          AND (
            coalesce(d.verified, false) = true
            OR d.user_id = auth.uid()
            OR EXISTS (
              SELECT 1
              FROM public.appointments a
              WHERE a.doctor_id = d.id
                AND a.patient_id = auth.uid()
            )
          )
      )
    )
  $pol$;
END $$;
