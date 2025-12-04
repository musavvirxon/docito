-- Drop the overly permissive policy that allows anyone to view all practices
DROP POLICY IF EXISTS "Anyone can view practices" ON public.practices;

-- Create new policy that only shows verified practices to public
CREATE POLICY "Anyone can view verified practices only" 
ON public.practices 
FOR SELECT 
TO public
USING (verified = true);

-- Super admins can view all practices (verified and unverified)
DROP POLICY IF EXISTS "Super admins can view all practices" ON public.practices;
CREATE POLICY "Super admins can view all practices" 
ON public.practices 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));