-- Create practice_settings table
CREATE TABLE IF NOT EXISTS public.practice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL UNIQUE REFERENCES public.practices(id) ON DELETE CASCADE,
  
  -- General Settings
  tagline TEXT,
  timezone VARCHAR DEFAULT 'America/New_York',
  
  -- Booking Settings
  default_duration_minutes INTEGER DEFAULT 30,
  max_appointments_per_day INTEGER DEFAULT 20,
  cancellation_notice_hours INTEGER DEFAULT 24,
  buffer_time_minutes INTEGER DEFAULT 15,
  
  -- Payment Settings
  payments_enabled BOOLEAN DEFAULT false,
  currency VARCHAR DEFAULT 'USD',
  stripe_connected BOOLEAN DEFAULT false,
  paypal_connected BOOLEAN DEFAULT false,
  
  -- Notification Settings
  email_booking_confirm BOOLEAN DEFAULT true,
  sms_booking_confirm BOOLEAN DEFAULT false,
  email_reminders BOOLEAN DEFAULT true,
  sms_reminders BOOLEAN DEFAULT true,
  reminder_hours_before INTEGER DEFAULT 24,
  
  -- Branding
  primary_color VARCHAR DEFAULT '#0ea5e9',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.practice_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Practice admins can view their settings"
ON public.practice_settings
FOR SELECT
USING (
  practice_id IN (
    SELECT id FROM practices WHERE admin_id = auth.uid()
  )
);

CREATE POLICY "Practice admins can update their settings"
ON public.practice_settings
FOR UPDATE
USING (
  practice_id IN (
    SELECT id FROM practices WHERE admin_id = auth.uid()
  )
);

CREATE POLICY "Practice admins can insert their settings"
ON public.practice_settings
FOR INSERT
WITH CHECK (
  practice_id IN (
    SELECT id FROM practices WHERE admin_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_practice_settings_updated_at
BEFORE UPDATE ON public.practice_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create staff_roles table for permissions
CREATE TABLE IF NOT EXISTS public.staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  role_name VARCHAR NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(practice_id, role_name)
);

-- Enable RLS
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Practice admins can manage their staff roles"
ON public.staff_roles
FOR ALL
USING (
  practice_id IN (
    SELECT id FROM practices WHERE admin_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_staff_roles_updated_at
BEFORE UPDATE ON public.staff_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default staff roles for existing practices
INSERT INTO public.staff_roles (practice_id, role_name, permissions)
SELECT 
  id,
  role_name,
  permissions::jsonb
FROM practices,
LATERAL (
  VALUES 
    ('Admin', '["booking", "patients", "billing", "staff", "reports", "settings"]'),
    ('Doctor', '["booking", "patients", "reports"]'),
    ('Nurse', '["booking", "patients"]'),
    ('Receptionist', '["booking"]')
) AS roles(role_name, permissions)
ON CONFLICT (practice_id, role_name) DO NOTHING;