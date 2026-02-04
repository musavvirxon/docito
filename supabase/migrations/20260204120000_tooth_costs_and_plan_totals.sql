-- File: supabase/migrations/20260204120000_tooth_costs_and_plan_totals.sql
-- Purpose:
-- 1) Auto-calculate per-tooth costs for dental chart history (tooth_procedure_history)
-- 2) Recompute treatment_plans.total_cost using tooth count when procedure.type = 'tooth_based'
-- 3) Prevent patients from reading the dental chart (tooth_records), while keeping history visible

-- ------------------------------------------------------------
-- A) Treatment plan total cost (cost-per-tooth support)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.calculate_treatment_plan_total_cost(p_treatment_plan_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE
      WHEN COALESCE(p.type, 'oral_cavity_region'::public.procedure_type) = 'tooth_based'::public.procedure_type THEN
        COALESCE(tpp.cost, p.default_cost, p.price, 0) *
        GREATEST(COALESCE(array_length(tpp.tooth_numbers, 1), 0), 1)
      ELSE
        COALESCE(tpp.cost, p.default_cost, p.price, 0)
    END
  ), 0)
  FROM public.treatment_plan_procedures tpp
  LEFT JOIN public.procedures p ON p.id = tpp.procedure_id
  WHERE tpp.treatment_plan_id = p_treatment_plan_id;
$$;

