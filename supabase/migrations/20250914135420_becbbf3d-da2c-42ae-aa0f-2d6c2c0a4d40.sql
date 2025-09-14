-- Add route field to medications table for better medication management
ALTER TABLE public.medications 
ADD COLUMN IF NOT EXISTS route VARCHAR DEFAULT 'oral';

-- Update treatment plan status enum to include all requested statuses
ALTER TYPE treatment_plan_status ADD VALUE IF NOT EXISTS 'pending_confirmation';
ALTER TYPE treatment_plan_status ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE treatment_plan_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE treatment_plan_status ADD VALUE IF NOT EXISTS 'cancelled';

-- Add reminder_enabled field to medications for patient preference
ALTER TABLE public.medications 
ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT true;

-- Add appointment_id to treatment_plan_procedures for booking integration
ALTER TABLE public.treatment_plan_procedures
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.appointments(id);

-- Add consent_required field to treatment_plan_procedures
ALTER TABLE public.treatment_plan_procedures
ADD COLUMN IF NOT EXISTS consent_required BOOLEAN DEFAULT false;

-- Add consent_form_id to link procedures to consent forms
ALTER TABLE public.treatment_plan_procedures
ADD COLUMN IF NOT EXISTS consent_form_id UUID REFERENCES public.consent_forms(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_medication_reminders_patient_status 
ON medication_reminders(patient_id, status);

CREATE INDEX IF NOT EXISTS idx_treatment_plan_procedures_appointment 
ON treatment_plan_procedures(appointment_id);

-- Add digital signature fields to consent forms for medical-legal compliance
ALTER TABLE public.consent_forms
ADD COLUMN IF NOT EXISTS digital_signature TEXT;

-- Update the handle_new_user function to support medication reminders
CREATE OR REPLACE FUNCTION public.generate_medication_reminders()
RETURNS TRIGGER AS $$
DECLARE
    reminder_time TIMESTAMPTZ;
    current_date DATE;
    frequency_hours INTEGER;
BEGIN
    -- Parse frequency to get hours between doses
    frequency_hours := CASE 
        WHEN NEW.frequency ILIKE '%once%' OR NEW.frequency ILIKE '%1 time%' THEN 24
        WHEN NEW.frequency ILIKE '%twice%' OR NEW.frequency ILIKE '%2 time%' THEN 12
        WHEN NEW.frequency ILIKE '%three%' OR NEW.frequency ILIKE '%3 time%' THEN 8
        WHEN NEW.frequency ILIKE '%four%' OR NEW.frequency ILIKE '%4 time%' THEN 6
        ELSE 24 -- Default to once daily
    END;

    -- Generate reminders only if reminders are enabled
    IF NEW.reminder_enabled THEN
        current_date := NEW.start_date;
        
        -- Generate reminders for each day from start_date to end_date
        WHILE current_date <= COALESCE(NEW.end_date, NEW.start_date + INTERVAL '30 days') LOOP
            -- Generate reminders based on frequency
            FOR i IN 0..(24/frequency_hours - 1) LOOP
                reminder_time := current_date::TIMESTAMPTZ + (i * frequency_hours * INTERVAL '1 hour') + INTERVAL '9 hours'; -- Default start time 9 AM
                
                INSERT INTO medication_reminders (
                    medication_id,
                    patient_id,
                    reminder_time,
                    status
                ) VALUES (
                    NEW.id,
                    NEW.patient_id,
                    reminder_time,
                    'pending'
                );
            END LOOP;
            
            current_date := current_date + INTERVAL '1 day';
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;