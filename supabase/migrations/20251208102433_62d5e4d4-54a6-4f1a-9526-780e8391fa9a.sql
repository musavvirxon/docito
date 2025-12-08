-- Dental Chart Full Implementation

-- 1. Create tooth type enum
CREATE TYPE tooth_type AS ENUM ('permanent', 'primary');

-- 2. Create tooth status enum
CREATE TYPE tooth_status AS ENUM (
  'healthy', 'caries', 'filled', 'missing', 'crown', 
  'implant', 'watch', 'extracted', 'root_canal', 'sealant'
);

-- 3. Create dental procedure status enum
CREATE TYPE dental_procedure_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');

-- 4. Create dental_procedures table (predefined procedures)
CREATE TABLE public.dental_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  category VARCHAR(100) NOT NULL,
  description TEXT,
  default_cost NUMERIC(10,2),
  is_pediatric BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create tooth_records table (per patient tooth status)
CREATE TABLE public.tooth_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  tooth_number INTEGER NOT NULL CHECK (tooth_number BETWEEN 11 AND 85),
  tooth_type tooth_type NOT NULL DEFAULT 'permanent',
  status tooth_status NOT NULL DEFAULT 'healthy',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(patient_id, tooth_number)
);

-- 6. Create tooth_procedure_history table (procedures performed on teeth)
CREATE TABLE public.tooth_procedure_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tooth_record_id UUID REFERENCES public.tooth_records(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  procedure_id UUID REFERENCES public.dental_procedures(id) ON DELETE SET NULL,
  procedure_name VARCHAR(255) NOT NULL,
  tooth_numbers INTEGER[] NOT NULL,
  status dental_procedure_status NOT NULL DEFAULT 'planned',
  cost NUMERIC(10,2),
  notes TEXT,
  performed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Create tooth_files table (link files to teeth - X-rays, photos)
CREATE TABLE public.tooth_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tooth_record_id UUID REFERENCES public.tooth_records(id) ON DELETE CASCADE,
  patient_file_id UUID REFERENCES public.patient_files(id) ON DELETE CASCADE,
  tooth_numbers INTEGER[] NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Enable RLS on all tables
ALTER TABLE public.dental_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tooth_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tooth_procedure_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tooth_files ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for dental_procedures (public read, admin write)
CREATE POLICY "Anyone can view active dental procedures"
ON public.dental_procedures FOR SELECT
USING (is_active = true);

CREATE POLICY "Super admins can manage dental procedures"
ON public.dental_procedures FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- 10. RLS Policies for tooth_records
CREATE POLICY "Dentists can manage tooth records for their patients"
ON public.tooth_records FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM doctors d
    WHERE d.id = tooth_records.doctor_id
    AND d.user_id = auth.uid()
    AND d.verified = true
    AND (
      d.specialty ILIKE '%dentist%' OR 
      d.specialty ILIKE '%dental%' OR
      d.specialty ILIKE '%orthodont%' OR
      d.specialty ILIKE '%periodon%' OR
      d.specialty ILIKE '%endodont%' OR
      d.specialty ILIKE '%prosthodont%'
    )
  )
);

CREATE POLICY "Patients can view their own tooth records"
ON public.tooth_records FOR SELECT
USING (patient_id = auth.uid());

-- 11. RLS Policies for tooth_procedure_history
CREATE POLICY "Dentists can manage tooth procedure history"
ON public.tooth_procedure_history FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM doctors d
    WHERE d.id = tooth_procedure_history.doctor_id
    AND d.user_id = auth.uid()
    AND d.verified = true
  )
);

CREATE POLICY "Patients can view their tooth procedure history"
ON public.tooth_procedure_history FOR SELECT
USING (patient_id = auth.uid());

-- 12. RLS Policies for tooth_files
CREATE POLICY "Dentists can manage tooth files"
ON public.tooth_files FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM tooth_records tr
    JOIN doctors d ON d.id = tr.doctor_id
    WHERE tr.id = tooth_files.tooth_record_id
    AND d.user_id = auth.uid()
    AND d.verified = true
  )
);

CREATE POLICY "Patients can view their tooth files"
ON public.tooth_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tooth_records tr
    WHERE tr.id = tooth_files.tooth_record_id
    AND tr.patient_id = auth.uid()
  )
);

