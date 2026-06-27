-- ============================================================
-- CLINIC INVENTORY SYSTEM — FULL MIGRATION
-- Run this once in Supabase SQL Editor
-- Tables: clinic_inventory · clinic_inventory_logs
--         procedure_inventory_requirements · clinic_inventory_unit_status
-- ============================================================

-- ── 1. Main inventory items ──────────────────────────────────
CREATE TABLE IF NOT EXISTS clinic_inventory (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id               UUID        NOT NULL,
  owner_type              TEXT        NOT NULL DEFAULT 'clinic',
    -- 'clinic' = owned by practice  |  'doctor' = owned by individual doctor
  name                    TEXT        NOT NULL,
  description             TEXT,
  category                TEXT        NOT NULL DEFAULT 'medication',
    -- medication | instrument | supply | consumable
  unit                    TEXT        NOT NULL DEFAULT 'units',
    -- units | ml | mg | boxes | pieces | vials | syringes | ampoules | strips | pairs
  quantity_in_stock       NUMERIC     NOT NULL DEFAULT 0,
  reorder_level           NUMERIC     NOT NULL DEFAULT 10,
  avg_daily_usage         NUMERIC,
  -- ── Reuse & sterilization ──
  is_reusable             BOOLEAN     NOT NULL DEFAULT false,
  max_uses_per_unit       INTEGER,      -- NULL = consumable / single-use only
  requires_sterilization  BOOLEAN     NOT NULL DEFAULT false,
  current_use_count       INTEGER     NOT NULL DEFAULT 0,
  -- ── Meta ──
  expiry_date             DATE,
  supplier                TEXT,
  unit_cost               NUMERIC,
  notes                   TEXT,
  is_active               BOOLEAN     NOT NULL DEFAULT true,
  created_by              UUID        REFERENCES auth.users(id),
  updated_by              UUID        REFERENCES auth.users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Audit log for every quantity/use change ───────────────
CREATE TABLE IF NOT EXISTS clinic_inventory_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id     UUID        NOT NULL REFERENCES clinic_inventory(id) ON DELETE CASCADE,
  entity_id        UUID        NOT NULL,
  change_type      TEXT        NOT NULL,
    -- addition | deduction | adjustment | procedure_use | expired | damaged | sterilized
  quantity_change  NUMERIC     NOT NULL DEFAULT 0,
  quantity_before  NUMERIC     NOT NULL DEFAULT 0,
  quantity_after   NUMERIC     NOT NULL DEFAULT 0,
  use_count_before INTEGER,
  use_count_after  INTEGER,
  reference_id     UUID,
  reference_type   TEXT,       -- 'appointment' | 'procedure' | 'manual'
  notes            TEXT,
  performed_by     UUID        REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Per-physical-unit status tracking (reusable instruments) ─
CREATE TABLE IF NOT EXISTS clinic_inventory_unit_status (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id        UUID        NOT NULL REFERENCES clinic_inventory(id) ON DELETE CASCADE,
  entity_id           UUID        NOT NULL,
  unit_label          TEXT,         -- e.g. "Forceps #3", "Scalpel B"
  use_count           INTEGER     NOT NULL DEFAULT 0,
  max_uses            INTEGER,      -- copied from parent item
  status              TEXT        NOT NULL DEFAULT 'available',
    -- available | in_use | needs_sterilization | retired
  last_used_at        TIMESTAMPTZ,
  last_sterilized_at  TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. Links procedures to the inventory items they consume ──
CREATE TABLE IF NOT EXISTS procedure_inventory_requirements (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id         UUID        NOT NULL,
  procedure_id      UUID        REFERENCES procedures(id) ON DELETE CASCADE,
  procedure_name    TEXT,         -- fallback for custom / ad-hoc procedures
  inventory_id      UUID        NOT NULL REFERENCES clinic_inventory(id) ON DELETE CASCADE,
  quantity_required NUMERIC     NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_id, procedure_id, inventory_id)
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clinic_inv_entity      ON clinic_inventory (entity_id);
CREATE INDEX IF NOT EXISTS idx_clinic_inv_owner       ON clinic_inventory (entity_id, owner_type);
CREATE INDEX IF NOT EXISTS idx_clinic_inv_category    ON clinic_inventory (entity_id, category);
CREATE INDEX IF NOT EXISTS idx_inv_logs_inventory     ON clinic_inventory_logs (inventory_id);
CREATE INDEX IF NOT EXISTS idx_inv_logs_entity        ON clinic_inventory_logs (entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_unit_inventory     ON clinic_inventory_unit_status (inventory_id);
CREATE INDEX IF NOT EXISTS idx_inv_unit_entity_status ON clinic_inventory_unit_status (entity_id, status);
CREATE INDEX IF NOT EXISTS idx_proc_inv_req_entity    ON procedure_inventory_requirements (entity_id);
CREATE INDEX IF NOT EXISTS idx_proc_inv_req_proc      ON procedure_inventory_requirements (procedure_id);

-- ── Auto-update updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION _update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_clinic_inv_updated_at ON clinic_inventory;
CREATE TRIGGER trg_clinic_inv_updated_at
  BEFORE UPDATE ON clinic_inventory
  FOR EACH ROW EXECUTE FUNCTION _update_updated_at();

DROP TRIGGER IF EXISTS trg_inv_unit_updated_at ON clinic_inventory_unit_status;
CREATE TRIGGER trg_inv_unit_updated_at
  BEFORE UPDATE ON clinic_inventory_unit_status
  FOR EACH ROW EXECUTE FUNCTION _update_updated_at();

-- ── Row-Level Security ────────────────────────────────────────
ALTER TABLE clinic_inventory                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_inventory_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_inventory_unit_status      ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_inventory_requirements  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_auth"           ON clinic_inventory                 FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "inv_logs_auth"      ON clinic_inventory_logs            FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "inv_unit_auth"      ON clinic_inventory_unit_status     FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "proc_inv_req_auth"  ON procedure_inventory_requirements FOR ALL USING (auth.uid() IS NOT NULL);
