-- Relax stale referrals_status_check to accept the full lifecycle the app uses
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_status_check;
ALTER TABLE public.referrals
  ADD CONSTRAINT referrals_status_check
  CHECK (status::text = ANY (ARRAY[
    'draft','pending','sent','accepted','rejected','declined',
    'slots_available','booked','in_progress','completed','cancelled','expired'
  ]));

-- Allow doctor-made patients (doctor_patient_id set) to satisfy the patient-required checks
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_patient_required_chk;
ALTER TABLE public.referrals
  ADD CONSTRAINT referrals_patient_required_chk
  CHECK (
    patient_id IS NOT NULL
    OR patient_name IS NOT NULL
    OR doctor_patient_id IS NOT NULL
    OR facility_patient_id IS NOT NULL
  );

ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_walkin_phone_required_chk;
ALTER TABLE public.referrals
  ADD CONSTRAINT referrals_walkin_phone_required_chk
  CHECK (
    patient_id IS NOT NULL
    OR doctor_patient_id IS NOT NULL
    OR facility_patient_id IS NOT NULL
    OR (patient_phone IS NOT NULL AND length(btrim(patient_phone)) >= 7)
  );