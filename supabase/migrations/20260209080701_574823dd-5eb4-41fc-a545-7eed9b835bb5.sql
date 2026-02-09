-- ============================================================
-- Security Hardening: Fix RLS on unprotected tables
-- ============================================================

-- 1. Enable RLS on treatment_plan_procedure_visits
ALTER TABLE public.treatment_plan_procedure_visits ENABLE ROW LEVEL SECURITY;

-- Create policies for treatment_plan_procedure_visits
-- Doctors can view visits for their treatment plans
CREATE POLICY "Doctors can view their treatment plan visits"
ON public.treatment_plan_procedure_visits
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.treatment_plans tp
    JOIN public.treatment_plan_procedures tpp ON tpp.treatment_plan_id = tp.id
    WHERE tpp.id = treatment_plan_procedure_visits.treatment_plan_procedure_id
    AND tp.doctor_id = auth.uid()
  )
);

-- Doctors can insert visits for their treatment plans
CREATE POLICY "Doctors can insert their treatment plan visits"
ON public.treatment_plan_procedure_visits
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.treatment_plans tp
    JOIN public.treatment_plan_procedures tpp ON tpp.treatment_plan_id = tp.id
    WHERE tpp.id = treatment_plan_procedure_visits.treatment_plan_procedure_id
    AND tp.doctor_id = auth.uid()
  )
);

-- Doctors can update visits for their treatment plans
CREATE POLICY "Doctors can update their treatment plan visits"
ON public.treatment_plan_procedure_visits
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.treatment_plans tp
    JOIN public.treatment_plan_procedures tpp ON tpp.treatment_plan_id = tp.id
    WHERE tpp.id = treatment_plan_procedure_visits.treatment_plan_procedure_id
    AND tp.doctor_id = auth.uid()
  )
);

-- Doctors can delete visits for their treatment plans
CREATE POLICY "Doctors can delete their treatment plan visits"
ON public.treatment_plan_procedure_visits
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.treatment_plans tp
    JOIN public.treatment_plan_procedures tpp ON tpp.treatment_plan_id = tp.id
    WHERE tpp.id = treatment_plan_procedure_visits.treatment_plan_procedure_id
    AND tp.doctor_id = auth.uid()
  )
);

-- 2. Fix test_orders: replace permissive TEMP policy with proper RLS
DROP POLICY IF EXISTS "TEMP test_orders all access" ON public.test_orders;

-- Patients can view their own test orders
CREATE POLICY "Patients can view own test orders"
ON public.test_orders
FOR SELECT
USING (patient_id = auth.uid());

-- Doctors can view test orders they created
CREATE POLICY "Doctors can view their test orders"
ON public.test_orders
FOR SELECT
USING (doctor_id = auth.uid());

-- Lab staff can view test orders assigned to their lab
CREATE POLICY "Lab staff can view assigned test orders"
ON public.test_orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lab_staff ls
    WHERE ls.lab_center_id = test_orders.lab_center_id
    AND ls.user_id = auth.uid()
    AND ls.status = 'active'
  )
);

-- Doctors can create test orders
CREATE POLICY "Doctors can create test orders"
ON public.test_orders
FOR INSERT
WITH CHECK (doctor_id = auth.uid());

-- Doctors can update their test orders
CREATE POLICY "Doctors can update their test orders"
ON public.test_orders
FOR UPDATE
USING (doctor_id = auth.uid());

-- Lab staff can update test orders assigned to their lab
CREATE POLICY "Lab staff can update assigned test orders"
ON public.test_orders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.lab_staff ls
    WHERE ls.lab_center_id = test_orders.lab_center_id
    AND ls.user_id = auth.uid()
    AND ls.status = 'active'
  )
);

-- 3. Fix test_order_items: replace permissive TEMP policy with proper RLS
DROP POLICY IF EXISTS "TEMP test_order_items all access" ON public.test_order_items;

-- Users who can view the parent test order can view items
CREATE POLICY "View test order items via parent order"
ON public.test_order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.test_orders o
    WHERE o.id = test_order_items.test_order_id
    AND (
      o.patient_id = auth.uid()
      OR o.doctor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.lab_staff ls
        WHERE ls.lab_center_id = o.lab_center_id
        AND ls.user_id = auth.uid()
        AND ls.status = 'active'
      )
    )
  )
);

-- Doctors can insert items into their test orders
CREATE POLICY "Doctors can insert test order items"
ON public.test_order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.test_orders o
    WHERE o.id = test_order_items.test_order_id
    AND o.doctor_id = auth.uid()
  )
);

-- Doctors and lab staff can update test order items
CREATE POLICY "Authorized users can update test order items"
ON public.test_order_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.test_orders o
    WHERE o.id = test_order_items.test_order_id
    AND (
      o.doctor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.lab_staff ls
        WHERE ls.lab_center_id = o.lab_center_id
        AND ls.user_id = auth.uid()
        AND ls.status = 'active'
      )
    )
  )
);

-- 4. Fix notifications: replace permissive INSERT policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Only authenticated users can create notifications (for their own actions)
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);