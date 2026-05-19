
-- 1. Backfill: link doctors whose join request was already accepted
UPDATE public.doctors d
SET practice_id = jr.practice_id,
    practice_location_id = COALESCE(d.practice_location_id, jr.location_id)
FROM public.practice_join_requests jr
WHERE jr.doctor_id = d.id
  AND jr.status = 'accepted'
  AND d.practice_id IS NULL;

-- 2. Backfill: stamp untagged appointments with their doctor's practice
UPDATE public.appointments a
SET practice_id = d.practice_id
FROM public.doctors d
WHERE a.doctor_id = d.id
  AND a.practice_id IS NULL
  AND d.practice_id IS NOT NULL;

-- 3. Backfill: stamp untagged billing transactions from their appointment
UPDATE public.billing_transactions bt
SET practice_id = a.practice_id
FROM public.appointments a
WHERE bt.appointment_id = a.id
  AND bt.practice_id IS NULL
  AND a.practice_id IS NOT NULL;

-- 4. Trigger: when a join request becomes accepted, link the doctor
--    and backfill any of their untagged appointments/billing.
CREATE OR REPLACE FUNCTION public.handle_join_request_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'accepted')
  THEN
    UPDATE public.doctors
    SET practice_id = NEW.practice_id,
        practice_location_id = COALESCE(practice_location_id, NEW.location_id)
    WHERE id = NEW.doctor_id
      AND practice_id IS NULL;

    UPDATE public.appointments a
    SET practice_id = NEW.practice_id
    WHERE a.doctor_id = NEW.doctor_id
      AND a.practice_id IS NULL;

    UPDATE public.billing_transactions bt
    SET practice_id = NEW.practice_id
    WHERE bt.practice_id IS NULL
      AND bt.appointment_id IN (
        SELECT id FROM public.appointments WHERE doctor_id = NEW.doctor_id
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_join_request_accepted ON public.practice_join_requests;
CREATE TRIGGER trg_join_request_accepted
AFTER INSERT OR UPDATE OF status ON public.practice_join_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_join_request_accepted();

-- 5. Trigger: auto-stamp practice_id on new appointments from the doctor
CREATE OR REPLACE FUNCTION public.appointments_set_practice_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.practice_id IS NULL AND NEW.doctor_id IS NOT NULL THEN
    SELECT practice_id INTO NEW.practice_id
    FROM public.doctors WHERE id = NEW.doctor_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_set_practice_id ON public.appointments;
CREATE TRIGGER trg_appointments_set_practice_id
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.appointments_set_practice_id();

-- 6. Trigger: auto-stamp practice_id on new billing transactions
CREATE OR REPLACE FUNCTION public.billing_set_practice_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.practice_id IS NULL AND NEW.appointment_id IS NOT NULL THEN
    SELECT practice_id INTO NEW.practice_id
    FROM public.appointments WHERE id = NEW.appointment_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_billing_set_practice_id ON public.billing_transactions;
CREATE TRIGGER trg_billing_set_practice_id
BEFORE INSERT ON public.billing_transactions
FOR EACH ROW
EXECUTE FUNCTION public.billing_set_practice_id();

-- 7. Fix broken get_practice_services (referenced non-existent procedures.created_by)
CREATE OR REPLACE FUNCTION public.get_practice_services(p_practice_id uuid)
RETURNS TABLE(id uuid, name text, doctor_name text, price numeric, duration_minutes integer, category text)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name::text,
    COALESCE(pr.full_name, 'Practice Service')::text AS doctor_name,
    p.cost AS price,
    p.duration_minutes,
    p.category::text
  FROM public.procedures p
  LEFT JOIN public.doctors d ON d.id = p.doctor_id
  LEFT JOIN public.profiles pr ON pr.user_id = d.user_id
  WHERE p.practice_id = p_practice_id
     OR d.practice_id = p_practice_id
  ORDER BY p.name;
END;
$$;
