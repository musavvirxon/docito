-- File: supabase/migrations/20260207201000_finance_manual_entry_upsert.sql
-- B17: Manual finance entries (income/expense/payroll) via RPC with optional category creation + reference field
-- - Adds RPC: finance_entry_upsert_manual(...)
-- - Stores "reference" in finance_entries.metadata->>'reference'
-- - Uses finance_ensure_category() when category_id not provided
-- Idempotent

begin;

create or replace function public.finance_entry_upsert_manual(
  p_entity_type text,
  p_entity_id uuid,

  p_entry_id uuid,                -- null => create; non-null => update
  p_entry_type text,              -- 'income' | 'expense' | 'payroll'
  p_amount_cents integer,
  p_currency text,
  p_occurred_at timestamptz,

  p_category_id uuid,             -- optional
  p_category_name text,           -- optional (used when category_id is null)

  p_description text,
  p_reference text                -- optional, stored in metadata.reference
)
returns table (
  entry_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_kind text;
  v_cat_id uuid;
  v_now timestamptz := now();
  v_existing_entity_type text;
  v_existing_entity_id uuid;
begin
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  if p_entity_type is null or btrim(p_entity_type) = '' then
    raise exception 'entity_type required';
  end if;

  if p_entity_id is null then
    raise exception 'entity_id required';
  end if;

  if not public.can_access_entity(p_entity_type, p_entity_id) then
    raise exception 'Forbidden';
  end if;

  v_kind := lower(btrim(coalesce(p_entry_type, '')));
  if v_kind not in ('income', 'expense', 'payroll') then
    raise exception 'Invalid entry_type: %', v_kind;
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'amount_cents must be > 0';
  end if;

  if p_currency is null or btrim(p_currency) = '' then
    raise exception 'currency required';
  end if;

  if p_occurred_at is null then
    raise exception 'occurred_at required';
  end if;

  -- Category resolution
  if p_category_id is not null then
    v_cat_id := p_category_id;
  else
    v_cat_id := public.finance_ensure_category(
      p_entity_type,
      p_entity_id,
      v_kind,
      coalesce(nullif(btrim(coalesce(p_category_name, '')), ''), initcap(v_kind))
    );
  end if;

  -- Update path
  if p_entry_id is not null then
    select e.entity_type, e.entity_id
      into v_existing_entity_type, v_existing_entity_id
    from public.finance_entries e
    where e.id = p_entry_id
    limit 1;

    if v_existing_entity_id is null then
      raise exception 'Entry not found';
    end if;

    if v_existing_entity_type <> p_entity_type or v_existing_entity_id <> p_entity_id then
      raise exception 'Entry does not belong to entity';
    end if;

    update public.finance_entries
      set entry_type = v_kind::public.finance_entry_type,
          amount_cents = p_amount_cents,
          currency = upper(btrim(p_currency)),
          occurred_at = p_occurred_at,
          category_id = v_cat_id,
          description = nullif(btrim(coalesce(p_description, '')), ''),
          metadata = coalesce(metadata, '{}'::jsonb)
            || jsonb_build_object(
              'module', 'manual',
              'reference', nullif(btrim(coalesce(p_reference, '')), '')
            )
    where id = p_entry_id;

    entry_id := p_entry_id;
    return next;
    return;
  end if;

  -- Create path
  insert into public.finance_entries (
    entity_type,
    entity_id,
    entry_type,
    amount_cents,
    currency,
    occurred_at,
    category_id,
    description,
    metadata,
    created_by,
    created_at
  ) values (
    p_entity_type,
    p_entity_id,
    v_kind::public.finance_entry_type,
    p_amount_cents,
    upper(btrim(p_currency)),
    p_occurred_at,
    v_cat_id,
    nullif(btrim(coalesce(p_description, '')), ''),
    jsonb_build_object(
      'module', 'manual',
      'reference', nullif(btrim(coalesce(p_reference, '')), '')
    ),
    v_uid,
    v_now
  )
  returning id into entry_id;

  return next;
end;
$$;

revoke all on function public.finance_entry_upsert_manual(
  text, uuid, uuid, text, integer, text, timestamptz, uuid, text, text, text
) from public;

grant execute on function public.finance_entry_upsert_manual(
  text, uuid, uuid, text, integer, text, timestamptz, uuid, text, text, text
) to authenticated;

commit;
