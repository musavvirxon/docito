-- File: supabase/migrations/20260127190000_app_analytics_billing_indexes.sql
-- Purpose: Fix Account Analytics RPC + add indexes used by Billing/Analytics sections.
-- Notes: Idempotent and safe to re-run.

-- payments
create index if not exists idx_payments_patient_created_at
  on public.payments (patient_id, created_at desc);

create index if not exists idx_payments_patient_status_created_at
  on public.payments (patient_id, status, created_at desc);

-- invoices
create index if not exists idx_invoices_user_created_at
  on public.invoices (user_id, created_at desc);

create index if not exists idx_invoices_user_status_created_at
  on public.invoices (user_id, status, created_at desc);

-- user payment methods
create index if not exists idx_user_payment_methods_user_default
  on public.user_payment_methods (user_id, is_default);

-- Fix: account_analytics RPC used by Billing/Analytics UI.
-- Earlier versions referenced invoices.patient_id (nonexistent). Use invoices.user_id instead.
create or replace function public.account_analytics(p_user_id uuid, p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 30), 1));
  v_doctor_id uuid;

  v_patient_appointments_total int := 0;
  v_patient_appointments_upcoming int := 0;
  v_patient_appointments_completed int := 0;

  v_invoices_count int := 0;
  v_invoices_total_amount numeric := 0;
  v_invoices_paid_amount numeric := 0;
  v_payments_total_amount numeric := 0;

  v_provider_appointments_total int := 0;
  v_provider_appointments_upcoming int := 0;
  v_provider_appointments_completed int := 0;
begin
  select d.id
  into v_doctor_id
  from public.doctors d
  where d.user_id = p_user_id
  limit 1;

  -- Patient-side appointment stats
  select
    count(*)::int,
    count(*) filter (where coalesce(a.status::text, '') in ('scheduled', 'confirmed')
                     and (a.appointment_date::date > current_date
                          or (a.appointment_date::date = current_date and a.start_time::time >= localtime)))::int,
    count(*) filter (where coalesce(a.status::text, '') = 'completed')::int
  into
    v_patient_appointments_total,
    v_patient_appointments_upcoming,
    v_patient_appointments_completed
  from public.appointments a
  where a.patient_id = p_user_id
    and coalesce(a.created_at, now()) >= v_since;

  -- Patient-side billing stats (FIXED: invoices.user_id, not invoices.patient_id)
  select
    count(*)::int,
    coalesce(sum(i.total_amount), 0),
    coalesce(sum(i.total_amount) filter (where i.status = 'paid'), 0)
  into
    v_invoices_count,
    v_invoices_total_amount,
    v_invoices_paid_amount
  from public.invoices i
  where i.user_id = p_user_id
    and coalesce(i.created_at, now()) >= v_since;

  select
    coalesce(sum(p.amount), 0)
  into
    v_payments_total_amount
  from public.payments p
  where p.patient_id = p_user_id
    and p.status = 'paid'
    and coalesce(p.created_at, now()) >= v_since;

  -- Provider-side appointment stats (if the user is a doctor)
  if v_doctor_id is not null then
    select
      count(*)::int,
      count(*) filter (where coalesce(a.status::text, '') in ('scheduled', 'confirmed')
                       and (a.appointment_date::date > current_date
                            or (a.appointment_date::date = current_date and a.start_time::time >= localtime)))::int,
      count(*) filter (where coalesce(a.status::text, '') = 'completed')::int
    into
      v_provider_appointments_total,
      v_provider_appointments_upcoming,
      v_provider_appointments_completed
    from public.appointments a
    where a.doctor_id = v_doctor_id
      and coalesce(a.created_at, now()) >= v_since;
  end if;

  return jsonb_build_object(
    'window_days', greatest(coalesce(p_days, 30), 1),
    'patient', jsonb_build_object(
      'appointments_total', v_patient_appointments_total,
      'appointments_upcoming', v_patient_appointments_upcoming,
      'appointments_completed', v_patient_appointments_completed,
      'invoices_count', v_invoices_count,
      'invoices_total_amount', v_invoices_total_amount,
      'invoices_paid_amount', v_invoices_paid_amount,
      'payments_total_amount', v_payments_total_amount
    ),
    'provider', jsonb_build_object(
      'doctor_id', v_doctor_id,
      'appointments_total', v_provider_appointments_total,
      'appointments_upcoming', v_provider_appointments_upcoming,
      'appointments_completed', v_provider_appointments_completed
    )
  );
end;
$$;

grant execute on function public.account_analytics(uuid, int) to authenticated;
