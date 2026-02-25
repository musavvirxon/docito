
-- Create imaging_staff_invitations table
CREATE TABLE IF NOT EXISTS public.imaging_staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imaging_center_id uuid NOT NULL REFERENCES public.imaging_centers(id) ON DELETE CASCADE,
  email text NOT NULL,
  staff_role text NOT NULL DEFAULT 'technician',
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid REFERENCES auth.users(id),
  token text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.imaging_staff_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Imaging staff invitations viewable by center staff"
  ON public.imaging_staff_invitations FOR SELECT TO authenticated
  USING (
    imaging_center_id IN (
      SELECT imaging_center_id FROM public.imaging_staff WHERE user_id = auth.uid()
    )
    OR invited_by = auth.uid()
  );

CREATE POLICY "Imaging staff invitations insertable by center staff"
  ON public.imaging_staff_invitations FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Imaging staff invitations updatable by center staff"
  ON public.imaging_staff_invitations FOR UPDATE TO authenticated
  USING (
    imaging_center_id IN (
      SELECT imaging_center_id FROM public.imaging_staff WHERE user_id = auth.uid()
    )
  );

-- Create lab_staff_invitations table
CREATE TABLE IF NOT EXISTS public.lab_staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_center_id uuid NOT NULL REFERENCES public.lab_centers(id) ON DELETE CASCADE,
  email text NOT NULL,
  staff_role text NOT NULL DEFAULT 'technician',
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid REFERENCES auth.users(id),
  token text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_staff_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lab staff invitations viewable by lab staff"
  ON public.lab_staff_invitations FOR SELECT TO authenticated
  USING (
    lab_center_id IN (
      SELECT lab_center_id FROM public.lab_staff WHERE user_id = auth.uid()
    )
    OR invited_by = auth.uid()
  );

CREATE POLICY "Lab staff invitations insertable by lab staff"
  ON public.lab_staff_invitations FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Lab staff invitations updatable by lab staff"
  ON public.lab_staff_invitations FOR UPDATE TO authenticated
  USING (
    lab_center_id IN (
      SELECT lab_center_id FROM public.lab_staff WHERE user_id = auth.uid()
    )
  );

-- Create pharmacy_orders table (fallback for fulfillment_orders)
CREATE TABLE IF NOT EXISTS public.pharmacy_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  prescription_id uuid REFERENCES public.prescriptions(id),
  patient_id uuid NOT NULL,
  patient_name text,
  order_number text NOT NULL DEFAULT ('PO-' || substr(gen_random_uuid()::text, 1, 8)),
  status text NOT NULL DEFAULT 'pending',
  priority text DEFAULT 'normal',
  total_amount numeric DEFAULT 0,
  total_amount_cents integer DEFAULT 0,
  amount numeric DEFAULT 0,
  amount_cents integer DEFAULT 0,
  copay_amount numeric DEFAULT 0,
  insurance_amount numeric DEFAULT 0,
  payment_status text DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pharmacy_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacy orders viewable by pharmacy staff"
  ON public.pharmacy_orders FOR SELECT TO authenticated
  USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM public.pharmacy_staff WHERE user_id = auth.uid()
    )
    OR patient_id = auth.uid()
  );

CREATE POLICY "Pharmacy orders insertable by pharmacy staff"
  ON public.pharmacy_orders FOR INSERT TO authenticated
  WITH CHECK (
    pharmacy_id IN (
      SELECT pharmacy_id FROM public.pharmacy_staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Pharmacy orders updatable by pharmacy staff"
  ON public.pharmacy_orders FOR UPDATE TO authenticated
  USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM public.pharmacy_staff WHERE user_id = auth.uid()
    )
  );

-- Create audit_logs table (referenced by staff managers)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid,
  entity_type text,
  resource_id uuid,
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id),
  actor_email text,
  details jsonb,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit logs viewable by actor"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (actor_id = auth.uid());

CREATE POLICY "Audit logs insertable by authenticated users"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());
