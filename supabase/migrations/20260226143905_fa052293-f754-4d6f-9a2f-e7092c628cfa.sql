-- ===== Finance Recurring Rules system (simplified RPCs) =====
-- These are lightweight wrappers so the frontend RPCs don't 404.

-- finance_recurring_rule_list: list rules for entity
CREATE OR REPLACE FUNCTION public.finance_recurring_rule_list(
  p_entity_type text, p_entity_id uuid
)
RETURNS SETOF public.finance_recurring_expenses
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.finance_recurring_expenses
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id
  ORDER BY created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.finance_recurring_rule_list(text, uuid) TO authenticated;

-- finance_recurring_rule_upsert
CREATE OR REPLACE FUNCTION public.finance_recurring_rule_upsert(
  p_entity_type text, p_entity_id uuid,
  p_rule_id uuid DEFAULT NULL,
  p_entry_type text DEFAULT 'expense',
  p_category_id uuid DEFAULT NULL,
  p_category_name text DEFAULT NULL,
  p_amount_cents integer DEFAULT 0,
  p_currency text DEFAULT 'usd',
  p_description text DEFAULT NULL,
  p_frequency text DEFAULT 'monthly',
  p_weekday integer DEFAULT NULL,
  p_day_of_month integer DEFAULT NULL,
  p_month_of_year integer DEFAULT NULL,
  p_autopost boolean DEFAULT false,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cat_id uuid := p_category_id;
  v_id uuid;
BEGIN
  -- Auto-create category if name provided
  IF v_cat_id IS NULL AND p_category_name IS NOT NULL AND p_category_name <> '' THEN
    INSERT INTO public.finance_categories (entity_type, entity_id, kind, name)
    VALUES (p_entity_type, p_entity_id, p_entry_type, p_category_name)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_cat_id;
    IF v_cat_id IS NULL THEN
      SELECT id INTO v_cat_id FROM public.finance_categories
      WHERE entity_type = p_entity_type AND entity_id = p_entity_id AND name = p_category_name LIMIT 1;
    END IF;
  END IF;

  IF p_rule_id IS NOT NULL THEN
    UPDATE public.finance_recurring_expenses SET
      category_id = v_cat_id, amount_cents = p_amount_cents, currency = p_currency,
      description = p_description, frequency = p_frequency, weekday = p_weekday,
      day_of_month = p_day_of_month, month_of_year = p_month_of_year,
      autopost = p_autopost, notes = p_notes, updated_at = now()
    WHERE id = p_rule_id AND entity_type = p_entity_type AND entity_id = p_entity_id;
    RETURN p_rule_id;
  ELSE
    INSERT INTO public.finance_recurring_expenses (
      entity_type, entity_id, category_id, amount_cents, currency, description,
      frequency, weekday, day_of_month, month_of_year, autopost, notes
    ) VALUES (
      p_entity_type, p_entity_id, v_cat_id, p_amount_cents, p_currency, p_description,
      p_frequency, p_weekday, p_day_of_month, p_month_of_year, p_autopost, p_notes
    ) RETURNING id INTO v_id;
    RETURN v_id;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.finance_recurring_rule_upsert(text, uuid, uuid, text, uuid, text, integer, text, text, text, integer, integer, integer, boolean, text) TO authenticated;

-- finance_recurring_rule_deactivate
CREATE OR REPLACE FUNCTION public.finance_recurring_rule_deactivate(
  p_entity_type text, p_entity_id uuid, p_rule_id uuid
)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.finance_recurring_expenses
  SET is_active = false, updated_at = now()
  WHERE id = p_rule_id AND entity_type = p_entity_type AND entity_id = p_entity_id;
$$;
GRANT EXECUTE ON FUNCTION public.finance_recurring_rule_deactivate(text, uuid, uuid) TO authenticated;

-- finance_recurring_entity_runs_list (stub - returns empty for now)
CREATE OR REPLACE FUNCTION public.finance_recurring_entity_runs_list(
  p_entity_type text, p_entity_id uuid, p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid, run_at timestamptz, status text, rules_run integer, entries_created integer, total_cents integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT gen_random_uuid(), now(), 'none'::text, 0, 0, 0 WHERE false;
$$;
GRANT EXECUTE ON FUNCTION public.finance_recurring_entity_runs_list(text, uuid, integer) TO authenticated;

-- finance_recurring_rule_runs_list (stub)
CREATE OR REPLACE FUNCTION public.finance_recurring_rule_runs_list(
  p_entity_type text, p_entity_id uuid, p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid, rule_id uuid, entry_id uuid, run_at timestamptz, amount_cents integer, status text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now(), 0, 'none'::text WHERE false;
$$;
GRANT EXECUTE ON FUNCTION public.finance_recurring_rule_runs_list(text, uuid, integer) TO authenticated;

-- finance_recurring_entity_status (stub)
CREATE OR REPLACE FUNCTION public.finance_recurring_entity_status(
  p_entity_type text, p_entity_id uuid
)
RETURNS TABLE (
  active_rules integer, last_run_at timestamptz, next_run_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT count(*)::integer FROM public.finance_recurring_expenses WHERE entity_type = p_entity_type AND entity_id = p_entity_id AND is_active = true), 0),
    (SELECT max(last_posted_at) FROM public.finance_recurring_expenses WHERE entity_type = p_entity_type AND entity_id = p_entity_id),
    (SELECT min(next_run_at) FROM public.finance_recurring_expenses WHERE entity_type = p_entity_type AND entity_id = p_entity_id AND is_active = true);
$$;
GRANT EXECUTE ON FUNCTION public.finance_recurring_entity_status(text, uuid) TO authenticated;

-- finance_recurring_rule_runs_for_entity_run (stub)
CREATE OR REPLACE FUNCTION public.finance_recurring_rule_runs_for_entity_run(
  p_entity_run_id uuid, p_limit integer DEFAULT 400
)
RETURNS TABLE (
  id uuid, rule_id uuid, entry_id uuid, amount_cents integer, description text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 0, ''::text WHERE false;
$$;
GRANT EXECUTE ON FUNCTION public.finance_recurring_rule_runs_for_entity_run(uuid, integer) TO authenticated;

-- finance_recurring_runs_export (stub)
CREATE OR REPLACE FUNCTION public.finance_recurring_runs_export(
  p_entity_type text, p_entity_id uuid, p_from_date date DEFAULT NULL, p_to_date date DEFAULT NULL
)
RETURNS TABLE (
  run_date text, rule_description text, amount_cents integer, currency text, status text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ''::text, ''::text, 0, 'usd'::text, ''::text WHERE false;
$$;
GRANT EXECUTE ON FUNCTION public.finance_recurring_runs_export(text, uuid, date, date) TO authenticated;

-- finance_entries_export
CREATE OR REPLACE FUNCTION public.finance_entries_export(
  p_entity_type text, p_entity_id uuid,
  p_from_date date DEFAULT NULL, p_to_date date DEFAULT NULL
)
RETURNS TABLE (
  id uuid, occurred_at timestamptz, entry_type text, amount_cents integer, currency text, description text, category_name text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.id, e.occurred_at, e.entry_type, e.amount_cents, e.currency, e.description,
         COALESCE(c.name, 'Uncategorized')
  FROM public.finance_entries e
  LEFT JOIN public.finance_categories c ON c.id = e.category_id
  WHERE e.entity_type = p_entity_type AND e.entity_id = p_entity_id
    AND (p_from_date IS NULL OR e.occurred_at >= p_from_date::timestamptz)
    AND (p_to_date IS NULL OR e.occurred_at < (p_to_date + 1)::timestamptz)
  ORDER BY e.occurred_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.finance_entries_export(text, uuid, date, date) TO authenticated;