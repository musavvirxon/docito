CREATE OR REPLACE FUNCTION public.is_my_doctor_entity(p_entity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = p_entity_id AND d.user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS inventory_entity_scoped ON public.clinic_inventory;
CREATE POLICY inventory_entity_scoped ON public.clinic_inventory
  FOR ALL TO authenticated
  USING (public.can_access_any_entity(entity_id) OR public.is_my_doctor_entity(entity_id))
  WITH CHECK (public.can_access_any_entity(entity_id) OR public.is_my_doctor_entity(entity_id));

DROP POLICY IF EXISTS inventory_logs_entity_scoped ON public.clinic_inventory_logs;
CREATE POLICY inventory_logs_entity_scoped ON public.clinic_inventory_logs
  FOR ALL TO authenticated
  USING (public.can_access_any_entity(entity_id) OR public.is_my_doctor_entity(entity_id))
  WITH CHECK (public.can_access_any_entity(entity_id) OR public.is_my_doctor_entity(entity_id));

ALTER TABLE public.clinic_inventory REPLICA IDENTITY FULL;
ALTER TABLE public.clinic_inventory_logs REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clinic_inventory;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clinic_inventory_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;