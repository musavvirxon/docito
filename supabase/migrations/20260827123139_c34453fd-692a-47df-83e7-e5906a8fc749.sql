CREATE TABLE public.doctor_room_rent_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  user_id uuid NOT NULL,
  room_id uuid NULL REFERENCES public.clinic_rooms(id) ON DELETE SET NULL,
  rent_amount_cents bigint NOT NULL DEFAULT 0,
  rent_frequency text NOT NULL DEFAULT 'monthly',
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_drrp_entity ON public.doctor_room_rent_profiles (entity_type, entity_id);
CREATE INDEX idx_drrp_user ON public.doctor_room_rent_profiles (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_room_rent_profiles TO authenticated;
GRANT ALL ON public.doctor_room_rent_profiles TO service_role;

ALTER TABLE public.doctor_room_rent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entity admins can manage rent profiles"
ON public.doctor_room_rent_profiles
FOR ALL
TO authenticated
USING (
  (EXISTS (SELECT 1 FROM public.practices p WHERE p.id = doctor_room_rent_profiles.entity_id AND p.admin_id = auth.uid()))
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  (EXISTS (SELECT 1 FROM public.practices p WHERE p.id = doctor_room_rent_profiles.entity_id AND p.admin_id = auth.uid()))
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Users can view their own rent profile"
ON public.doctor_room_rent_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE TABLE public.doctor_settlement_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  user_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  commission_owed_cents bigint NOT NULL DEFAULT 0,
  rent_owed_cents bigint NOT NULL DEFAULT 0,
  net_cents bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'settled',
  settled_at timestamptz NOT NULL DEFAULT now(),
  settled_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doctor_settlement_records_period_unique UNIQUE (entity_type, entity_id, user_id, period_start, period_end)
);

CREATE INDEX idx_dsr_entity ON public.doctor_settlement_records (entity_type, entity_id, period_start);
CREATE INDEX idx_dsr_user ON public.doctor_settlement_records (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_settlement_records TO authenticated;
GRANT ALL ON public.doctor_settlement_records TO service_role;

ALTER TABLE public.doctor_settlement_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entity admins can manage settlement records"
ON public.doctor_settlement_records
FOR ALL
TO authenticated
USING (
  (EXISTS (SELECT 1 FROM public.practices p WHERE p.id = doctor_settlement_records.entity_id AND p.admin_id = auth.uid()))
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  (EXISTS (SELECT 1 FROM public.practices p WHERE p.id = doctor_settlement_records.entity_id AND p.admin_id = auth.uid()))
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Users can view their own settlements"
ON public.doctor_settlement_records
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER update_drrp_updated_at BEFORE UPDATE ON public.doctor_room_rent_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dsr_updated_at BEFORE UPDATE ON public.doctor_settlement_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();