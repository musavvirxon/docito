
-- Fix policies & functions that mistakenly compared appointment_reviews.doctor_id (which is doctors.id) against auth.uid().

DROP POLICY IF EXISTS "Doctors can read reviews about them" ON public.appointment_reviews;
DROP POLICY IF EXISTS "Doctors can reply to reviews about them" ON public.appointment_reviews;

CREATE POLICY "Doctors can read reviews about them"
  ON public.appointment_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = appointment_reviews.doctor_id
        AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can reply to reviews about them"
  ON public.appointment_reviews FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = appointment_reviews.doctor_id
        AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = appointment_reviews.doctor_id
        AND d.user_id = auth.uid()
    )
  );

-- Rewrite the doctor reply guard: detect doctor by looking up doctors row via user_id
CREATE OR REPLACE FUNCTION public.appointment_reviews_doctor_reply_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_is_doctor boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = NEW.doctor_id AND d.user_id = auth.uid()
  ) INTO v_is_doctor;

  IF v_is_doctor AND auth.uid() <> NEW.patient_id THEN
    IF NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.comment IS DISTINCT FROM OLD.comment
       OR NEW.is_public IS DISTINCT FROM OLD.is_public
       OR NEW.appointment_id IS DISTINCT FROM OLD.appointment_id
       OR NEW.patient_id IS DISTINCT FROM OLD.patient_id
       OR NEW.doctor_id IS DISTINCT FROM OLD.doctor_id THEN
      RAISE EXCEPTION 'Doctors can only update the reply fields';
    END IF;
    IF NEW.doctor_reply IS DISTINCT FROM OLD.doctor_reply THEN
      NEW.doctor_replied_at = now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Recompute against doctors.id (not user_id)
CREATE OR REPLACE FUNCTION public.recompute_doctor_review_stats(_doctor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg numeric;
  v_count integer;
BEGIN
  SELECT COALESCE(AVG(rating), 0)::numeric(3,2), COUNT(*)
    INTO v_avg, v_count
    FROM public.appointment_reviews
    WHERE doctor_id = _doctor_id;

  UPDATE public.doctors
    SET average_rating = v_avg,
        num_reviews = v_count,
        weighted_rating = v_avg
    WHERE id = _doctor_id;
END;
$$;
