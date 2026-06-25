
CREATE TABLE IF NOT EXISTS public.clinic_inventory (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id         UUID        NOT NULL,
  name              TEXT        NOT NULL,
  description       TEXT,
  category          TEXT        NOT NULL DEFAULT 'medication',
  unit              TEXT        NOT NULL DEFAULT 'units',
  quantity_in_stock NUMERIC     NOT NULL DEFAULT 0,
  reorder_level     NUMERIC     NOT NULL DEFAULT 10,
  avg_daily_usage   NUMERIC,
  expiry_date       DATE,
  supplier          TEXT,
  unit_cost         NUMERIC,
  notes             TEXT,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  created_by        UUID        REFERENCES auth.users(id),
  updated_by        UUID        REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_inventory TO authenticated;
GRANT ALL ON public.clinic_inventory TO service_role;
ALTER TABLE public.clinic_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_authenticated" ON public.clinic_inventory
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.clinic_inventory_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id     UUID        NOT NULL REFERENCES public.clinic_inventory(id) ON DELETE CASCADE,
  entity_id        UUID        NOT NULL,
  change_type      TEXT        NOT NULL,
  quantity_change  NUMERIC     NOT NULL,
  quantity_before  NUMERIC     NOT NULL,
  quantity_after   NUMERIC     NOT NULL,
  reference_id     UUID,
  reference_type   TEXT,
  notes            TEXT,
  performed_by     UUID        REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_inventory_logs TO authenticated;
GRANT ALL ON public.clinic_inventory_logs TO service_role;
ALTER TABLE public.clinic_inventory_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_logs_authenticated" ON public.clinic_inventory_logs
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.procedure_inventory_requirements (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id         UUID        NOT NULL,
  procedure_id      UUID        REFERENCES public.procedures(id) ON DELETE CASCADE,
  procedure_name    TEXT,
  inventory_id      UUID        NOT NULL REFERENCES public.clinic_inventory(id) ON DELETE CASCADE,
  quantity_required NUMERIC     NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_id, procedure_id, inventory_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedure_inventory_requirements TO authenticated;
GRANT ALL ON public.procedure_inventory_requirements TO service_role;
ALTER TABLE public.procedure_inventory_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proc_inv_req_authenticated" ON public.procedure_inventory_requirements
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_clinic_inventory_entity   ON public.clinic_inventory (entity_id);
CREATE INDEX IF NOT EXISTS idx_clinic_inventory_category ON public.clinic_inventory (entity_id, category);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_inventory  ON public.clinic_inventory_logs (inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_entity     ON public.clinic_inventory_logs (entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proc_inv_req_entity       ON public.procedure_inventory_requirements (entity_id);
CREATE INDEX IF NOT EXISTS idx_proc_inv_req_procedure    ON public.procedure_inventory_requirements (procedure_id);

CREATE OR REPLACE FUNCTION public.update_clinic_inventory_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clinic_inventory_updated_at ON public.clinic_inventory;
CREATE TRIGGER trg_clinic_inventory_updated_at
  BEFORE UPDATE ON public.clinic_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_clinic_inventory_updated_at();
