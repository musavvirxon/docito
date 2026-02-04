-- File: supabase/migrations/20260204121000_add_procedure_id_to_appointment_holds.sql

do $$
begin
  -- Add column if missing
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'appointment_holds'
      and column_name = 'procedure_id'
  ) then
    alter table public.appointment_holds
      add column procedure_id uuid null;
  end if;

  -- Add FK if missing
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

create index if not exists appointment_holds_procedure_id_idx
  on public.appointment_holds (procedure_id);
