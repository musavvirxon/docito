-- Insurance Providers Table
CREATE TABLE public.insurance_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_name TEXT NOT NULL,
  country TEXT NOT NULL,
  logo_url TEXT,
  is_global BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insurance Plans Table
CREATE TABLE public.insurance_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.insurance_providers(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  description TEXT,
  coverage_type TEXT NOT NULL DEFAULT 'full', -- medical, dental, full
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Clinic Insurance (which insurance clinics accept)
CREATE TABLE public.clinic_insurance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.insurance_providers(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.insurance_plans(id) ON DELETE CASCADE,
  is_accepted BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, provider_id, plan_id)
);

-- Doctor Insurance (doctors inherit from clinic but can customize)
CREATE TABLE public.doctor_insurance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.practices(id) ON DELETE SET NULL,
  provider_id UUID NOT NULL REFERENCES public.insurance_providers(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.insurance_plans(id) ON DELETE CASCADE,
  is_accepted BOOLEAN DEFAULT true,
  is_inherited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, provider_id, plan_id)
);

-- Patient Insurance
CREATE TABLE public.patient_insurance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES public.insurance_providers(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.insurance_plans(id) ON DELETE SET NULL,
  member_id TEXT,
  valid_until DATE,
  file_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_insurance_providers_country ON public.insurance_providers(country);
CREATE INDEX idx_insurance_plans_provider ON public.insurance_plans(provider_id);
CREATE INDEX idx_clinic_insurance_clinic ON public.clinic_insurance(clinic_id);
CREATE INDEX idx_clinic_insurance_provider ON public.clinic_insurance(provider_id);
CREATE INDEX idx_doctor_insurance_doctor ON public.doctor_insurance(doctor_id);
CREATE INDEX idx_doctor_insurance_provider ON public.doctor_insurance(provider_id);
CREATE INDEX idx_patient_insurance_patient ON public.patient_insurance(patient_id);
CREATE INDEX idx_patient_insurance_provider ON public.patient_insurance(provider_id);

-- Enable RLS
ALTER TABLE public.insurance_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_insurance ENABLE ROW LEVEL SECURITY;

-- Insurance Providers Policies
CREATE POLICY "Anyone can view global insurance providers"
ON public.insurance_providers FOR SELECT
USING (is_global = true);

CREATE POLICY "Super admins can manage insurance providers"
ON public.insurance_providers FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Insurance Plans Policies
CREATE POLICY "Anyone can view insurance plans"
ON public.insurance_plans FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage insurance plans"
ON public.insurance_plans FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Clinic Insurance Policies
CREATE POLICY "Anyone can view clinic insurance"
ON public.clinic_insurance FOR SELECT
USING (true);

CREATE POLICY "Clinic admins can manage their clinic insurance"
ON public.clinic_insurance FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM practices p
    WHERE p.id = clinic_insurance.clinic_id
    AND p.admin_id = auth.uid()
  )
);

CREATE POLICY "Super admins can manage all clinic insurance"
ON public.clinic_insurance FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Doctor Insurance Policies
CREATE POLICY "Anyone can view doctor insurance"
ON public.doctor_insurance FOR SELECT
USING (true);

CREATE POLICY "Doctors can manage their own insurance"
ON public.doctor_insurance FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM doctors d
    WHERE d.id = doctor_insurance.doctor_id
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can manage all doctor insurance"
ON public.doctor_insurance FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Patient Insurance Policies
CREATE POLICY "Patients can view their own insurance"
ON public.patient_insurance FOR SELECT
USING (patient_id = auth.uid());

CREATE POLICY "Patients can manage their own insurance"
ON public.patient_insurance FOR ALL
USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view patient insurance for their appointments"
ON public.patient_insurance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    WHERE a.patient_id = patient_insurance.patient_id
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can view all patient insurance"
ON public.patient_insurance FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_insurance_providers_updated_at
BEFORE UPDATE ON public.insurance_providers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_insurance_plans_updated_at
BEFORE UPDATE ON public.insurance_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clinic_insurance_updated_at
BEFORE UPDATE ON public.clinic_insurance
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctor_insurance_updated_at
BEFORE UPDATE ON public.doctor_insurance
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patient_insurance_updated_at
BEFORE UPDATE ON public.patient_insurance
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to inherit clinic insurance to doctors
CREATE OR REPLACE FUNCTION public.inherit_clinic_insurance_to_doctor(p_doctor_id UUID, p_clinic_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert inherited insurance from clinic to doctor
  INSERT INTO doctor_insurance (doctor_id, clinic_id, provider_id, plan_id, is_accepted, is_inherited)
  SELECT 
    p_doctor_id,
    p_clinic_id,
    ci.provider_id,
    ci.plan_id,
    ci.is_accepted,
    true
  FROM clinic_insurance ci
  WHERE ci.clinic_id = p_clinic_id
  AND ci.is_accepted = true
  ON CONFLICT (doctor_id, provider_id, plan_id) DO NOTHING;
END;
$$;

-- Function to get doctors by insurance
CREATE OR REPLACE FUNCTION public.get_doctors_by_insurance(p_provider_id UUID, p_plan_id UUID DEFAULT NULL)
RETURNS TABLE(doctor_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT di.doctor_id
  FROM doctor_insurance di
  WHERE di.provider_id = p_provider_id
  AND (p_plan_id IS NULL OR di.plan_id = p_plan_id)
  AND di.is_accepted = true;
END;
$$;