-- 13. Insert default dental procedures
INSERT INTO public.dental_procedures (name, code, category, description, default_cost, is_pediatric) VALUES
('Dental Examination', 'D0120', 'diagnostic', 'Periodic oral evaluation', 50.00, false),
('X-Ray - Periapical', 'D0220', 'diagnostic', 'Intraoral periapical radiograph', 25.00, false),
('X-Ray - Panoramic', 'D0330', 'diagnostic', 'Panoramic radiograph', 100.00, false),
('Prophylaxis - Adult', 'D1110', 'preventive', 'Adult teeth cleaning', 80.00, false),
('Prophylaxis - Child', 'D1120', 'preventive', 'Child teeth cleaning', 60.00, true),
('Fluoride Varnish', 'D1206', 'preventive', 'Topical fluoride varnish', 30.00, true),
('Sealant - Per Tooth', 'D1351', 'preventive', 'Dental sealant per tooth', 40.00, true),
('Amalgam Filling - 1 Surface', 'D2140', 'restorative', 'Amalgam one surface', 120.00, false),
('Composite Filling - 1 Surface', 'D2330', 'restorative', 'Resin-based composite one surface anterior', 150.00, false),
('Composite Filling - 2 Surfaces', 'D2331', 'restorative', 'Resin-based composite two surfaces anterior', 180.00, false),
('Crown - Porcelain/Ceramic', 'D2740', 'restorative', 'Crown porcelain/ceramic substrate', 900.00, false),
('Crown - Full Cast Metal', 'D2790', 'restorative', 'Crown full cast high noble metal', 800.00, false),
('Pulpotomy', 'D3220', 'endodontic', 'Therapeutic pulpotomy', 200.00, true),
('Root Canal - Anterior', 'D3310', 'endodontic', 'Root canal therapy anterior tooth', 600.00, false),
('Root Canal - Premolar', 'D3320', 'endodontic', 'Root canal therapy premolar', 750.00, false),
('Root Canal - Molar', 'D3330', 'endodontic', 'Root canal therapy molar', 950.00, false),
('Scaling & Root Planing - Per Quadrant', 'D4341', 'periodontic', 'Periodontal scaling and root planing per quadrant', 250.00, false),
('Extraction - Simple', 'D7140', 'surgical', 'Extraction erupted tooth', 150.00, false),
('Extraction - Surgical', 'D7210', 'surgical', 'Extraction erupted tooth requiring removal of bone', 300.00, false),
('Space Maintainer - Fixed Unilateral', 'D1510', 'pediatric', 'Space maintainer fixed unilateral', 250.00, true),
('Space Maintainer - Fixed Bilateral', 'D1515', 'pediatric', 'Space maintainer fixed bilateral', 350.00, true),
('Dental Implant', 'D6010', 'surgical', 'Surgical placement of implant body', 2000.00, false),
('Veneer - Direct', 'D2960', 'cosmetic', 'Labial veneer direct resin', 400.00, false),
('Veneer - Indirect', 'D2962', 'cosmetic', 'Labial veneer porcelain', 1000.00, false),
('Teeth Whitening', 'D9972', 'cosmetic', 'External bleaching per arch', 300.00, false);

-- 14. Create function to check if user is verified dentist
CREATE OR REPLACE FUNCTION public.is_verified_dentist(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM doctors d
    WHERE d.user_id = p_user_id
    AND d.verified = true
    AND (
      d.specialty ILIKE '%dentist%' OR 
      d.specialty ILIKE '%dental%' OR
      d.specialty ILIKE '%orthodont%' OR
      d.specialty ILIKE '%periodon%' OR
      d.specialty ILIKE '%endodont%' OR
      d.specialty ILIKE '%prosthodont%'
    )
  )
$$;

-- 15. Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_dental_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_tooth_records_updated_at
BEFORE UPDATE ON public.tooth_records
FOR EACH ROW EXECUTE FUNCTION public.update_dental_updated_at();

CREATE TRIGGER update_tooth_procedure_history_updated_at
BEFORE UPDATE ON public.tooth_procedure_history
FOR EACH ROW EXECUTE FUNCTION public.update_dental_updated_at();

CREATE TRIGGER update_dental_procedures_updated_at
BEFORE UPDATE ON public.dental_procedures
FOR EACH ROW EXECUTE FUNCTION public.update_dental_updated_at();

-- 16. Create function to update tooth status after procedure
CREATE OR REPLACE FUNCTION public.update_tooth_status_after_procedure()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tooth_num INTEGER;
  new_status tooth_status;
BEGIN
  -- Only update when procedure is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Determine new status based on procedure
    new_status := CASE 
      WHEN NEW.procedure_name ILIKE '%extraction%' THEN 'extracted'::tooth_status
      WHEN NEW.procedure_name ILIKE '%root canal%' THEN 'root_canal'::tooth_status
      WHEN NEW.procedure_name ILIKE '%crown%' THEN 'crown'::tooth_status
      WHEN NEW.procedure_name ILIKE '%implant%' THEN 'implant'::tooth_status
      WHEN NEW.procedure_name ILIKE '%filling%' OR NEW.procedure_name ILIKE '%composite%' OR NEW.procedure_name ILIKE '%amalgam%' THEN 'filled'::tooth_status
      WHEN NEW.procedure_name ILIKE '%sealant%' THEN 'sealant'::tooth_status
      ELSE NULL
    END;
    
    -- Update tooth records if status should change
    IF new_status IS NOT NULL THEN
      FOREACH tooth_num IN ARRAY NEW.tooth_numbers LOOP
        UPDATE tooth_records
        SET status = new_status, updated_at = now()
        WHERE patient_id = NEW.patient_id AND tooth_number = tooth_num;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_tooth_status
AFTER INSERT OR UPDATE ON public.tooth_procedure_history
FOR EACH ROW EXECUTE FUNCTION public.update_tooth_status_after_procedure();