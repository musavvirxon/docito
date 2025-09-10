-- Create medical records table
CREATE TABLE public.medical_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  doctor_id UUID,
  title TEXT NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('diagnosis', 'condition', 'examination', 'note', 'treatment')),
  description TEXT,
  record_date DATE NOT NULL,
  file_uploads TEXT[], -- Array of file URLs
  added_by TEXT NOT NULL CHECK (added_by IN ('patient', 'doctor')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  doctor_name TEXT,
  doctor_phone TEXT,
  doctor_email TEXT,
  practice_name TEXT,
  license_number TEXT,
  verification_log JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

-- Create policies for medical records
CREATE POLICY "Patients can view their own medical records" 
ON public.medical_records 
FOR SELECT 
USING (auth.uid() = patient_id);

CREATE POLICY "Patients can create their own medical records" 
ON public.medical_records 
FOR INSERT 
WITH CHECK (auth.uid() = patient_id AND added_by = 'patient');

CREATE POLICY "Patients can update their own unverified records" 
ON public.medical_records 
FOR UPDATE 
USING (auth.uid() = patient_id AND status = 'pending' AND added_by = 'patient');

CREATE POLICY "Doctors can view records they added" 
ON public.medical_records 
FOR SELECT 
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can add medical records during appointments" 
ON public.medical_records 
FOR INSERT 
WITH CHECK (auth.uid() = doctor_id AND added_by = 'doctor');

CREATE POLICY "Doctors can update their own records" 
ON public.medical_records 
FOR UPDATE 
USING (auth.uid() = doctor_id AND added_by = 'doctor');

-- Create doctors table for verification
CREATE TABLE public.doctors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  practice_name TEXT,
  license_number TEXT,
  is_verified BOOLEAN DEFAULT false,
  specialties TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for doctors table
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Create policies for doctors
CREATE POLICY "Doctors can view their own profile" 
ON public.doctors 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view verified doctors" 
ON public.doctors 
FOR SELECT 
USING (is_verified = true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_medical_records_updated_at
    BEFORE UPDATE ON public.medical_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at
    BEFORE UPDATE ON public.doctors
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();