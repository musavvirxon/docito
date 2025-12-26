-- Step 1: Create the helper function first
CREATE OR REPLACE FUNCTION public.can_send_message(conv_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conv_id AND is_locked = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;