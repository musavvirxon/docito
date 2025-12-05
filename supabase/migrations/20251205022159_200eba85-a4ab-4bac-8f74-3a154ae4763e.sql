-- Create doctor_patients table for patients added directly by doctors
CREATE TABLE public.doctor_patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  
  -- Personal Information
  full_name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20),
  profile_photo_url TEXT,
  
  -- Contact Information
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  
  -- Medical Information
  allergies TEXT,
  medical_history TEXT,
  dental_history TEXT,
  current_medications TEXT,
  
  -- Administrative Information
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  registration_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.doctor_patients ENABLE ROW LEVEL SECURITY;

-- Doctors can manage their own patients
CREATE POLICY "Doctors can manage their own patients"
ON public.doctor_patients
FOR ALL
USING (
  doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
)
WITH CHECK (
  doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
);

-- Super admins can view all doctor patients
CREATE POLICY "Super admins can view all doctor patients"
ON public.doctor_patients
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create updated_at trigger
CREATE TRIGGER update_doctor_patients_updated_at
BEFORE UPDATE ON public.doctor_patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_doctor_patients_doctor_id ON public.doctor_patients(doctor_id);
CREATE INDEX idx_doctor_patients_status ON public.doctor_patients(status);

-- Storage policy for patient photos (using existing avatars bucket)
CREATE POLICY "Doctors can upload patient photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'patients'
);

CREATE POLICY "Doctors can view patient photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'patients'
);

CREATE POLICY "Doctors can delete patient photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'patients'
);