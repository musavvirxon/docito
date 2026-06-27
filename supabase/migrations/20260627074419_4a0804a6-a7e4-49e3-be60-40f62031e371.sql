ALTER TABLE public.clinic_inventory
  ADD COLUMN IF NOT EXISTS is_reusable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_uses_per_unit integer NULL,
  ADD COLUMN IF NOT EXISTS requires_sterilization boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_use_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owner_type text NOT NULL DEFAULT 'clinic';

ALTER TABLE public.clinic_inventory
  DROP CONSTRAINT IF EXISTS clinic_inventory_owner_type_check;
ALTER TABLE public.clinic_inventory
  ADD CONSTRAINT clinic_inventory_owner_type_check CHECK (owner_type IN ('clinic','doctor'));

CREATE INDEX IF NOT EXISTS idx_clinic_inventory_entity_owner
  ON public.clinic_inventory (entity_id, owner_type);