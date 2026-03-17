
-- Part 1: Core access functions
create or replace function public.can_access_practice(p_practice_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.practices p where p.id = p_practice_id and p.admin_id = auth.uid())
    or exists (select 1 from public.clinic_staff cs where cs.practice_id = p_practice_id and cs.user_id = auth.uid() and coalesce(cs.status, 'active') = 'active')
    or exists (select 1 from public.practice_staff ps where ps.practice_id = p_practice_id and ps.user_id = auth.uid() and coalesce(ps.status, 'active') = 'active')
    or public.has_role(auth.uid(), 'super_admin');
$$;
grant execute on function public.can_access_practice(uuid) to authenticated;

create or replace function public.can_access_entity(p_entity_type text, p_entity_id uuid)
returns boolean language plpgsql stable security definer set search_path = public
as $$
declare et text := lower(coalesce(p_entity_type, ''));
begin
  if et in ('clinic','practice') then return public.can_access_practice(p_entity_id); end if;
  if et = 'lab' then return exists (select 1 from public.lab_centers lc where lc.id = p_entity_id and lc.admin_id = auth.uid()) or exists (select 1 from public.lab_staff ls where ls.lab_center_id = p_entity_id and ls.user_id = auth.uid() and coalesce(ls.status, 'active') = 'active') or public.has_role(auth.uid(), 'super_admin'); end if;
  if et = 'imaging' then return exists (select 1 from public.imaging_centers ic where ic.id = p_entity_id and ic.admin_id = auth.uid()) or exists (select 1 from public.imaging_staff s where s.imaging_center_id = p_entity_id and s.user_id = auth.uid() and coalesce(s.status, 'active') = 'active') or public.has_role(auth.uid(), 'super_admin'); end if;
  if et = 'pharmacy' then return exists (select 1 from public.pharmacies p where p.id = p_entity_id and p.admin_id = auth.uid()) or exists (select 1 from public.pharmacy_staff ps where ps.pharmacy_id = p_entity_id and ps.user_id = auth.uid() and coalesce(ps.status, 'active') = 'active') or public.has_role(auth.uid(), 'super_admin'); end if;
  return false;
end;
$$;
grant execute on function public.can_access_entity(text, uuid) to authenticated;

-- Add updated_by to finance_entries
alter table public.finance_entries add column if not exists updated_by uuid null;

-- Unique partial index for recurring references
do $$ begin
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='finance_entries_recurring_ref_uniq') then
    create unique index finance_entries_recurring_ref_uniq on public.finance_entries(entity_type, entity_id, reference) where reference is not null and reference like 'recurring:%';
  end if;
end $$;

-- Unique index on finance_categories
do $$ begin
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='finance_categories_entity_kind_name_uniq') then
    create unique index finance_categories_entity_kind_name_uniq on public.finance_categories(entity_type, entity_id, kind, lower(name));
  end if;
end $$;

