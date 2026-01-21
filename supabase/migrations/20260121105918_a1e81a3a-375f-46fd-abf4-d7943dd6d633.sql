
-- Re-add the FK constraint as DEFERRABLE INITIALLY DEFERRED
-- This allows the profile to be created first, then the doctor row, 
-- and the constraint is checked at commit time (after both exist)
ALTER TABLE public.doctors 
ADD CONSTRAINT fk_doctors_user_id 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE 
DEFERRABLE INITIALLY DEFERRED;
