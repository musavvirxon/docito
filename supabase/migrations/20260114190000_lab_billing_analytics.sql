-- 20260114190000_lab_billing_analytics.sql

-- 1) Claims table (for Lab Billing)
create table if not exists public.lab_insurance_claims (
  id uuid primary key default gen_random_uuid(),
  lab_center_id uuid not null references public.lab_centers(id) on delete cascade,
  test_order_id uuid references public.test_orders(id) on delete set null,
  patient_id uuid references auth.users(id) on delete set null,
  insurance_provider_id uuid references public.insurance_providers(id) on delete set null,

  policy_number text,
  claim_amount numeric(10,2) not null default 0,
  approved_amount numeric(10,2),
  copay_amount numeric(10,2),

  status text not null default 'pending', -- pending | submitted | approved | rejected | paid
  submitted_at timestamptz,
  processed_at timestamptz,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lab_insurance_claims_lab_center on public.lab_insurance_claims(lab_center_id);
create index if not exists idx_lab_insurance_claims_test_order on public.lab_insurance_claims(test_order_id);
create index if not exists idx_lab_insurance_claims_status on public.lab_insurance_claims(status);
create index if not exists idx_lab_insurance_claims_created_at on public.lab_insurance_claims(created_at);

alter table public.lab_insurance_claims enable row level security;

-- keep updated_at fresh (uses your existing public.set_updated_at() trigger function)
drop trigger if exists trg_lab_insurance_claims_updated_at on public.lab_insurance_claims;
create trigger trg_lab_insurance_claims_updated_at
before update on public.lab_insurance_claims
for each row execute function public.set_updated_at();

-- RLS: lab admin OR lab staff can read/write
drop policy if exists "lab_claims_select" on public.lab_insurance_claims;
create policy "lab_claims_select"
on public.lab_insurance_claims
for select
to authenticated
using (
  exists (
    select 1 from public.lab_centers lc
    where lc.id = lab_insurance_claims.lab_center_id
      and lc.admin_id = auth.uid()
  )
  or exists (
    select 1 from public.lab_staff ls
    where ls.lab_center_id = lab_insurance_claims.lab_center_id
      and ls.user_id = auth.uid()
  )
);

drop policy if exists "lab_claims_insert" on public.lab_insurance_claims;
create policy "lab_claims_insert"
on public.lab_insurance_claims
for insert
to authenticated
with check (
  exists (
    select 1 from public.lab_centers lc
    where lc.id = lab_insurance_claims.lab_center_id
      and lc.admin_id = auth.uid()
  )
  or exists (
    select 1 from public.lab_staff ls
    where ls.lab_center_id = lab_insurance_claims.lab_center_id
      and ls.user_id = auth.uid()
  )
);

drop policy if exists "lab_claims_update" on public.lab_insurance_claims;
create policy "lab_claims_update"
on public.lab_insurance_claims
for update
to authenticated
using (
  exists (
    select 1 from public.lab_centers lc
    where lc.id = lab_insurance_claims.lab_center_id
      and lc.admin_id = auth.uid()
  )
  or exists (
    select 1 from public.lab_staff ls
    where ls.lab_center_id = lab_insurance_claims.lab_center_id
      and ls.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.lab_centers lc
    where lc.id = lab_insurance_claims.lab_center_id
      and lc.admin_id = auth.uid()
  )
  or exists (
    select 1 from public.lab_staff ls
    where ls.lab_center_id = lab_insurance_claims.lab_center_id
      and ls.user_id = auth.uid()
  )
);

-- Dashboard-friendly view (matches your UI fields)
drop view if exists public.lab_insurance_claims_view;
create view public.lab_insurance_claims_view as
select
  c.id,
  c.lab_center_id,
  coalesce(o.order_number, c.test_order_id::text) as order_id,
  coalesce(o.patient_snapshot_full_name, o.patient_name, p.full_name, '') as patient_name,
  coalesce(ip.name, '') as insurance_provider,
  c.policy_number,
  c.claim_amount,
  c.approved_amount,
  c.copay_amount,
  c.status,
  c.submitted_at,
  c.processed_at,
  c.notes,
  c.created_at,
  c.updated_at
from public.lab_insurance_claims c
left join public.test_orders o on o.id = c.test_order_id
left join public.insurance_providers ip on ip.id = c.insurance_provider_id
left join public.profiles p on p.user_id = c.patient_id;

-- 2) Analytics RPC (Edge function will call this)
create or replace function public.get_lab_analytics(p_lab_center_id uuid, p_days int default 7)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_prev_start timestamptz;
  v_prev_end timestamptz;

  v_total_revenue numeric := 0;
  v_total_tests int := 0;
  v_avg_turnaround numeric := 0;
  v_recollection_rate numeric := 0;

  v_prev_revenue numeric := 0;
  v_prev_tests int := 0;

  v_revenue_change numeric := 0;
  v_tests_change numeric := 0;

  v_revenue_series jsonb := '[]'::jsonb;
  v_top_tests jsonb := '[]'::jsonb;
  v_status_breakdown jsonb := '[]'::jsonb;
