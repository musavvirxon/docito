ALTER TABLE public.billing_transactions
  ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES public.doctors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS billing_transactions_doctor_id_idx
  ON public.billing_transactions(doctor_id);

CREATE OR REPLACE FUNCTION public.billing_set_doctor_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.doctor_id IS NULL AND NEW.appointment_id IS NOT NULL THEN
    SELECT a.doctor_id INTO NEW.doctor_id
    FROM public.appointments a
    WHERE a.id = NEW.appointment_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS billing_transactions_set_doctor_id ON public.billing_transactions;
CREATE TRIGGER billing_transactions_set_doctor_id
  BEFORE INSERT OR UPDATE OF appointment_id ON public.billing_transactions
  FOR EACH ROW EXECUTE FUNCTION public.billing_set_doctor_id();

UPDATE public.billing_transactions bt
SET doctor_id = a.doctor_id
FROM public.appointments a
WHERE bt.appointment_id = a.id AND bt.doctor_id IS NULL;