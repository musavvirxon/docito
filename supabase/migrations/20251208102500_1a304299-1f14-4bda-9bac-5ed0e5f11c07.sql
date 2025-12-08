-- Fix function search_path security warnings

-- Fix update_dental_updated_at function
CREATE OR REPLACE FUNCTION public.update_dental_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix update_tooth_status_after_procedure function
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