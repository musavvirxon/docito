
-- Create tables only
create table if not exists public.finance_recurring_rules (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null, entity_id uuid not null,
  entry_type text not null check (entry_type in ('income','expense','payroll')),
  category_id uuid null, category_name text null,
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'USD', description text null,
  schedule text not null check (schedule in ('daily','weekly','monthly')),
  interval_n int not null default 1 check (interval_n >= 1),
  day_of_week int null check (day_of_week between 0 and 6),
  day_of_month int null check (day_of_month between 1 and 28),
  start_date date not null default current_date, end_date date null,
  next_run_date date not null, active boolean not null default true,
  created_at timestamptz not null default now(), created_by uuid null default auth.uid(),
  updated_at timestamptz not null default now(), updated_by uuid null default auth.uid()
);
create index if not exists finance_recurring_rules_entity_next_idx on public.finance_recurring_rules(entity_type, entity_id, active, next_run_date);
alter table public.finance_recurring_rules enable row level security;
drop policy if exists "finance_recurring_rules_select" on public.finance_recurring_rules;
drop policy if exists "finance_recurring_rules_insert" on public.finance_recurring_rules;
drop policy if exists "finance_recurring_rules_update" on public.finance_recurring_rules;
drop policy if exists "finance_recurring_rules_delete" on public.finance_recurring_rules;
create policy "finance_recurring_rules_select" on public.finance_recurring_rules for select to authenticated using (public.can_access_entity(entity_type, entity_id));
create policy "finance_recurring_rules_insert" on public.finance_recurring_rules for insert to authenticated with check (public.can_access_entity(entity_type, entity_id));
create policy "finance_recurring_rules_update" on public.finance_recurring_rules for update to authenticated using (public.can_access_entity(entity_type, entity_id)) with check (public.can_access_entity(entity_type, entity_id));
create policy "finance_recurring_rules_delete" on public.finance_recurring_rules for delete to authenticated using (public.can_access_entity(entity_type, entity_id));
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='finance_recurring_rules' and policyname='finance_recurring_rules_service_all') then create policy "finance_recurring_rules_service_all" on public.finance_recurring_rules for all to service_role using (true) with check (true); end if; end $$;

create table if not exists public.finance_recurring_entity_runs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null, entity_id uuid not null,
  source text not null check (source in ('pg_cron','edge_cron','manual')),
  as_of date not null default current_date,
  started_at timestamptz not null default now(), finished_at timestamptz null,
  created_count int not null default 0, skipped_count int not null default 0, error_count int not null default 0,
  notes text null, created_at timestamptz not null default now()
);
create index if not exists finance_recurring_entity_runs_entity_started_idx on public.finance_recurring_entity_runs(entity_type, entity_id, started_at desc);
alter table public.finance_recurring_entity_runs enable row level security;
drop policy if exists "finance_recurring_entity_runs_select" on public.finance_recurring_entity_runs;
drop policy if exists "finance_recurring_entity_runs_insert" on public.finance_recurring_entity_runs;
create policy "finance_recurring_entity_runs_select" on public.finance_recurring_entity_runs for select to authenticated using (public.can_access_entity(entity_type, entity_id));
create policy "finance_recurring_entity_runs_insert" on public.finance_recurring_entity_runs for insert to authenticated with check (public.can_access_entity(entity_type, entity_id));
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='finance_recurring_entity_runs' and policyname='finance_recurring_entity_runs_update') then create policy "finance_recurring_entity_runs_update" on public.finance_recurring_entity_runs for update to authenticated using (public.can_access_entity(entity_type, entity_id)); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='finance_recurring_entity_runs' and policyname='finance_recurring_entity_runs_service_all') then create policy "finance_recurring_entity_runs_service_all" on public.finance_recurring_entity_runs for all to service_role using (true) with check (true); end if;
end $$;

create table if not exists public.finance_recurring_rule_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.finance_recurring_rules(id) on delete cascade,
  run_date date not null, status text not null check (status in ('created','skipped','error')),
  finance_entry_id uuid null, error text null,
  entity_run_id uuid null references public.finance_recurring_entity_runs(id) on delete set null,
  created_at timestamptz not null default now(), created_by uuid null default auth.uid()
);
do $$ begin
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='finance_recurring_rule_runs_rule_date_unique') then create unique index finance_recurring_rule_runs_rule_date_unique on public.finance_recurring_rule_runs(rule_id, run_date); end if;
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='finance_recurring_rule_runs_entity_run_idx') then create index finance_recurring_rule_runs_entity_run_idx on public.finance_recurring_rule_runs(entity_run_id, created_at desc); end if;
end $$;
alter table public.finance_recurring_rule_runs enable row level security;
drop policy if exists "finance_recurring_rule_runs_select" on public.finance_recurring_rule_runs;
drop policy if exists "finance_recurring_rule_runs_insert" on public.finance_recurring_rule_runs;
create policy "finance_recurring_rule_runs_select" on public.finance_recurring_rule_runs for select to authenticated using (exists (select 1 from public.finance_recurring_rules r where r.id = rule_id and public.can_access_entity(r.entity_type, r.entity_id)));
create policy "finance_recurring_rule_runs_insert" on public.finance_recurring_rule_runs for insert to authenticated with check (exists (select 1 from public.finance_recurring_rules r where r.id = rule_id and public.can_access_entity(r.entity_type, r.entity_id)));
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='finance_recurring_rule_runs' and policyname='finance_recurring_rule_runs_service_all') then create policy "finance_recurring_rule_runs_service_all" on public.finance_recurring_rule_runs for all to service_role using (true) with check (true); end if; end $$;

