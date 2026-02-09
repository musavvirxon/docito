-- File: supabase/migrations/20260207202000_finance_refunds_and_reversals.sql
-- B18: Refunds/Reversals support
-- - Allow negative finance_entries.amount_cents (to represent reversals/refunds)
-- - Add helper RPC to create a reversal entry linked to an original entry
-- - Reversal is created with amount_cents = -original.amount_cents and metadata.reversal_of = original id
-- Idempotent

begin;

-- 1) Allow negative amount_cents by removing any "amount_cents >= 0" check constraint if present.
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'finance_entries'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%amount_cents%'
      and pg_get_constraintdef(c.oid) ilike '%>= 0%'
  loop
    execute format('alter table public.finance_entries drop constraint if exists %I', r.conname);
  end loop;
end $$;

-- 2) Add a safer constraint (non-zero). This supports both positive normal entries and negative reversals.
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'finance_entries'
      and c.conname = 'finance_entries_amount_nonzero_chk'
  ) then
    alter table public.finance_entries
      add constraint finance_entries_amount_nonzero_chk check (amount_cents <> 0);
  end if;
end $$;

-- 3) Create reversal RPC
create or replace function public.finance_entry_create_reversal(
  p_entity_type text,
  p_entity_id uuid,
  p_original_entry_id uuid,
  p_occurred_at timestamptz,
  p_description text,
  p_reference text,
  p_idempotency_key text
)
returns table (
  reversal_entry_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();

  v_orig record;
  v_occ timestamptz := coalesce(p_occurred_at, now());

  v_desc text;
  v_ref text;
  v_source_id text;
  v_existing uuid;
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

  if p_original_entry_id is null then
    raise exception 'original_entry_id required';
  end if;

  select
    e.id,
    e.entity_type,
    e.entity_id,
    e.entry_type,
    e.amount_cents,
    e.currency,
    e.category_id,
    e.description,
    e.metadata
  into v_orig
  from public.finance_entries e
  where e.id = p_original_entry_id
  limit 1;

  if v_orig.id is null then
    raise exception 'Original entry not found';
  end if;

  if v_orig.entity_type <> p_entity_type or v_orig.entity_id <> p_entity_id then
    raise exception 'Original entry does not belong to entity';
  end if;

  -- prevent reversing a reversal (optional safety)
  if coalesce((v_orig.metadata->>'reversal_of')::text, '') <> '' then
    raise exception 'Cannot reverse a reversal entry';
  end if;

  -- Idempotency: if provided, make a deterministic link id and return existing if already linked
  if nullif(btrim(coalesce(p_idempotency_key, '')), '') is not null then
    v_source_id := 'finance_reversal:' || p_idempotency_key;

    select fel.finance_entry_id into v_existing
    from public.finance_event_links fel
    where fel.entity_type = p_entity_type
      and fel.entity_id = p_entity_id
      and fel.source_table = 'finance_entries_reversals'
      and fel.source_id = v_source_id
    limit 1;

    if v_existing is not null then
      reversal_entry_id := v_existing;
      return next;
      return;
    end if;
  end if;

  v_desc := nullif(btrim(coalesce(p_description, '')), '');
  if v_desc is null then
    v_desc := 'Reversal of entry ' || v_orig.id::text;
  end if;

  v_ref := nullif(btrim(coalesce(p_reference, '')), '');

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
    created_by
  ) values (
    p_entity_type,
    p_entity_id,
    v_orig.entry_type,
    -- reversal sign:
    -(v_orig.amount_cents),
    v_orig.currency,
    v_occ,
    v_orig.category_id,
    v_desc,
    coalesce(v_orig.metadata, '{}'::jsonb)
      || jsonb_build_object(
        'module', 'manual_reversal',
        'reversal_of', v_orig.id,
        'reference', v_ref
      ),
    v_uid
  )
  returning id into reversal_entry_id;

  if v_source_id is not null then
    insert into public.finance_event_links (
      entity_type,
      entity_id,
      finance_entry_id,
      source_table,
      source_id,
      created_by
    ) values (
      p_entity_type,
      p_entity_id,
      reversal_entry_id,
      'finance_entries_reversals',
      v_source_id,
      v_uid
    )
    on conflict do nothing;
  end if;

  return next;
end;
$$;

revoke all on function public.finance_entry_create_reversal(
  text, uuid, uuid, timestamptz, text, text, text
) from public;

grant execute on function public.finance_entry_create_reversal(
  text, uuid, uuid, timestamptz, text, text, text
) to authenticated;

commit;
