CREATE TABLE public.doctor_payment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  user_id uuid NOT NULL,
  payment_type text NOT NULL CHECK (payment_type IN ('rent_payment','commission_received')),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  period_start date,
  period_end date,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dps_entity ON public.doctor_payment_submissions (entity_type, entity_id, status);
CREATE INDEX idx_dps_user ON public.doctor_payment_submissions (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.doctor_payment_submissions TO authenticated;
GRANT ALL ON public.doctor_payment_submissions TO service_role;

ALTER TABLE public.doctor_payment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors insert own pending submissions"
ON public.doctor_payment_submissions
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND status = 'pending'
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND review_note IS NULL
);

CREATE POLICY "Doctors view own submissions"
ON public.doctor_payment_submissions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Entity admins view submissions"
ON public.doctor_payment_submissions
FOR SELECT TO authenticated
USING (public.can_access_entity(entity_type, entity_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Entity admins review submissions"
ON public.doctor_payment_submissions
FOR UPDATE TO authenticated
USING (public.can_access_entity(entity_type, entity_id) OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.can_access_entity(entity_type, entity_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.doctor_payment_submissions_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.entity_type IS DISTINCT FROM OLD.entity_type
     OR NEW.entity_id IS DISTINCT FROM OLD.entity_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.payment_type IS DISTINCT FROM OLD.payment_type
     OR NEW.amount_cents IS DISTINCT FROM OLD.amount_cents
     OR NEW.period_start IS DISTINCT FROM OLD.period_start
     OR NEW.period_end IS DISTINCT FROM OLD.period_end
     OR NEW.note IS DISTINCT FROM OLD.note
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only review fields can be updated on a payment submission';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_doctor_payment_submissions_guard
BEFORE UPDATE ON public.doctor_payment_submissions
FOR EACH ROW EXECUTE FUNCTION public.doctor_payment_submissions_guard();