-- Helper functions
create or replace function public.finance_recurring_first_run_date(p_schedule text, p_start_date date, p_day_of_week int, p_day_of_month int) returns date language plpgsql security definer set search_path = public as $$ declare v_sched text := nullif(btrim(coalesce(p_schedule,'')), ''); v_start date := coalesce(p_start_date, current_date); v_run date; v_attempt int := 0; begin if v_sched = 'daily' then return v_start; end if; if v_sched = 'weekly' then if p_day_of_week is null or p_day_of_week < 0 or p_day_of_week > 6 then raise exception 'day_of_week required'; end if; v_run := v_start; while extract(dow from v_run)::int <> p_day_of_week and v_attempt < 14 loop v_run := v_run + interval '1 day'; v_attempt := v_attempt + 1; end loop; return v_run; end if; if v_sched = 'monthly' then if p_day_of_month is null or p_day_of_month < 1 or p_day_of_month > 28 then raise exception 'day_of_month required'; end if; v_run := make_date(extract(year from v_start)::int, extract(month from v_start)::int, p_day_of_month); if v_run < v_start then v_run := make_date(extract(year from (v_start + interval '1 month'))::int, extract(month from (v_start + interval '1 month'))::int, p_day_of_month); end if; return v_run; end if; raise exception 'Invalid schedule'; end; $$;
grant execute on function public.finance_recurring_first_run_date(text, date, int, int) to authenticated;

create or replace function public.finance_recurring_next_run_date(p_schedule text, p_interval_n int, p_current_run date, p_day_of_month int) returns date language plpgsql security definer set search_path = public as $$ declare v_sched text := nullif(btrim(coalesce(p_schedule,'')), ''); v_int int := greatest(coalesce(p_interval_n, 1), 1); v_cur date := coalesce(p_current_run, current_date); v_dom int := coalesce(p_day_of_month, 1); v_next date; begin if v_sched = 'daily' then return v_cur + (v_int || ' days')::interval; end if; if v_sched = 'weekly' then return v_cur + (v_int * 7 || ' days')::interval; end if; if v_sched = 'monthly' then if v_dom < 1 then v_dom := 1; end if; if v_dom > 28 then v_dom := 28; end if; v_next := (v_cur + (v_int || ' months')::interval)::date; return make_date(extract(year from v_next)::int, extract(month from v_next)::int, v_dom); end if; raise exception 'Invalid schedule'; end; $$;
grant execute on function public.finance_recurring_next_run_date(text, int, date, int) to authenticated;