-- finance_category_get_or_create
create or replace function public.finance_category_get_or_create(p_entity_type text, p_entity_id uuid, p_kind text, p_category_id uuid, p_category_name text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_kind text := nullif(btrim(coalesce(p_kind,'')), ''); v_name text := nullif(btrim(coalesce(p_category_name,'')), ''); v_id uuid := p_category_id; v_found uuid;
begin
  if v_kind is null or v_kind not in ('income','expense','payroll') then raise exception 'Invalid kind'; end if;
  if v_id is not null then
    select c.id into v_found from public.finance_categories c where c.id = v_id and c.entity_type = p_entity_type and c.entity_id = p_entity_id and c.kind = v_kind limit 1;
    if v_found is null then raise exception 'Invalid category_id'; end if;
    return v_found;
  end if;
  if v_name is null then return null; end if;
  select c.id into v_found from public.finance_categories c where c.entity_type = p_entity_type and c.entity_id = p_entity_id and c.kind = v_kind and lower(c.name) = lower(v_name) limit 1;
  if v_found is not null then return v_found; end if;
  insert into public.finance_categories(entity_type, entity_id, kind, name) values (p_entity_type, p_entity_id, v_kind, v_name)
  on conflict (entity_type, entity_id, kind, lower(name)) do update set name = excluded.name returning id into v_found;
  return v_found;
end;
$$;
grant execute on function public.finance_category_get_or_create(text, uuid, text, uuid, text) to authenticated;
grant execute on function public.finance_category_get_or_create(text, uuid, text, uuid, text) to service_role;

-- finance_entry_upsert_manual
create or replace function public.finance_entry_upsert_manual(p_entity_type text, p_entity_id uuid, p_entry_id uuid, p_entry_type text, p_amount_cents bigint, p_currency text, p_occurred_at timestamptz, p_category_id uuid default null, p_category_name text default null, p_description text default null, p_reference text default null)
returns table (entry_id uuid) language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_role text := auth.role(); v_type text := nullif(btrim(coalesce(p_entry_type,'')), ''); v_cur text := upper(nullif(btrim(coalesce(p_currency,'')), '')); v_desc text := nullif(btrim(coalesce(p_description,'')), ''); v_ref text := nullif(btrim(coalesce(p_reference,'')), ''); v_cat uuid; v_id uuid; v_is_recurring boolean := false;
begin
  if v_uid is null and v_role <> 'service_role' then raise exception 'Unauthorized'; end if;
  if p_entity_type is null or btrim(p_entity_type) = '' then raise exception 'entity_type required'; end if;
  if p_entity_id is null then raise exception 'entity_id required'; end if;
  if v_role <> 'service_role' then if not public.can_access_entity(p_entity_type, p_entity_id) then raise exception 'Forbidden'; end if; end if;
  if v_type is null or v_type not in ('income','expense','payroll') then raise exception 'Invalid entry_type'; end if;
  if p_amount_cents is null then raise exception 'amount required'; end if;
  if v_cur is null then v_cur := 'USD'; end if;
  v_is_recurring := (v_ref is not null and v_ref like 'recurring:%');
  v_cat := public.finance_category_get_or_create(p_entity_type, p_entity_id, v_type, p_category_id, p_category_name);
  if p_entry_id is not null then
    update public.finance_entries set entry_type = v_type, amount_cents = p_amount_cents, currency = v_cur, occurred_at = coalesce(p_occurred_at, occurred_at), category_id = v_cat, description = v_desc, reference = v_ref, updated_at = now(), updated_by = v_uid where id = p_entry_id and entity_type = p_entity_type and entity_id = p_entity_id returning id into v_id;
    if v_id is null then raise exception 'Failed to update entry'; end if;
    return query select v_id; return;
  end if;
  if v_is_recurring then
    insert into public.finance_entries(entity_type, entity_id, entry_type, amount_cents, currency, occurred_at, category_id, description, reference, created_by, updated_by) values (p_entity_type, p_entity_id, v_type, p_amount_cents, v_cur, coalesce(p_occurred_at, now()), v_cat, v_desc, v_ref, v_uid, v_uid)
    on conflict (entity_type, entity_id, reference) where reference is not null and reference like 'recurring:%'
    do update set entry_type = excluded.entry_type, amount_cents = excluded.amount_cents, currency = excluded.currency, occurred_at = excluded.occurred_at, category_id = excluded.category_id, description = excluded.description, updated_at = now(), updated_by = coalesce(auth.uid(), public.finance_entries.updated_by) returning id into v_id;
    if v_id is null then select e.id into v_id from public.finance_entries e where e.entity_type = p_entity_type and e.entity_id = p_entity_id and e.reference = v_ref limit 1; end if;
    if v_id is null then raise exception 'Failed to upsert'; end if;
    return query select v_id; return;
  end if;
  insert into public.finance_entries(entity_type, entity_id, entry_type, amount_cents, currency, occurred_at, category_id, description, reference, created_by, updated_by) values (p_entity_type, p_entity_id, v_type, p_amount_cents, v_cur, coalesce(p_occurred_at, now()), v_cat, v_desc, v_ref, v_uid, v_uid) returning id into v_id;
  if v_id is null then raise exception 'Failed to create entry'; end if;
  return query select v_id;
end;
$$;
revoke all on function public.finance_entry_upsert_manual(text, uuid, uuid, text, bigint, text, timestamptz, uuid, text, text, text) from public;
grant execute on function public.finance_entry_upsert_manual(text, uuid, uuid, text, bigint, text, timestamptz, uuid, text, text, text) to authenticated;
grant execute on function public.finance_entry_upsert_manual(text, uuid, uuid, text, bigint, text, timestamptz, uuid, text, text, text) to service_role;

notify pgrst, 'reload schema';