begin
  if p_days is null or p_days not in (7,30,90) then
    raise exception 'invalid_days';
  end if;

  -- Access control (lab admin OR staff)
  if not (
    exists (select 1 from public.lab_centers lc where lc.id = p_lab_center_id and lc.admin_id = auth.uid())
    or exists (select 1 from public.lab_staff ls where ls.lab_center_id = p_lab_center_id and ls.user_id = auth.uid())
  ) then
    raise exception 'not_authorized';
  end if;

  v_start := now() - make_interval(days => p_days);
  v_prev_end := v_start;
  v_prev_start := v_prev_end - make_interval(days => p_days);

  -- Revenue + tests (completed orders)
  select
    coalesce(sum(coalesce(o.total_amount,0)),0),
    count(*)
  into v_total_revenue, v_total_tests
  from public.test_orders o
  where o.lab_center_id = p_lab_center_id
    and o.created_at >= v_start
    and (o.status in ('completed') or o.completed_at is not null);

  -- Avg turnaround hours (completed_at - sample_collected_at)
  select
    coalesce(avg(extract(epoch from (o.completed_at - o.sample_collected_at)) / 3600.0),0)
  into v_avg_turnaround
  from public.test_orders o
  where o.lab_center_id = p_lab_center_id
    and o.created_at >= v_start
    and o.completed_at is not null
    and o.sample_collected_at is not null;

  -- Recollection rate (if your statuses ever start with "recollect")
  select
    case when count(*) = 0 then 0
    else round(100.0 * sum(case when coalesce(o.status,'') ilike 'recollect%' then 1 else 0 end)::numeric / count(*)::numeric, 2)
    end
  into v_recollection_rate
  from public.test_orders o
  where o.lab_center_id = p_lab_center_id
    and o.created_at >= v_start;

  -- Previous period for % change
  select
    coalesce(sum(coalesce(o.total_amount,0)),0),
    count(*)
  into v_prev_revenue, v_prev_tests
  from public.test_orders o
  where o.lab_center_id = p_lab_center_id
    and o.created_at >= v_prev_start
    and o.created_at < v_prev_end
    and (o.status in ('completed') or o.completed_at is not null);

  if v_prev_revenue > 0 then
    v_revenue_change := round(((v_total_revenue - v_prev_revenue) / v_prev_revenue) * 100.0, 1);
  else
    v_revenue_change := case when v_total_revenue > 0 then 100 else 0 end;
  end if;

  if v_prev_tests > 0 then
    v_tests_change := round(((v_total_tests - v_prev_tests)::numeric / v_prev_tests::numeric) * 100.0, 1);
  else
    v_tests_change := case when v_total_tests > 0 then 100 else 0 end;
  end if;

  -- Daily series
  select coalesce(jsonb_agg(jsonb_build_object(
    'date', to_char(day, 'Mon DD'),
    'revenue', revenue,
    'tests', tests
  ) order by day), '[]'::jsonb)
  into v_revenue_series
  from (
    select
      date_trunc('day', o.created_at)::date as day,
      coalesce(sum(coalesce(o.total_amount,0)),0)::numeric as revenue,
      count(*)::int as tests
    from public.test_orders o
    where o.lab_center_id = p_lab_center_id
      and o.created_at >= v_start
    group by 1
  ) s;

  -- Top tests (by count, revenue from item.price)
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', name,
    'count', cnt,
    'revenue', revenue
  ) order by cnt desc), '[]'::jsonb)
  into v_top_tests
  from (
    select
      tc.name as name,
      count(*)::int as cnt,
      coalesce(sum(coalesce(toi.price,0)),0)::numeric as revenue
    from public.test_order_items toi
    join public.test_orders o on o.id = toi.test_order_id
    join public.test_catalog tc on tc.id = toi.test_id
    where o.lab_center_id = p_lab_center_id
      and toi.created_at >= v_start
    group by tc.name
    order by cnt desc
    limit 5
  ) t;

  -- Status breakdown
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', initcap(coalesce(status,'unknown')),
    'value', cnt
  ) order by cnt desc), '[]'::jsonb)
  into v_status_breakdown
  from (
    select
      coalesce(o.status,'unknown') as status,
      count(*)::int as cnt
    from public.test_orders o
    where o.lab_center_id = p_lab_center_id
      and o.created_at >= v_start
    group by 1
  ) sb;

  return jsonb_build_object(
    'stats', jsonb_build_object(
      'totalRevenue', v_total_revenue,
      'totalTests', v_total_tests,
      'avgTurnaround', round(v_avg_turnaround::numeric, 1),
      'recollectionRate', v_recollection_rate,
      'revenueChange', v_revenue_change,
      'testsChange', v_tests_change
    ),
    'revenueData', v_revenue_series,
    'topTests', v_top_tests,
    'testsByStatus', v_status_breakdown
  );
end;
$$;

revoke all on function public.get_lab_analytics(uuid,int) from public;
grant execute on function public.get_lab_analytics(uuid,int) to authenticated;
