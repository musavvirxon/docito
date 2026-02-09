-- File: supabase/migrations/20260208111500_finance_entries_export_rpc.sql
-- B34: Export finance entries (per entity) to support accounting/auditing and offline analytics
-- - Adds RPC: finance_entries_export(entity_type, entity_id, date_from, date_to, limit, entry_type, category_id)
-- - Auth + can_access_entity enforced
-- Idempotent: CREATE OR REPLACE

begin;

create or replace function public.finance_entries_export(
  p_entity_type text,
  p_entity_id uuid,
  p_date_from date default null,
  p_date_to date default null,
  p_limit int default 20000,
  p_entry_type text default null,   -- optional filter: 'income' | 'expense' | 'payroll'
  p_category_id uuid default null   -- optional filter
)
returns table (
  occurred_at timestamptz,
  entry_type text,
  amount_cents bigint,
  currency text,
  category_id uuid,
  category_name text,
  description text,
  reference text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_from date := p_date_from;
  v_to date := p_date_to;
  v_lim int := greatest(least(coalesce(p_limit, 20000), 50000), 1);
  v_type text := nullif(btrim(coalesce(p_entry_type,'')), '');
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

  -- Default range: last 90 days if none provided
  if v_from is null and v_to is null then
    v_to := current_date;
    v_from := current_date - 90;
  elsif v_from is null and v_to is not null then
    v_from := v_to - 90;
  elsif v_from is not null and v_to is null then
    v_to := v_from + 90;
  end if;

  if v_from > v_to then
    raise exception 'date_from must be <= date_to';
  end if;

  if v_type is not null and v_type not in ('income','expense','payroll') then
    raise exception 'Invalid entry_type filter';
  end if;

  return query
  select
    e.occurred_at,
    e.entry_type,
    e.amount_cents,
    e.currency,
    e.category_id,
    coalesce(c.name, 'Uncategorized') as category_name,
    e.description,
    e.reference,
    e.created_at,
    e.updated_at
  from public.finance_entries e
  left join public.finance_categories c
    on c.id = e.category_id
  where e.entity_type = p_entity_type
    and e.entity_id = p_entity_id
    and (e.occurred_at::date between v_from and v_to)
    and (v_type is null or e.entry_type = v_type)
    and (p_category_id is null or e.category_id = p_category_id)
  order by e.occurred_at desc, e.created_at desc
  limit v_lim;

end;
$$;

revoke all on function public.finance_entries_export(text, uuid, date, date, int, text, uuid) from public;
grant execute on function public.finance_entries_export(text, uuid, date, date, int, text, uuid) to authenticated;

commit;
