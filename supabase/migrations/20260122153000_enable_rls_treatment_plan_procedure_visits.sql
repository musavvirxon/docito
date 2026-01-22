begin;

-- 1) Enable RLS (and FORCE RLS) to prevent accidental bypass
alter table if exists public.treatment_plan_procedure_visits enable row level security;
alter table if exists public.treatment_plan_procedure_visits force row level security;

do $$
begin
  -- SELECT
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'treatment_plan_procedure_visits'
      and policyname = 'tpv_select_authorized'
  ) then
    execute 'drop policy tpv_select_authorized on public.treatment_plan_procedure_visits';
  end if;

  execute $pol$
    create policy tpv_select_authorized
    on public.treatment_plan_procedure_visits
    for select
    to authenticated
    using (
      -- Admin override
      exists (
        select 1
        from public.profiles p
        where p.user_id = auth.uid()
          and coalesce(p.role, '') in ('super_admin', 'admin')
      )
      or
      -- Patient access via treatment plan ownership
      exists (
        select 1
        from public.treatment_plan_procedures tpp
        join public.treatment_plans tp
          on tp.id = tpp.treatment_plan_id
        where tpp.id = public.treatment_plan_procedure_visits.treatment_plan_procedure_id
          and tp.patient_id = auth.uid()
      )
      or
      -- Patient access via appointment.patient_id
      exists (
        select 1
        from public.appointments a
        where a.id = public.treatment_plan_procedure_visits.appointment_id
          and a.patient_id = auth.uid()
      )
      or
      -- Assigned doctor access via appointments.doctor_id -> doctors.user_id
      exists (
        select 1
        from public.appointments a
        join public.doctors d
          on d.id = a.doctor_id
        where a.id = public.treatment_plan_procedure_visits.appointment_id
          and d.user_id = auth.uid()
      )
      or
      -- Active clinic staff access via appointments.practice_id -> clinic_staff.user_id
      exists (
        select 1
        from public.appointments a
        join public.clinic_staff cs
          on cs.practice_id = a.practice_id
        where a.id = public.treatment_plan_procedure_visits.appointment_id
          and cs.user_id = auth.uid()
          and cs.status = 'active'
      )
    );
  $pol$;

  -- INSERT
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'treatment_plan_procedure_visits'
      and policyname = 'tpv_insert_authorized'
  ) then
    execute 'drop policy tpv_insert_authorized on public.treatment_plan_procedure_visits';
  end if;

  execute $pol$
    create policy tpv_insert_authorized
    on public.treatment_plan_procedure_visits
    for insert
    to authenticated
    with check (
      -- Admin override
      exists (
        select 1
        from public.profiles p
        where p.user_id = auth.uid()
          and coalesce(p.role, '') in ('super_admin', 'admin')
      )
      or
      -- Assigned doctor for the appointment can create
      exists (
        select 1
        from public.appointments a
        join public.doctors d
          on d.id = a.doctor_id
        where a.id = public.treatment_plan_procedure_visits.appointment_id
          and d.user_id = auth.uid()
      )
      or
      -- Active clinic staff for the appointment practice can create
      exists (
        select 1
        from public.appointments a
        join public.clinic_staff cs
          on cs.practice_id = a.practice_id
        where a.id = public.treatment_plan_procedure_visits.appointment_id
          and cs.user_id = auth.uid()
          and cs.status = 'active'
      )
    );
  $pol$;

  -- UPDATE
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'treatment_plan_procedure_visits'
      and policyname = 'tpv_update_authorized'
  ) then
    execute 'drop policy tpv_update_authorized on public.treatment_plan_procedure_visits';
  end if;

  execute $pol$
    create policy tpv_update_authorized
    on public.treatment_plan_procedure_visits
    for update
    to authenticated
    using (
      -- Admin override
      exists (
        select 1
        from public.profiles p
        where p.user_id = auth.uid()
          and coalesce(p.role, '') in ('super_admin', 'admin')
      )
      or
      -- Assigned doctor can update
      exists (
        select 1
        from public.appointments a
        join public.doctors d
          on d.id = a.doctor_id
        where a.id = public.treatment_plan_procedure_visits.appointment_id
          and d.user_id = auth.uid()
      )
      or
      -- Active clinic staff can update
      exists (
        select 1
        from public.appointments a
        join public.clinic_staff cs
          on cs.practice_id = a.practice_id
        where a.id = public.treatment_plan_procedure_visits.appointment_id
          and cs.user_id = auth.uid()
          and cs.status = 'active'
      )
    )
    with check (
      -- Keep the same authorization on the new row
      exists (
        select 1
        from public.profiles p
        where p.user_id = auth.uid()
          and coalesce(p.role, '') in ('super_admin', 'admin')
      )
      or
      exists (
        select 1
        from public.appointments a
        join public.doctors d
          on d.id = a.doctor_id
        where a.id = public.treatment_plan_procedure_visits.appointment_id
          and d.user_id = auth.uid()
      )
      or
      exists (
        select 1
        from public.appointments a
        join public.clinic_staff cs
          on cs.practice_id = a.practice_id
        where a.id = public.treatment_plan_procedure_visits.appointment_id
          and cs.user_id = auth.uid()
          and cs.status = 'active'
      )
    );
  $pol$;

  -- DELETE
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'treatment_plan_procedure_visits'
      and policyname = 'tpv_delete_authorized'
  ) then
    execute 'drop policy tpv_delete_authorized on public.treatment_plan_procedure_visits';
  end if;

  execute $pol$
    create policy tpv_delete_authorized
    on public.treatment_plan_procedure_visits
    for delete
    to authenticated
    using (
      -- Admin override
      exists (
        select 1
        from public.profiles p
        where p.user_id = auth.uid()
          and coalesce(p.role, '') in ('super_admin', 'admin')
      )
      or
      -- Assigned doctor can delete
      exists (
        select 1
        from public.appointments a
        join public.doctors d
          on d.id = a.doctor_id
        where a.id = public.treatment_plan_procedure_visits.appointment_id
          and d.user_id = auth.uid()
      )
      or
      -- Active clinic staff can delete
      exists (
        select 1
        from public.appointments a
        join public.clinic_staff cs
          on cs.practice_id = a.practice_id
        where a.id = public.treatment_plan_procedure_visits.appointment_id
          and cs.user_id = auth.uid()
          and cs.status = 'active'
      )
    );
  $pol$;

end $$;

commit;
