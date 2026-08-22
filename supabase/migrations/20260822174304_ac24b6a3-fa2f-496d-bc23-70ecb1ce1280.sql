-- 1) helper: access to any entity by id
create or replace function public.can_access_any_entity(p_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.can_access_entity('clinic', p_entity_id)
      or public.can_access_entity('lab', p_entity_id)
      or public.can_access_entity('imaging', p_entity_id)
      or public.can_access_entity('pharmacy', p_entity_id);
$$;
revoke all on function public.can_access_any_entity(uuid) from public, anon;
grant execute on function public.can_access_any_entity(uuid) to authenticated, service_role;

-- 2) inventory scoping
drop policy if exists inventory_authenticated on public.clinic_inventory;
create policy inventory_entity_scoped on public.clinic_inventory
  for all to authenticated
  using (public.can_access_any_entity(entity_id))
  with check (public.can_access_any_entity(entity_id));

drop policy if exists inventory_logs_authenticated on public.clinic_inventory_logs;
create policy inventory_logs_entity_scoped on public.clinic_inventory_logs
  for all to authenticated
  using (public.can_access_any_entity(entity_id))
  with check (public.can_access_any_entity(entity_id));

drop policy if exists proc_inv_req_authenticated on public.procedure_inventory_requirements;
create policy proc_inv_req_entity_scoped on public.procedure_inventory_requirements
  for all to authenticated
  using (public.can_access_any_entity(entity_id))
  with check (public.can_access_any_entity(entity_id));

-- 3) remove overly broad appointment insert policy
drop policy if exists "Authenticated users can create appointments" on public.appointments;

-- 4) practice schedule settings read scoping
drop policy if exists practice_schedule_settings_select_authenticated on public.practice_schedule_settings;
create policy practice_schedule_settings_select_scoped on public.practice_schedule_settings
  for select to authenticated
  using (
    public.can_access_practice(practice_id)
    or exists (
      select 1 from public.appointments a
      where a.practice_id = practice_schedule_settings.practice_id
        and a.patient_id = auth.uid()
    )
    or exists (
      select 1 from public.doctors d
      where d.user_id = auth.uid() and d.practice_id = practice_schedule_settings.practice_id
    )
  );

-- 5) time-bound patient profile visibility
create or replace function public.doctor_can_view_patient_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  SELECT EXISTS (
    SELECT 1
    FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    WHERE a.patient_id = target_user_id
      AND d.user_id = auth.uid()
      AND a.appointment_date >= (current_date - interval '18 months')
  )
$$;

create or replace function public.staff_can_view_patient_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  SELECT EXISTS (
    SELECT 1
    FROM clinic_staff cs
    JOIN appointments a ON a.practice_id = cs.practice_id
    WHERE cs.user_id = auth.uid()
      AND a.patient_id = target_user_id
      AND cs.status = 'active'
      AND a.appointment_date >= (current_date - interval '18 months')
  )
$$;

-- 6) pin mutable search_path
alter function public.set_updated_at() set search_path to 'public';

-- 7) revoke anon execute on security definer functions except intentionally public ones
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as sig, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.prorettype <> 'trigger'::regtype
      and has_function_privilege('anon', p.oid, 'execute')
      and p.proname not in (
        'get_public_doctor_profile','get_public_doctor_profiles','list_public_doctor_profiles',
        'get_queue_display','get_consultation_by_guest_token','fetch_available_slots',
        'get_staff_invitation_by_token','check_user_exists','get_practice_locations',
        'get_doctors_by_insurance','update_popular_search','get_admin_video_booking_status',
        'has_role','can_access_practice','can_access_entity'
      )
  loop
    execute format('revoke execute on function %s from anon', r.sig);
  end loop;
end $$;

-- 8) revoke execute from anon/authenticated on trigger + internal maintenance functions
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (
        p.prorettype = 'trigger'::regtype
        or p.proname in (
          'grant_super_admin_to_authorized_emails','rls_auto_enable','cleanup_rate_limits',
          'cleanup_expired_appointment_holds','refresh_all_ratings',
          'update_doctor_weighted_ratings','update_practice_weighted_ratings',
          'update_appointment_counts','update_user_role','next_invoice_number'
        )
      )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;