BEGIN;

-- 1) Diagnosis templates (per-doctor library)
CREATE TABLE IF NOT EXISTS public.doctor_diagnosis_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  title text NOT NULL,
  icd10_code text,
  description text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctor_diagnosis_templates_doctor_id
  ON public.doctor_diagnosis_templates(doctor_id);

ALTER TABLE public.doctor_diagnosis_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_doctor_diagnosis_templates_updated_at'
  ) THEN
    CREATE TRIGGER trg_doctor_diagnosis_templates_updated_at
    BEFORE UPDATE ON public.doctor_diagnosis_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Policies (templates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='doctor_diagnosis_templates' AND policyname='dx_templates_select_own'
  ) THEN
    CREATE POLICY dx_templates_select_own
      ON public.doctor_diagnosis_templates
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.doctors d
          WHERE d.id = doctor_diagnosis_templates.doctor_id
            AND d.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='doctor_diagnosis_templates' AND policyname='dx_templates_insert_own'
  ) THEN
    CREATE POLICY dx_templates_insert_own
      ON public.doctor_diagnosis_templates
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.doctors d
          WHERE d.id = doctor_diagnosis_templates.doctor_id
            AND d.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='doctor_diagnosis_templates' AND policyname='dx_templates_update_own'
  ) THEN
    CREATE POLICY dx_templates_update_own
      ON public.doctor_diagnosis_templates
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.doctors d
          WHERE d.id = doctor_diagnosis_templates.doctor_id
            AND d.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.doctors d
          WHERE d.id = doctor_diagnosis_templates.doctor_id
            AND d.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='doctor_diagnosis_templates' AND policyname='dx_templates_delete_own'
  ) THEN
    CREATE POLICY dx_templates_delete_own
      ON public.doctor_diagnosis_templates
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.doctors d
          WHERE d.id = doctor_diagnosis_templates.doctor_id
            AND d.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 2) Appointment diagnoses (applied during appointments)
CREATE TABLE IF NOT EXISTS public.appointment_diagnoses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_patient_id uuid REFERENCES public.doctor_patients(id) ON DELETE CASCADE,
  diagnosis_template_id uuid REFERENCES public.doctor_diagnosis_templates(id) ON DELETE SET NULL,
  diagnosis_title text NOT NULL,
  icd10_code text,
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointment_diagnoses_patient_ref_check
    CHECK (
      (patient_id IS NOT NULL AND doctor_patient_id IS NULL)
      OR
      (patient_id IS NULL AND doctor_patient_id IS NOT NULL)
      OR
      (patient_id IS NULL AND doctor_patient_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_appointment_diagnoses_appointment_id
  ON public.appointment_diagnoses(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_diagnoses_doctor_id
  ON public.appointment_diagnoses(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointment_diagnoses_patient_id
  ON public.appointment_diagnoses(patient_id);

ALTER TABLE public.appointment_diagnoses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_appointment_diagnoses_updated_at'
  ) THEN
    CREATE TRIGGER trg_appointment_diagnoses_updated_at
    BEFORE UPDATE ON public.appointment_diagnoses
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Policies (appointment diagnoses)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='appointment_diagnoses' AND policyname='appt_dx_select_doctor_or_patient'
  ) THEN
    CREATE POLICY appt_dx_select_doctor_or_patient
      ON public.appointment_diagnoses
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.appointments a
          JOIN public.doctors d ON d.id = a.doctor_id
          WHERE a.id = appointment_diagnoses.appointment_id
            AND (
              d.user_id = auth.uid()
              OR a.patient_id = auth.uid()
            )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='appointment_diagnoses' AND policyname='appt_dx_insert_doctor_only'
  ) THEN
    CREATE POLICY appt_dx_insert_doctor_only
      ON public.appointment_diagnoses
      FOR INSERT
      WITH CHECK (
        created_by = auth.uid()
        AND EXISTS (
          SELECT 1
          FROM public.appointments a
          JOIN public.doctors d ON d.id = a.doctor_id
          WHERE a.id = appointment_diagnoses.appointment_id
            AND d.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='appointment_diagnoses' AND policyname='appt_dx_update_doctor_only'
  ) THEN
    CREATE POLICY appt_dx_update_doctor_only
      ON public.appointment_diagnoses
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.appointments a
          JOIN public.doctors d ON d.id = a.doctor_id
          WHERE a.id = appointment_diagnoses.appointment_id
            AND d.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.appointments a
          JOIN public.doctors d ON d.id = a.doctor_id
          WHERE a.id = appointment_diagnoses.appointment_id
            AND d.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='appointment_diagnoses' AND policyname='appt_dx_delete_doctor_only'
  ) THEN
    CREATE POLICY appt_dx_delete_doctor_only
      ON public.appointment_diagnoses
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1
          FROM public.appointments a
          JOIN public.doctors d ON d.id = a.doctor_id
          WHERE a.id = appointment_diagnoses.appointment_id
            AND d.user_id = auth.uid()
        )
      );
  END IF;
END $$;

COMMIT;
