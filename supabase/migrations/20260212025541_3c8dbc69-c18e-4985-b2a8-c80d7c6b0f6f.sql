-- Drop the legacy trigger that always adds patient role to everyone
-- This conflicts with handle_new_user which correctly assigns only the signup role
DROP TRIGGER IF EXISTS on_auth_user_created_roles ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_roles();