
ALTER TABLE public.tooth_procedure_history
  ALTER COLUMN patient_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS doctor_patient_id uuid REFERENCES public.doctor_patients(id) ON DELETE SET NULL;

ALTER TABLE public.tooth_procedure_history
  DROP CONSTRAINT IF EXISTS tooth_procedure_history_patient_ref_chk;
ALTER TABLE public.tooth_procedure_history
  ADD CONSTRAINT tooth_procedure_history_patient_ref_chk
  CHECK (patient_id IS NOT NULL OR doctor_patient_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_tooth_proc_hist_doctor_patient ON public.tooth_procedure_history(doctor_patient_id);
