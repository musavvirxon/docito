-- Enhance procedures table with new fields
ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER DEFAULT 30;
ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);
ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS default_time_interval INTEGER; -- days
ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS informed_consent_template TEXT;
ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS what_to_expect TEXT;
ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS default_notes_template TEXT;

-- Create procedure_materials table
CREATE TABLE IF NOT EXISTS public.procedure_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_id UUID REFERENCES public.procedures(id) ON DELETE CASCADE,
  material_name VARCHAR NOT NULL,
  quantity INTEGER DEFAULT 1,
  is_required BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create procedure_files table for document/image uploads
CREATE TABLE IF NOT EXISTS public.procedure_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_id UUID REFERENCES public.procedures(id) ON DELETE CASCADE,
  file_name VARCHAR NOT NULL,
  file_path VARCHAR NOT NULL,
  file_type VARCHAR NOT NULL,
  file_size INTEGER,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointment_procedures table for procedures added during appointments
CREATE TABLE IF NOT EXISTS public.appointment_procedures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  procedure_id UUID REFERENCES public.procedures(id) ON DELETE CASCADE,
  prescribed_by UUID REFERENCES auth.users(id),
  prescribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  patient_consent_status VARCHAR DEFAULT 'pending' CHECK (patient_consent_status IN ('pending', 'accepted', 'declined')),
  consent_signed_at TIMESTAMP WITH TIME ZONE,
  consent_ip_address INET,
  procedure_notes TEXT,
  estimated_cost NUMERIC(10,2),
  status VARCHAR DEFAULT 'prescribed' CHECK (status IN ('prescribed', 'scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create real_time_notifications table
CREATE TABLE IF NOT EXISTS public.real_time_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES auth.users(id),
  notification_type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.procedure_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_time_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for procedure_materials
CREATE POLICY "Doctors can manage materials for their procedures" ON public.procedure_materials
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.procedures p 
    JOIN public.doctors d ON d.id = p.dentist_id 
    WHERE p.id = procedure_materials.procedure_id AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view procedure materials" ON public.procedure_materials
FOR SELECT USING (true);

-- Create RLS policies for procedure_files
CREATE POLICY "Doctors can manage files for their procedures" ON public.procedure_files
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.procedures p 
    JOIN public.doctors d ON d.id = p.dentist_id 
    WHERE p.id = procedure_files.procedure_id AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view procedure files" ON public.procedure_files
FOR SELECT USING (true);

-- Create RLS policies for appointment_procedures
CREATE POLICY "Doctors can manage appointment procedures" ON public.appointment_procedures
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.doctors d ON d.id = a.doctor_id
    WHERE a.id = appointment_procedures.appointment_id AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Patients can view their appointment procedures" ON public.appointment_procedures
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_procedures.appointment_id AND a.patient_id = auth.uid()
  )
);

CREATE POLICY "Patients can update consent status" ON public.appointment_procedures
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_procedures.appointment_id AND a.patient_id = auth.uid()
  )
);

-- Create RLS policies for real_time_notifications
CREATE POLICY "Users can view their own notifications" ON public.real_time_notifications
FOR SELECT USING (recipient_user_id = auth.uid());

CREATE POLICY "Authenticated users can send notifications" ON public.real_time_notifications
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own notifications" ON public.real_time_notifications
FOR UPDATE USING (recipient_user_id = auth.uid());

-- Add triggers for updated_at columns
CREATE TRIGGER update_procedure_materials_updated_at
  BEFORE UPDATE ON public.procedure_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointment_procedures_updated_at
  BEFORE UPDATE ON public.appointment_procedures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();