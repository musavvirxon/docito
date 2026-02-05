ALTER TABLE public.appointment_holds
  ADD COLUMN IF NOT EXISTS procedure_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'appointment_holds_procedure_id_fkey'
  ) THEN
    ALTER TABLE public.appointment_holds
      ADD CONSTRAINT appointment_holds_procedure_id_fkey
      FOREIGN KEY (procedure_id)
      REFERENCES public.procedures(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS appointment_holds_procedure_id_idx
  ON public.appointment_holds (procedure_id);

-- Helpful composite index for calendar reads (optional)
CREATE INDEX IF NOT EXISTS appointment_holds_doctor_start_at_procedure_idx
  ON public.appointment_holds (doctor_id, start_at, procedure_id);

-- -----------------------------------------------------------------------------
-- 2) appointments: add procedure_id + FK + index (optional but recommended)
-- -----------------------------------------------------------------------------

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS procedure_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'appointments_procedure_id_fkey'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_procedure_id_fkey
      FOREIGN KEY (procedure_id)
      REFERENCES public.procedures(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS appointments_procedure_id_idx
  ON public.appointments (procedure_id);

-- Helpful composite index for doctor calendar queries (optional)
CREATE INDEX IF NOT EXISTS appointments_doctor_date_procedure_idx
  ON public.appointments (doctor_id, appointment_date, procedure_id);

-- -----------------------------------------------------------------------------
-- 3) Legacy table support: appointment_booking_holds (if present)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'appointment_booking_holds'
  ) THEN
    EXECUTE 'ALTER TABLE public.appointment_booking_holds ADD COLUMN IF NOT EXISTS procedure_id uuid';

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'appointment_booking_holds_procedure_id_fkey'
    ) THEN
      EXECUTE '
        ALTER TABLE public.appointment_booking_holds
          ADD CONSTRAINT appointment_booking_holds_procedure_id_fkey
          FOREIGN KEY (procedure_id)
          REFERENCES public.procedures(id)
          ON DELETE SET NULL
      ';
    END IF;

    EXECUTE 'CREATE INDEX IF NOT EXISTS appointment_booking_holds_procedure_id_idx ON public.appointment_booking_holds (procedure_id)';
  END IF;
END $$;
