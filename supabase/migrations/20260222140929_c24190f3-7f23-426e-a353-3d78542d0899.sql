
-- Create appointment_diagnoses table for adding diagnoses to appointments
CREATE TABLE public.appointment_diagnoses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id),
  patient_id UUID REFERENCES public.profiles(user_id),
  doctor_patient_id UUID REFERENCES public.doctor_patients(id),
  diagnosis_template_id UUID,
  diagnosis_title TEXT NOT NULL,
  icd10_code TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointment_diagnoses ENABLE ROW LEVEL SECURITY;

-- Doctor who created it can manage
CREATE POLICY "Doctors can manage their appointment diagnoses"
ON public.appointment_diagnoses
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.doctors d WHERE d.id = appointment_diagnoses.doctor_id AND d.user_id = auth.uid()
  )
);

-- Patient can view their own diagnoses
CREATE POLICY "Patients can view their own diagnoses"
ON public.appointment_diagnoses
FOR SELECT
USING (patient_id = auth.uid());

-- Index for fast lookups
CREATE INDEX idx_appointment_diagnoses_appointment_id ON public.appointment_diagnoses(appointment_id);
CREATE INDEX idx_appointment_diagnoses_doctor_id ON public.appointment_diagnoses(doctor_id);
