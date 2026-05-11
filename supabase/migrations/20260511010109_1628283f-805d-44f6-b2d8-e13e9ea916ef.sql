
-- 1. Fix test_orders broken doctor INSERT/UPDATE policies
DROP POLICY IF EXISTS "Doctors can create test orders" ON public.test_orders;
DROP POLICY IF EXISTS "Doctors can update their test orders" ON public.test_orders;
DROP POLICY IF EXISTS "Doctors can view their test orders" ON public.test_orders;

CREATE POLICY "Doctors can create test orders"
ON public.test_orders
FOR INSERT
TO authenticated
WITH CHECK (doctor_id = (SELECT id FROM public.doctors WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Doctors can update their test orders"
ON public.test_orders
FOR UPDATE
TO authenticated
USING (doctor_id = (SELECT id FROM public.doctors WHERE user_id = auth.uid() LIMIT 1))
WITH CHECK (doctor_id = (SELECT id FROM public.doctors WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Doctors can view their test orders"
ON public.test_orders
FOR SELECT
TO authenticated
USING (doctor_id = (SELECT id FROM public.doctors WHERE user_id = auth.uid() LIMIT 1));

-- 2. Restrict audit_logs INSERT to service_role only
DROP POLICY IF EXISTS "Audit logs insertable by authenticated users" ON public.audit_logs;

CREATE POLICY "Audit logs insertable by service role only"
ON public.audit_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- 3. Drop misconfigured ALL storage policy on verification-documents
DROP POLICY IF EXISTS "Practice admins can manage their verification documents" ON storage.objects;
