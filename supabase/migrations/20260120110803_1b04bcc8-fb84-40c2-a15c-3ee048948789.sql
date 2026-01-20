-- Create RPC to get unread notifications count for the current user
CREATE OR REPLACE FUNCTION public.get_my_unread_notifications_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COALESCE(COUNT(*)::integer, 0)
  FROM public.notifications
  WHERE user_id = auth.uid()
    AND is_read = false;
$$;