CREATE OR REPLACE FUNCTION public.recompute_treatment_plan_total_cost(p_treatment_plan_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
BEGIN
  IF p_treatment_plan_id IS NULL THEN
    RETURN;
  END IF;

  v_total := public.calculate_treatment_plan_total_cost(p_treatment_plan_id);

  UPDATE public.treatment_plans
  SET
    total_cost = v_total,
    updated_at = now()
  WHERE id = p_treatment_plan_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.treatment_plan_procedures_recompute_total_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recompute_treatment_plan_total_cost(NEW.treatment_plan_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.treatment_plan_id IS DISTINCT FROM NEW.treatment_plan_id THEN
      PERFORM public.recompute_treatment_plan_total_cost(OLD.treatment_plan_id);
      PERFORM public.recompute_treatment_plan_total_cost(NEW.treatment_plan_id);
    ELSE
      PERFORM public.recompute_treatment_plan_total_cost(NEW.treatment_plan_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_treatment_plan_total_cost(OLD.treatment_plan_id);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_treatment_plan_procedures_recompute_total ON public.treatment_plan_procedures;
CREATE TRIGGER trg_treatment_plan_procedures_recompute_total
AFTER INSERT OR UPDATE OR DELETE ON public.treatment_plan_procedures
FOR EACH ROW
EXECUTE FUNCTION public.treatment_plan_procedures_recompute_total_trg();

-- Optional helper RPC (uses RLS normally; safe for UI to show breakdown)
CREATE OR REPLACE FUNCTION public.get_treatment_plan_procedure_costs(p_treatment_plan_id uuid)
RETURNS TABLE (
  treatment_plan_procedure_id uuid,
  procedure_id uuid,
  procedure_name text,
  procedure_type public.procedure_type,
  tooth_numbers integer[],
  quantity integer,
  unit_cost numeric,
  line_total numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    tpp.id AS treatment_plan_procedure_id,
    tpp.procedure_id,
    COALESCE(p.name, 'Procedure') AS procedure_name,
    p.type AS procedure_type,
    tpp.tooth_numbers,
    CASE
      WHEN p.type = 'tooth_based'::public.procedure_type THEN
        GREATEST(COALESCE(array_length(tpp.tooth_numbers, 1), 0), 1)
      ELSE 1
    END AS quantity,
    COALESCE(tpp.cost, p.default_cost, p.price, 0) AS unit_cost,
    CASE
      WHEN p.type = 'tooth_based'::public.procedure_type THEN
        COALESCE(tpp.cost, p.default_cost, p.price, 0) * GREATEST(COALESCE(array_length(tpp.tooth_numbers, 1), 0), 1)
      ELSE
        COALESCE(tpp.cost, p.default_cost, p.price, 0)
    END AS line_total
  FROM public.treatment_plan_procedures tpp
  LEFT JOIN public.procedures p ON p.id = tpp.procedure_id
  WHERE tpp.treatment_plan_id = p_treatment_plan_id
  ORDER BY COALESCE(tpp.sequence_order, 999999), tpp.created_at NULLS LAST;
$$;

-- Update existing RPC to use the new total calculation (and keep authorization)
CREATE OR REPLACE FUNCTION public.add_procedure_to_treatment_plan(
  treatment_plan_id uuid,
  procedure_id uuid,
  cost numeric DEFAULT NULL,            -- NOTE: treated as "unit cost" (per-tooth if tooth_based)
  notes text DEFAULT NULL,
  tooth_numbers integer[] DEFAULT NULL,
  sequence_order integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit_cost numeric;
  v_new_sequence integer;
  v_plan_doctor_id uuid;
BEGIN
  -- Find plan doctor_id
  SELECT tp.doctor_id INTO v_plan_doctor_id
  FROM public.treatment_plans tp
  WHERE tp.id = treatment_plan_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Treatment plan not found');
  END IF;

  -- Authorization: allow either (a) doctor_id == auth.uid() OR (b) doctor profile owns this doctor_id
  IF NOT (
    v_plan_doctor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = v_plan_doctor_id AND d.user_id = auth.uid())
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: you are not the doctor for this treatment plan');
  END IF;

  -- Default unit cost if not provided
  IF cost IS NULL THEN
    SELECT COALESCE(p.default_cost, p.price, 0) INTO v_unit_cost
    FROM public.procedures p
    WHERE p.id = procedure_id;

    cost := COALESCE(v_unit_cost, 0);
  END IF;

  -- Default sequence
  IF sequence_order IS NULL THEN
    SELECT COALESCE(MAX(tpp.sequence_order), 0) + 1 INTO v_new_sequence
    FROM public.treatment_plan_procedures tpp
    WHERE tpp.treatment_plan_id = add_procedure_to_treatment_plan.treatment_plan_id;

    sequence_order := v_new_sequence;
  END IF;

  INSERT INTO public.treatment_plan_procedures (
    treatment_plan_id, procedure_id, cost, notes, tooth_numbers, sequence_order
  ) VALUES (
    treatment_plan_id, procedure_id, cost, notes, tooth_numbers, sequence_order
  );

  -- Recompute plan total using tooth multiplier rules
  PERFORM public.recompute_treatment_plan_total_cost(treatment_plan_id);

  RETURN json_build_object('success', true, 'message', 'Procedure added to treatment plan');
END;
$$;

-- ------------------------------------------------------------
-- B) Dental chart history: auto-cost per tooth when cost is omitted
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tooth_procedure_history_defaults_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit_cost numeric;
  v_count integer;
  v_name text;
BEGIN
  -- Fill procedure_name from catalog if omitted
  IF NEW.procedure_id IS NOT NULL AND (NEW.procedure_name IS NULL OR btrim(NEW.procedure_name) = '') THEN
    SELECT dp.name INTO v_name
    FROM public.dental_procedures dp
    WHERE dp.id = NEW.procedure_id;

    IF v_name IS NOT NULL THEN
      NEW.procedure_name := v_name;
    END IF;
  END IF;

  -- Auto-cost: default_cost * number_of_teeth (when cost is NULL)
  IF NEW.cost IS NULL THEN
    v_unit_cost := NULL;

    IF NEW.procedure_id IS NOT NULL THEN
      SELECT dp.default_cost INTO v_unit_cost
      FROM public.dental_procedures dp
      WHERE dp.id = NEW.procedure_id;
    END IF;

    v_unit_cost := COALESCE(v_unit_cost, 0);
    v_count := GREATEST(COALESCE(array_length(NEW.tooth_numbers, 1), 0), 1);

    NEW.cost := v_unit_cost * v_count;
  END IF;

  -- If completed and performed_at missing, set it
  IF NEW.status = 'completed' AND NEW.performed_at IS NULL THEN
    NEW.performed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tooth_procedure_history_defaults ON public.tooth_procedure_history;
CREATE TRIGGER trg_tooth_procedure_history_defaults
BEFORE INSERT OR UPDATE ON public.tooth_procedure_history
FOR EACH ROW
EXECUTE FUNCTION public.tooth_procedure_history_defaults_trg();

-- ------------------------------------------------------------
-- C) Patients must NOT see the dental chart (tooth_records)
--     They can still see dental history via tooth_procedure_history (existing policy)
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Patients can view their own tooth records" ON public.tooth_records;
