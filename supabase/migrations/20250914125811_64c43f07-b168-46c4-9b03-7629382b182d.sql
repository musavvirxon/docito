-- Create medications table for prescriptions
CREATE TABLE public.medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  treatment_plan_id UUID REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  name VARCHAR NOT NULL,
  dosage VARCHAR NOT NULL,
  frequency VARCHAR NOT NULL,
  instructions TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'completed', 'discontinued', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create treatment plan templates table
CREATE TABLE public.treatment_plan_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR DEFAULT 'general',
  is_public BOOLEAN DEFAULT false,
  template_data JSONB NOT NULL, -- Store procedures, medications, and other template info
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referrals table to track referred treatments
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  treatment_plan_id UUID REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  referring_doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  referred_doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medication reminders table 
CREATE TABLE public.medication_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id UUID REFERENCES public.medications(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'missed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies for medications
CREATE POLICY "Doctors can manage medications for their treatment plans" 
ON public.medications FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.treatment_plans tp 
    JOIN public.doctors d ON d.id = tp.doctor_id 
    WHERE tp.id = medications.treatment_plan_id 
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Patients can view their own medications" 
ON public.medications FOR SELECT 
USING (patient_id = auth.uid());

-- RLS policies for treatment plan templates
CREATE POLICY "Doctors can manage their own templates" 
ON public.treatment_plan_templates FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.doctors d 
    WHERE d.id = treatment_plan_templates.doctor_id 
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view public templates" 
ON public.treatment_plan_templates FOR SELECT 
USING (is_public = true);

-- RLS policies for referrals
CREATE POLICY "Doctors can view referrals they're involved in" 
ON public.referrals FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.doctors d 
    WHERE (d.id = referrals.referring_doctor_id OR d.id = referrals.referred_doctor_id)
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Doctors can create referrals" 
ON public.referrals FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.doctors d 
    WHERE d.id = referrals.referring_doctor_id 
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Referred doctors can update referral status" 
ON public.referrals FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.doctors d 
    WHERE d.id = referrals.referred_doctor_id 
    AND d.user_id = auth.uid()
  )
);

-- RLS policies for medication reminders
CREATE POLICY "Patients can view their own medication reminders" 
ON public.medication_reminders FOR SELECT 
USING (patient_id = auth.uid());

CREATE POLICY "System can manage medication reminders" 
ON public.medication_reminders FOR ALL 
USING (true); -- This will be restricted by application logic

-- Create triggers for updated_at
CREATE TRIGGER update_medications_updated_at
  BEFORE UPDATE ON public.medications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treatment_plan_templates_updated_at
  BEFORE UPDATE ON public.treatment_plan_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add estimated_duration to treatment_plans table
ALTER TABLE public.treatment_plans 
ADD COLUMN estimated_duration_weeks INTEGER,
ADD COLUMN estimated_completion_date DATE,
ADD COLUMN priority VARCHAR DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));