REVOKE EXECUTE ON FUNCTION public.get_practice_appointments(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_practice_appointments(uuid, integer) TO authenticated;