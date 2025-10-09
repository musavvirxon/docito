-- Add missing settings columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "emailBookings": true,
  "emailReminders": true,
  "emailCancellations": true,
  "smsBookings": false,
  "smsReminders": true,
  "smsCancellations": true,
  "pushNotifications": true
}'::jsonb,
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
  "profileVisibility": true,
  "shareAnalytics": true,
  "marketingCommunications": false
}'::jsonb,
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';

-- Create account_activity table for login history
CREATE TABLE IF NOT EXISTS public.account_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'password_change', 'settings_update'
  ip_address INET,
  user_agent TEXT,
  device_info TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create account_requests table for deactivation/export requests
CREATE TABLE IF NOT EXISTS public.account_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL, -- 'deactivation', 'data_export'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'cancelled'
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notes TEXT
);

-- Enable RLS
ALTER TABLE account_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for account_activity
CREATE POLICY "Users can view their own activity"
ON account_activity FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System can insert activity logs"
ON account_activity FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- RLS Policies for account_requests
CREATE POLICY "Users can view their own requests"
ON account_requests FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own requests"
ON account_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Function to log account activity
CREATE OR REPLACE FUNCTION log_account_activity(
  p_activity_type VARCHAR,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_info TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO account_activity (user_id, activity_type, ip_address, user_agent, device_info)
  VALUES (auth.uid(), p_activity_type, p_ip_address, p_user_agent, p_device_info);
  
  RETURN json_build_object('success', true);
END;
$$;

-- Function to request account action
CREATE OR REPLACE FUNCTION request_account_action(
  p_request_type VARCHAR,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id UUID;
BEGIN
  INSERT INTO account_requests (user_id, request_type, notes)
  VALUES (auth.uid(), p_request_type, p_notes)
  RETURNING id INTO v_request_id;
  
  RETURN json_build_object('success', true, 'request_id', v_request_id);
END;
$$;