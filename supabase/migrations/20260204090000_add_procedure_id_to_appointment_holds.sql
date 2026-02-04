begin;

-- 1) Add requested procedure to pending booking holds
alter table public.appointment_holds
  add column if not exists procedure_id uuid null;

-- 2) Add FK safely (only if missing)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointment_holds_procedure_id_fkey'
  ) then
    alter table public.appointment_holds
      add constraint appointment_holds_procedure_id_fkey
      foreign key (procedure_id)
      references public.procedures(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_appointment_holds_procedure_id
  on public.appointment_holds(procedure_id);

-- 3) Update patient insert policy:
--    Patient can only insert holds for themselves AND can only choose a procedure
--    that belongs to the same doctor AND is_active AND is_bookable.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='appointment_holds'
      and policyname='appointment_holds_insert_patient_self'
  ) then
    execute 'drop policy appointment_holds_insert_patient_self on public.appointment_holds';
  end if;

  execute $policy$
    create policy appointment_holds_insert_patient_self
      on public.appointment_holds
      for insert
      with check (
        patient_id is not null
        and patient_id = auth.uid()
        and doctor_patient_id is null
        and (
          procedure_id is null
          or exists (
            select 1
            from public.procedures p
            where p.id = procedure_id
              and p.dentist_id = doctor_id
              and p.is_active is true
              and p.is_bookable is true
          )
        )
      );
  $policy$;
end $$;

commit;
