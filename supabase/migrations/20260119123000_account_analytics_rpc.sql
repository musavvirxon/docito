-- File: supabase/migrations/20260119123000_account_analytics_rpc.sql

begin;

-- Aggregated account analytics for the currently authenticated user.
-- NOTE: This function is SECURITY DEFINER so it can read across RLS-protected tables.

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

  -- Patient-side billing stats
  select
    count(*)::int,
    coalesce(sum(i.total_amount), 0),
    coalesce(sum(i.total_amount) filter (where i.status = 'paid'), 0)
  into
    v_invoices_count,
    v_invoices_total_amount,
    v_invoices_paid_amount
  from public.invoices i
  where i.patient_id = p_user_id
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

commit;
