
ALTER TABLE public.video_consultations
  ALTER COLUMN patient_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS doctor_patient_id uuid REFERENCES public.doctor_patients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guest_token text UNIQUE;

ALTER TABLE public.video_consultations
  DROP CONSTRAINT IF EXISTS video_consultations_patient_xor;
ALTER TABLE public.video_consultations
  ADD CONSTRAINT video_consultations_patient_xor
  CHECK ((patient_id IS NOT NULL)::int + (doctor_patient_id IS NOT NULL)::int = 1);

ALTER TABLE public.doctor_patients
  ADD COLUMN IF NOT EXISTS merged_into_user_id uuid;

CREATE TABLE IF NOT EXISTS public.patient_merge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_patient_id uuid NOT NULL,
  claimed_by_user_id uuid NOT NULL,
  guest_token text,
  claimed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.patient_merge_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see their own merge audit" ON public.patient_merge_log;
CREATE POLICY "Users see their own merge audit"
  ON public.patient_merge_log FOR SELECT
  USING (auth.uid() = claimed_by_user_id);

CREATE OR REPLACE FUNCTION public.get_consultation_by_guest_token(_token text)
RETURNS TABLE (
  consultation_id uuid,
  appointment_id uuid,
  doctor_id uuid,
  doctor_patient_id uuid,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  doctor_name text,
  patient_full_name text,
  patient_phone text,
  patient_email text,
  already_claimed boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    vc.id,
    vc.appointment_id,
    vc.doctor_id,
    vc.doctor_patient_id,
    vc.scheduled_start,
    vc.scheduled_end,
    COALESCE(p.full_name, 'Doctor'),
    dp.full_name,
    dp.phone,
    dp.email,
    (dp.merged_into_user_id IS NOT NULL)
  FROM public.video_consultations vc
  LEFT JOIN public.doctors d ON d.id = vc.doctor_id
  LEFT JOIN public.profiles p ON p.user_id = d.user_id
  LEFT JOIN public.doctor_patients dp ON dp.id = vc.doctor_patient_id
  WHERE vc.guest_token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_consultation_by_guest_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_doctor_patient(_guest_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_dp_id uuid;
  v_already uuid;
  v_consult uuid;
  v_appointment uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT vc.id, vc.appointment_id, vc.doctor_patient_id, dp.merged_into_user_id
    INTO v_consult, v_appointment, v_dp_id, v_already
    FROM public.video_consultations vc
    LEFT JOIN public.doctor_patients dp ON dp.id = vc.doctor_patient_id
   WHERE vc.guest_token = _guest_token
   LIMIT 1;

  IF v_consult IS NULL OR v_dp_id IS NULL THEN
    RAISE EXCEPTION 'Invalid guest token';
  END IF;

  IF v_already IS NOT NULL THEN
    IF v_already = v_user THEN
      RETURN jsonb_build_object('ok', true, 'already', true, 'consultation_id', v_consult);
    ELSE
      RAISE EXCEPTION 'This patient record has already been claimed by another user';
    END IF;
  END IF;

  UPDATE public.appointments        SET patient_id = v_user, doctor_patient_id = NULL WHERE doctor_patient_id = v_dp_id;
  UPDATE public.appointment_sessions SET patient_id = v_user, doctor_patient_id = NULL WHERE doctor_patient_id = v_dp_id;
  UPDATE public.video_consultations  SET patient_id = v_user, doctor_patient_id = NULL WHERE doctor_patient_id = v_dp_id;
  UPDATE public.treatment_plans      SET patient_id = v_user, doctor_patient_id = NULL WHERE doctor_patient_id = v_dp_id;
  UPDATE public.referrals            SET patient_id = v_user, doctor_patient_id = NULL WHERE doctor_patient_id = v_dp_id;
  UPDATE public.appointment_diagnoses SET patient_id = v_user, doctor_patient_id = NULL WHERE doctor_patient_id = v_dp_id;
  UPDATE public.appointment_clinical_items SET patient_id = v_user, doctor_patient_id = NULL WHERE doctor_patient_id = v_dp_id;

  UPDATE public.doctor_patients
     SET merged_into_user_id = v_user, status = 'merged'
   WHERE id = v_dp_id;

  INSERT INTO public.patient_merge_log(doctor_patient_id, claimed_by_user_id, guest_token)
  VALUES (v_dp_id, v_user, _guest_token);

  RETURN jsonb_build_object(
    'ok', true,
    'consultation_id', v_consult,
    'appointment_id', v_appointment,
    'doctor_patient_id', v_dp_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_doctor_patient(text) TO authenticated;
