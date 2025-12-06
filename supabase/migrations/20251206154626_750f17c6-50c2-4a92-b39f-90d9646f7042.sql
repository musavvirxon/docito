-- Create patient_files table for storing uploaded documents
CREATE TABLE public.patient_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  doctor_id UUID REFERENCES public.doctors(id),
  name VARCHAR NOT NULL,
  file_path TEXT NOT NULL,
  file_type VARCHAR NOT NULL,
  file_size INTEGER,
  category VARCHAR DEFAULT 'other',
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create patient_notes table for doctor internal notes
CREATE TABLE public.patient_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  doctor_id UUID REFERENCES public.doctors(id),
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  author_name VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for patient_files
CREATE POLICY "Doctors can manage files for their patients"
ON public.patient_files
FOR ALL
USING (
  doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
)
WITH CHECK (
  doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
);

CREATE POLICY "Patients can view their own files"
ON public.patient_files
FOR SELECT
USING (patient_id = auth.uid());

-- RLS policies for patient_notes
CREATE POLICY "Doctors can manage notes for their patients"
ON public.patient_notes
FOR ALL
USING (
  doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
)
WITH CHECK (
  doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
);

-- Super admins can view all
CREATE POLICY "Super admins can view all patient files"
ON public.patient_files
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can view all patient notes"
ON public.patient_notes
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_patient_files_patient_id ON public.patient_files(patient_id);
CREATE INDEX idx_patient_files_doctor_id ON public.patient_files(doctor_id);
CREATE INDEX idx_patient_notes_patient_id ON public.patient_notes(patient_id);
CREATE INDEX idx_patient_notes_doctor_id ON public.patient_notes(doctor_id);

-- Create storage bucket for patient files
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-files', 'patient-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for patient files bucket
CREATE POLICY "Doctors can upload patient files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'patient-files' AND
  auth.uid() IN (SELECT user_id FROM doctors)
);

CREATE POLICY "Doctors can view patient files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'patient-files' AND
  auth.uid() IN (SELECT user_id FROM doctors)
);

CREATE POLICY "Doctors can delete patient files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'patient-files' AND
  auth.uid() IN (SELECT user_id FROM doctors)
);