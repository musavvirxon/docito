-- Fix security issues: Set search_path for functions that don't have it

-- Update any functions that might be missing search_path to public
-- This addresses the "Function Search Path Mutable" security warning

-- Check and update the trigger function
CREATE OR REPLACE FUNCTION public.generate_medication_reminders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    reminder_time TIMESTAMPTZ;
    med_date DATE;
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
        med_date := NEW.start_date;
        
        -- Generate reminders for each day from start_date to end_date
        WHILE med_date <= COALESCE(NEW.end_date, NEW.start_date + INTERVAL '30 days') LOOP
            -- Generate reminders based on frequency
            FOR i IN 0..(24/frequency_hours - 1) LOOP
                reminder_time := med_date::TIMESTAMPTZ + (i * frequency_hours * INTERVAL '1 hour') + INTERVAL '9 hours'; -- Default start time 9 AM
                
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
            
            med_date := med_date + INTERVAL '1 day';
        END LOOP;
    END IF;

    RETURN NEW;
END;
$function$;

-- Update the updated_at trigger function  
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;