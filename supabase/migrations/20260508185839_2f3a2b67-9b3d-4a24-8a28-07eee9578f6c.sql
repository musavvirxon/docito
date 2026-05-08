
-- 1) entity_settings: restrict SELECT to admins/staff of the entity
DROP POLICY IF EXISTS "Authenticated users can read entity settings" ON public.entity_settings;

CREATE POLICY "Entity admins or staff can read settings"
ON public.entity_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.practices p
    WHERE p.id = entity_settings.entity_id AND p.admin_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.clinic_staff cs
    WHERE cs.practice_id = entity_settings.entity_id
      AND cs.user_id = auth.uid()
      AND cs.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.lab_centers lc
    WHERE lc.id = entity_settings.entity_id AND lc.admin_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.lab_staff ls
    WHERE ls.lab_center_id = entity_settings.entity_id
      AND ls.user_id = auth.uid()
      AND ls.status::text = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.imaging_centers ic
    WHERE ic.id = entity_settings.entity_id AND ic.admin_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.imaging_staff ist
    WHERE ist.imaging_center_id = entity_settings.entity_id
      AND ist.user_id = auth.uid()
      AND ist.status::text = 'active'
  )
);

-- 2) Drop overly broad invitation insert policies (proper scoped policies remain)
DROP POLICY IF EXISTS "Lab staff invitations insertable by lab staff" ON public.lab_staff_invitations;
DROP POLICY IF EXISTS "Imaging staff invitations insertable by center staff" ON public.imaging_staff_invitations;

-- 3) Storage: patient-files — restrict doctor access to their own patients
DROP POLICY IF EXISTS "Doctors can view patient files" ON storage.objects;
DROP POLICY IF EXISTS "Doctors can upload patient files" ON storage.objects;
DROP POLICY IF EXISTS "Doctors can delete patient files" ON storage.objects;

CREATE POLICY "Doctors can view their patients files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'patient-files'
  AND EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.doctors d ON d.id = a.doctor_id
    WHERE d.user_id = auth.uid()
      AND a.patient_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Doctors can upload files for their patients"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'patient-files'
  AND EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.doctors d ON d.id = a.doctor_id
    WHERE d.user_id = auth.uid()
      AND a.patient_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Doctors can delete files for their patients"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'patient-files'
  AND EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.doctors d ON d.id = a.doctor_id
    WHERE d.user_id = auth.uid()
      AND a.patient_id::text = (storage.foldername(name))[1]
  )
);

-- 4) Storage: lab-results — restrict doctor access to patients they ordered for or have appointments with
DROP POLICY IF EXISTS "Doctors can view patient results" ON storage.objects;

CREATE POLICY "Doctors can view their patients results"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lab-results'
  AND (
    EXISTS (
      SELECT 1
      FROM public.test_orders t
      JOIN public.doctors d ON d.id = t.doctor_id
      WHERE d.user_id = auth.uid()
        AND t.patient_id::text = (storage.foldername(name))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.appointments a
      JOIN public.doctors d ON d.id = a.doctor_id
      WHERE d.user_id = auth.uid()
        AND a.patient_id::text = (storage.foldername(name))[1]
    )
  )
);
