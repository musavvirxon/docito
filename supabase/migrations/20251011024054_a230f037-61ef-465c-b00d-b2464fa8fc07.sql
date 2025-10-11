-- Fix search_path for create_appointment_notification function
DROP FUNCTION IF EXISTS public.create_appointment_notification() CASCADE;

CREATE OR REPLACE FUNCTION public.create_appointment_notification()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify patient
  INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type)
  VALUES (
    NEW.patient_id,
    'Appointment Booked',
    'Your appointment has been confirmed for ' || TO_CHAR(NEW.appointment_date, 'Mon DD, YYYY') || ' at ' || TO_CHAR(NEW.start_time, 'HH:MI AM'),
    'appointment',
    NEW.id,
    'appointment'
  );
  
  -- Notify doctor
  INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type)
  SELECT 
    d.user_id,
    'New Appointment',
    'You have a new appointment scheduled for ' || TO_CHAR(NEW.appointment_date, 'Mon DD, YYYY') || ' at ' || TO_CHAR(NEW.start_time, 'HH:MI AM'),
    'appointment',
    NEW.id,
    'appointment'
  FROM doctors d
  WHERE d.id = NEW.doctor_id;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_appointment_notification ON public.appointments;
CREATE TRIGGER trigger_appointment_notification
AFTER INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.create_appointment_notification();