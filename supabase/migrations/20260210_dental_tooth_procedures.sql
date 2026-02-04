BEGIN;

-- Store dental procedures per tooth
CREATE TABLE IF NOT EXISTS public.appointment_procedure_teeth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  procedure_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  tooth_number TEXT NOT NULL, -- FDI notation: 11,12,13...
  unit_price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointment_procedure_teeth_appointment
  ON public.appointment_procedure_teeth (appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointment_procedure_teeth_procedure
  ON public.appointment_procedure_teeth (procedure_id);

COMMIT;
