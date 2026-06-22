CREATE TABLE public.prescription_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  notes text,
  refills integer NOT NULL DEFAULT 0,
  medications jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_shared boolean NOT NULL DEFAULT false,
  practice_id uuid REFERENCES public.practices(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescription_templates TO authenticated;
GRANT ALL ON public.prescription_templates TO service_role;

ALTER TABLE public.prescription_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doctor_owns_template"
  ON public.prescription_templates
  FOR ALL
  TO authenticated
  USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()))
  WITH CHECK (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

CREATE POLICY "shared_template_practice_read"
  ON public.prescription_templates
  FOR SELECT
  TO authenticated
  USING (
    is_shared
    AND practice_id IS NOT NULL
    AND practice_id IN (SELECT practice_id FROM public.doctors WHERE user_id = auth.uid())
  );

CREATE INDEX idx_prescription_templates_doctor ON public.prescription_templates(doctor_id);
CREATE INDEX idx_prescription_templates_practice ON public.prescription_templates(practice_id) WHERE is_shared;

CREATE TRIGGER update_prescription_templates_updated_at
  BEFORE UPDATE ON public.prescription_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();