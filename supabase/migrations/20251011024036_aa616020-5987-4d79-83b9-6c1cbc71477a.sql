-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'system',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  related_id UUID,
  related_type VARCHAR(50)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid());

-- System can create notifications
CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Function to create appointment notification
CREATE OR REPLACE FUNCTION public.create_appointment_notification()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_appointment_notification ON public.appointments;
CREATE TRIGGER trigger_appointment_notification
AFTER INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.create_appointment_notification();