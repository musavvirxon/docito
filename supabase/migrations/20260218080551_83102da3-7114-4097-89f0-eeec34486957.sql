-- Add missing columns to notifications table that the send_notification_to_user RPC expects
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS level text DEFAULT 'info',
ADD COLUMN IF NOT EXISTS body text;

-- Recreate the send_notification_to_user function to use existing columns properly
CREATE OR REPLACE FUNCTION public.send_notification_to_user(
  p_recipient_user_id uuid,
  p_notification_type text DEFAULT 'general',
  p_title text DEFAULT '',
  p_message text DEFAULT '',
  p_data json DEFAULT '{}'::json
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    entity_type,
    level,
    title,
    message,
    body,
    created_at
  ) VALUES (
    p_recipient_user_id,
    p_notification_type,
    'info',
    p_title,
    p_message,
    p_message,
    now()
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;