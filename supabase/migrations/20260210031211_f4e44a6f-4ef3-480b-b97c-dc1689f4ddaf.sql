
-- Security Hardening: Tighten RLS policies on critical tables

-- 1. treatment_plan_procedure_visits: ensure RLS enabled
ALTER TABLE IF EXISTS public.treatment_plan_procedure_visits ENABLE ROW LEVEL SECURITY;

-- 2. Drop overly-permissive policies on test_orders if they exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'test_orders' AND policyname = 'test_orders_select_policy') THEN
    DROP POLICY "test_orders_select_policy" ON public.test_orders;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'test_orders' AND policyname = 'Test orders are viewable by everyone') THEN
    DROP POLICY "Test orders are viewable by everyone" ON public.test_orders;
  END IF;
END $$;

-- Create strict test_orders SELECT policy
CREATE POLICY "test_orders_select_authenticated"
  ON public.test_orders FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      patient_id = auth.uid()
      OR doctor_id = (SELECT id FROM public.doctors WHERE user_id = auth.uid() LIMIT 1)
    )
  );

-- 3. Drop overly-permissive policies on test_order_items if they exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'test_order_items' AND policyname = 'test_order_items_select_policy') THEN
    DROP POLICY "test_order_items_select_policy" ON public.test_order_items;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'test_order_items' AND policyname = 'Test order items are viewable by everyone') THEN
    DROP POLICY "Test order items are viewable by everyone" ON public.test_order_items;
  END IF;
END $$;

-- Create strict test_order_items SELECT policy
CREATE POLICY "test_order_items_select_authenticated"
  ON public.test_order_items FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.test_orders
      WHERE test_orders.id = test_order_items.test_order_id
        AND (
          test_orders.patient_id = auth.uid()
          OR test_orders.doctor_id = (SELECT id FROM public.doctors WHERE user_id = auth.uid() LIMIT 1)
        )
    )
  );

-- 4. Restrict notifications INSERT to authenticated users
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Anyone can create notifications') THEN
    DROP POLICY "Anyone can create notifications" ON public.notifications;
  END IF;
END $$;

CREATE POLICY "authenticated_insert_notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
