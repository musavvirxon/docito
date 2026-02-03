-- Fix patient_all_appointments view to include appointment_type column
DROP VIEW IF EXISTS patient_all_appointments;

CREATE VIEW patient_all_appointments WITH (security_invoker = on) AS
SELECT DISTINCT 
    a.id,
    a.patient_id,
    a.doctor_id,
    a.practice_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.appointment_type,
    a.status,
    a.notes,
    a.created_at
FROM appointments a
JOIN profiles p ON a.patient_id = p.user_id
WHERE p.user_id = auth.uid() 
   OR (EXISTS (
        SELECT 1
        FROM profiles logged_in_user
        WHERE logged_in_user.user_id = auth.uid() 
          AND logged_in_user.role = 'patient'::user_role 
          AND (
              (logged_in_user.email IS NOT NULL AND p.email::text = logged_in_user.email::text)
              OR (logged_in_user.phone IS NOT NULL AND p.phone::text = logged_in_user.phone::text)
          )
   ));

-- Add storage policies for patient file uploads
CREATE POLICY "Patients can upload their own files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id IN ('patient-files', 'attachments') 
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Patients can view their own files"
ON storage.objects FOR SELECT
USING (
    bucket_id IN ('patient-files', 'attachments') 
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Patients can delete their own files"
ON storage.objects FOR DELETE
USING (
    bucket_id IN ('patient-files', 'attachments') 
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
);