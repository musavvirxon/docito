
-- ============================================================
-- Appointment Reviews System
-- One review per (appointment, patient). Patients can write reviews
-- only for their own completed appointments. Doctors can read
-- reviews for their own appointments. Practice members can read
-- reviews for their practice's appointments. Public can read
-- non-private reviews via aggregated/public-facing queries (we
-- enable anonymous SELECT, doctor names are surfaced separately).
-- Doctor aggregates (doctors.average_rating, num_reviews) are
-- recalculated automatically by trigger.
-- ============================================================

CREATE TABLE public.appointment_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  doctor_reply text,
  doctor_replied_at timestamptz,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointment_reviews_unique_per_appointment UNIQUE (appointment_id, patient_id)
);

CREATE INDEX idx_appointment_reviews_doctor_id ON public.appointment_reviews(doctor_id);
CREATE INDEX idx_appointment_reviews_appointment_id ON public.appointment_reviews(appointment_id);
CREATE INDEX idx_appointment_reviews_patient_id ON public.appointment_reviews(patient_id);

-- Grants (required for PostgREST)
GRANT SELECT ON public.appointment_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_reviews TO authenticated;
GRANT ALL ON public.appointment_reviews TO service_role;

ALTER TABLE public.appointment_reviews ENABLE ROW LEVEL SECURITY;

-- Public can read public reviews (used by public doctor profile)
CREATE POLICY "Public can read public reviews"
  ON public.appointment_reviews FOR SELECT
  USING (is_public = true);

-- The patient who left the review can always read it
CREATE POLICY "Patients can read their own reviews"
  ON public.appointment_reviews FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- The doctor being reviewed can always read the review
CREATE POLICY "Doctors can read reviews about them"
  ON public.appointment_reviews FOR SELECT
  TO authenticated
  USING (doctor_id = auth.uid());

-- Patient may insert a review only for their own completed appointment
CREATE POLICY "Patients can create reviews for their completed appointments"
  ON public.appointment_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_id
        AND a.patient_id = auth.uid()
        AND a.doctor_id = appointment_reviews.doctor_id
        AND a.status = 'completed'
    )
  );

-- Patient may edit/delete their own review
CREATE POLICY "Patients can update their own review"
  ON public.appointment_reviews FOR UPDATE
  TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can delete their own review"
  ON public.appointment_reviews FOR DELETE
  TO authenticated
  USING (patient_id = auth.uid());

-- Doctor may update only the reply column (enforced via trigger below)
CREATE POLICY "Doctors can reply to reviews about them"
  ON public.appointment_reviews FOR UPDATE
  TO authenticated
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

-- Trigger: keep updated_at fresh
CREATE OR REPLACE FUNCTION public.appointment_reviews_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointment_reviews_updated_at
BEFORE UPDATE ON public.appointment_reviews
FOR EACH ROW
EXECUTE FUNCTION public.appointment_reviews_set_updated_at();

-- Trigger: when doctor updates, lock all columns except doctor_reply / doctor_replied_at
CREATE OR REPLACE FUNCTION public.appointment_reviews_doctor_reply_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- If the updater is the doctor (not the patient), only allow reply fields to change
  IF auth.uid() = NEW.doctor_id AND auth.uid() <> NEW.patient_id THEN
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

CREATE TRIGGER trg_appointment_reviews_doctor_reply_guard
BEFORE UPDATE ON public.appointment_reviews
FOR EACH ROW
EXECUTE FUNCTION public.appointment_reviews_doctor_reply_guard();

-- Trigger: recompute doctors.average_rating, num_reviews, weighted_rating
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
    WHERE user_id = _doctor_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.appointment_reviews_sync_doctor_stats()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.recompute_doctor_review_stats(OLD.doctor_id);
    RETURN OLD;
  ELSE
    PERFORM public.recompute_doctor_review_stats(NEW.doctor_id);
    IF (TG_OP = 'UPDATE' AND OLD.doctor_id IS DISTINCT FROM NEW.doctor_id) THEN
      PERFORM public.recompute_doctor_review_stats(OLD.doctor_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_appointment_reviews_sync_stats
AFTER INSERT OR UPDATE OR DELETE ON public.appointment_reviews
FOR EACH ROW
EXECUTE FUNCTION public.appointment_reviews_sync_doctor_stats();
