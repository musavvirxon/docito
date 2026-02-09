-- File: supabase/migrations/20260207204000_finance_analytics_rpcs.sql
-- B21: Finance analytics RPCs (monthly series + category totals)
-- Idempotent: CREATE OR REPLACE, safe grants

begin;

create or replace function public.finance_analytics_monthly(
  p_entity_type text,
  p_entity_id uuid,
  p_date_from timestamptz,
  p_date_to timestamptz
)
returns table (
  month timestamptz,
  entry_type text,
  amount_cents bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_from timestamptz := coalesce(p_date_from, (now() - interval '180 days'));
  v_to   timestamptz := coalesce(p_date_to, now());
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

  return query
  select
    date_trunc('month', e.occurred_at)::timestamptz as month,
    e.entry_type::text as entry_type,
    sum(e.amount_cents)::bigint as amount_cents
  from public.finance_entries e
  where e.entity_type = p_entity_type
    and e.entity_id = p_entity_id
    and e.occurred_at >= v_from
    and e.occurred_at <= v_to
  group by 1, 2
  order by 1 asc, 2 asc;
end;
$$;

revoke all on function public.finance_analytics_monthly(text, uuid, timestamptz, timestamptz) from public;
grant execute on function public.finance_analytics_monthly(text, uuid, timestamptz, timestamptz) to authenticated;

create or replace function public.finance_analytics_category_totals(
  p_entity_type text,
  p_entity_id uuid,
  p_date_from timestamptz,
  p_date_to timestamptz,
  p_entry_type text
)
returns table (
  category_id uuid,
  category_name text,
  entry_type text,
  amount_cents bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_from timestamptz := coalesce(p_date_from, (now() - interval '180 days'));
  v_to   timestamptz := coalesce(p_date_to, now());
  v_entry text := nullif(btrim(coalesce(p_entry_type, '')), '');
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

  if v_entry is not null and v_entry not in ('income','expense','payroll') then
    raise exception 'Invalid entry_type';
  end if;

  return query
  with base as (
    select
      e.category_id,
      e.entry_type::text as entry_type,
      sum(e.amount_cents)::bigint as amount_cents
    from public.finance_entries e
    where e.entity_type = p_entity_type
      and e.entity_id = p_entity_id
      and e.occurred_at >= v_from
      and e.occurred_at <= v_to
      and (v_entry is null or e.entry_type::text = v_entry)
    group by 1, 2
  )
  select
    b.category_id,
    coalesce(c.name, 'Uncategorized') as category_name,
    b.entry_type,
    b.amount_cents
  from base b
  left join public.finance_categories c
    on c.id = b.category_id
   and c.entity_type = p_entity_type
   and c.entity_id = p_entity_id
  order by b.entry_type asc, b.amount_cents desc;
end;
$$;

revoke all on function public.finance_analytics_category_totals(text, uuid, timestamptz, timestamptz, text) from public;
grant execute on function public.finance_analytics_category_totals(text, uuid, timestamptz, timestamptz, text) to authenticated;

commit;