-- finance_recurring_generate_due_v2
create or replace function public.finance_recurring_generate_due_v2(p_entity_type text, p_entity_id uuid, p_as_of date default current_date, p_entity_run_id uuid default null) returns table (rule_id uuid, run_date date, status text, finance_entry_id uuid) language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_role text := auth.role(); v_as_of date := coalesce(p_as_of, current_date); r record; v_run_date date; v_ref text; v_existing uuid; v_fin uuid; v_cat_id uuid; v_rule_attempts int; v_total_attempts int := 0; v_rule_cap int := 50; v_total_cap int := 300;
begin
  if v_uid is null and v_role <> 'service_role' then raise exception 'Unauthorized'; end if;
  if p_entity_type is null or btrim(p_entity_type) = '' then raise exception 'entity_type required'; end if;
  if p_entity_id is null then raise exception 'entity_id required'; end if;
  if v_role <> 'service_role' then if not public.can_access_entity(p_entity_type, p_entity_id) then raise exception 'Forbidden'; end if; end if;
  if p_entity_run_id is not null then if not exists (select 1 from public.finance_recurring_entity_runs er where er.id = p_entity_run_id and er.entity_type = p_entity_type and er.entity_id = p_entity_id) then raise exception 'Invalid entity_run_id'; end if; end if;
  for r in select * from public.finance_recurring_rules rr where rr.entity_type = p_entity_type and rr.entity_id = p_entity_id and rr.active = true and rr.next_run_date <= v_as_of and rr.start_date <= v_as_of and (rr.end_date is null or rr.end_date >= rr.next_run_date) order by rr.next_run_date asc
  loop
    v_rule_attempts := 0;
    while r.next_run_date <= v_as_of loop
      exit when v_rule_attempts >= v_rule_cap; exit when v_total_attempts >= v_total_cap;
      v_run_date := r.next_run_date;
      if r.end_date is not null and v_run_date > r.end_date then
        insert into public.finance_recurring_rule_runs(rule_id, run_date, status, error, created_by, entity_run_id) values (r.id, v_run_date, 'skipped', 'End date reached', v_uid, p_entity_run_id) on conflict (rule_id, run_date) do nothing;
        return query select r.id, v_run_date, 'skipped'::text, null::uuid;
        update public.finance_recurring_rules set next_run_date = public.finance_recurring_next_run_date(r.schedule, r.interval_n, v_run_date, r.day_of_month), updated_at = now(), updated_by = v_uid where id = r.id returning * into r;
        v_rule_attempts := v_rule_attempts + 1; v_total_attempts := v_total_attempts + 1; continue;
      end if;
      v_ref := 'recurring:' || r.id::text || ':' || v_run_date::text;
      select fr.finance_entry_id into v_existing from public.finance_recurring_rule_runs fr where fr.rule_id = r.id and fr.run_date = v_run_date and fr.status = 'created' limit 1;
      if v_existing is not null then
        if p_entity_run_id is not null then insert into public.finance_recurring_rule_runs(rule_id, run_date, status, finance_entry_id, created_by, entity_run_id) values (r.id, v_run_date, 'skipped', v_existing, v_uid, p_entity_run_id) on conflict (rule_id, run_date) do update set entity_run_id = coalesce(public.finance_recurring_rule_runs.entity_run_id, excluded.entity_run_id); end if;
        return query select r.id, v_run_date, 'skipped'::text, v_existing;
        update public.finance_recurring_rules set next_run_date = public.finance_recurring_next_run_date(r.schedule, r.interval_n, v_run_date, r.day_of_month), updated_at = now(), updated_by = v_uid where id = r.id returning * into r;
        v_rule_attempts := v_rule_attempts + 1; v_total_attempts := v_total_attempts + 1; continue;
      end if;
      v_fin := null;
      begin select e.id into v_fin from public.finance_entries e where e.entity_type = p_entity_type and e.entity_id = p_entity_id and e.reference = v_ref limit 1; exception when others then v_fin := null; end;
      if v_fin is null then
        v_cat_id := r.category_id;
        select (x.entry_id)::uuid into v_fin from public.finance_entry_upsert_manual(p_entity_type := p_entity_type, p_entity_id := p_entity_id, p_entry_id := null, p_entry_type := r.entry_type, p_amount_cents := r.amount_cents, p_currency := r.currency, p_occurred_at := (v_run_date::timestamptz + interval '12 hours'), p_category_id := v_cat_id, p_category_name := r.category_name, p_description := coalesce(r.description, 'Recurring ' || r.entry_type), p_reference := v_ref) as x;
      end if;
      if v_fin is null then
        insert into public.finance_recurring_rule_runs(rule_id, run_date, status, error, created_by, entity_run_id) values (r.id, v_run_date, 'error', 'Failed to create entry', v_uid, p_entity_run_id) on conflict (rule_id, run_date) do update set status = excluded.status, error = excluded.error, entity_run_id = excluded.entity_run_id;
        return query select r.id, v_run_date, 'error'::text, null::uuid;
        update public.finance_recurring_rules set next_run_date = public.finance_recurring_next_run_date(r.schedule, r.interval_n, v_run_date, r.day_of_month), updated_at = now(), updated_by = v_uid where id = r.id returning * into r;
        v_rule_attempts := v_rule_attempts + 1; v_total_attempts := v_total_attempts + 1; continue;
      end if;
      insert into public.finance_recurring_rule_runs(rule_id, run_date, status, finance_entry_id, created_by, entity_run_id) values (r.id, v_run_date, 'created', v_fin, v_uid, p_entity_run_id) on conflict (rule_id, run_date) do update set status = excluded.status, finance_entry_id = excluded.finance_entry_id, error = null, entity_run_id = excluded.entity_run_id;
      return query select r.id, v_run_date, 'created'::text, v_fin;
      update public.finance_recurring_rules set next_run_date = public.finance_recurring_next_run_date(r.schedule, r.interval_n, v_run_date, r.day_of_month), updated_at = now(), updated_by = v_uid where id = r.id returning * into r;
      v_rule_attempts := v_rule_attempts + 1; v_total_attempts := v_total_attempts + 1;
    end loop;
  end loop;
  return;
end; $$;
revoke all on function public.finance_recurring_generate_due_v2(text, uuid, date, uuid) from public;
grant execute on function public.finance_recurring_generate_due_v2(text, uuid, date, uuid) to authenticated;
grant execute on function public.finance_recurring_generate_due_v2(text, uuid, date, uuid) to service_role;

notify pgrst, 'reload schema';
