CREATE TABLE IF NOT EXISTS public.clinic_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_minutes integer DEFAULT 30,
  price_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  deposit_required boolean NOT NULL DEFAULT false,
  deposit_cents bigint NOT NULL DEFAULT 0,
  deposit_type text NOT NULL DEFAULT 'fixed' CHECK (deposit_type IN ('fixed', 'percent')),
  is_active boolean NOT NULL DEFAULT true,
  category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_services_practice ON public.clinic_services(practice_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_services TO authenticated;
GRANT ALL ON public.clinic_services TO service_role;

ALTER TABLE public.clinic_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_services_select" ON public.clinic_services FOR SELECT
  TO authenticated
  USING (public.can_access_practice(practice_id));

CREATE POLICY "clinic_services_insert" ON public.clinic_services FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.practices p WHERE p.id = practice_id AND p.admin_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.clinic_staff cs
      WHERE cs.practice_id = clinic_services.practice_id
        AND cs.user_id = auth.uid()
        AND cs.staff_role IN ('clinic_admin','manager')
        AND cs.status = 'active'
    )
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "clinic_services_update" ON public.clinic_services FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.practices p WHERE p.id = practice_id AND p.admin_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.clinic_staff cs
      WHERE cs.practice_id = clinic_services.practice_id
        AND cs.user_id = auth.uid()
        AND cs.staff_role IN ('clinic_admin','manager')
        AND cs.status = 'active'
    )
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "clinic_services_delete" ON public.clinic_services FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.practices p WHERE p.id = practice_id AND p.admin_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "clinic_services_service_role" ON public.clinic_services FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_clinic_services_updated_at
  BEFORE UPDATE ON public.clinic_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();