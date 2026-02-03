begin;

alter table public.doctor_verification
  add column if not exists status text,
  add column if not exists rejection_reason text,
  add column if not exists specialty text,
  add column if not exists license_number text,
  add column if not exists years_of_experience text,
  add column if not exists verification_data jsonb not null default '{}'::jsonb;

-- Ensure defaults (safe to re-run)
alter table public.doctor_verification
  alter column status set default 'pending';

-- Backfill status from legacy column if present
update public.doctor_verification
set status = coalesce(status, verification_status, 'pending')
where status is null;

-- Keep legacy + new status columns in sync
create or replace function public.sync_doctor_verification_status()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.status := coalesce(new.status, new.verification_status, 'pending');
    new.verification_status := coalesce(new.verification_status, new.status);
  else
    if new.status is distinct from old.status then
      new.verification_status := coalesce(new.status, new.verification_status, 'pending');
    elsif new.verification_status is distinct from old.verification_status then
      new.status := coalesce(new.verification_status, new.status, 'pending');
    end if;

    new.status := coalesce(new.status, 'pending');
    new.verification_status := coalesce(new.verification_status, new.status);
  end if;

  new.updated_at := coalesce(new.updated_at, now());
  return new;
end;
$$;

drop trigger if exists trg_sync_doctor_verification_status on public.doctor_verification;
create trigger trg_sync_doctor_verification_status
before insert or update on public.doctor_verification
for each row
execute function public.sync_doctor_verification_status();

-- =========================================================
-- 2) Doctor verification documents: align schema to frontend
-- =========================================================

alter table public.doctor_verification_documents
  add column if not exists document_type text,
  add column if not exists file_name text,
  add column if not exists uploaded_at timestamptz;

-- Defaults (safe to re-run)
alter table public.doctor_verification_documents
  alter column uploaded_at set default now();

-- Backfill from legacy columns if present
update public.doctor_verification_documents
set document_type = coalesce(document_type, doc_type)
where document_type is null;

update public.doctor_verification_documents
set uploaded_at = coalesce(uploaded_at, created_at)
where uploaded_at is null;

update public.doctor_verification_documents
set file_name = coalesce(
  file_name,
  nullif(regexp_replace(coalesce(file_path, ''), '^.*/', ''), '')
)
where file_name is null;

create or replace function public.normalize_doctor_verification_document_row()
returns trigger
language plpgsql
as $$
begin
  new.document_type := coalesce(new.document_type, new.doc_type, 'unknown');
  new.uploaded_at := coalesce(new.uploaded_at, now());
  new.file_name := coalesce(
    new.file_name,
    nullif(regexp_replace(coalesce(new.file_path, ''), '^.*/', ''), ''),
    'document'
  );
  return new;
end;
$$;

drop trigger if exists trg_normalize_doctor_verification_document_row on public.doctor_verification_documents;
create trigger trg_normalize_doctor_verification_document_row
before insert or update on public.doctor_verification_documents
for each row
execute function public.normalize_doctor_verification_document_row();

create index if not exists idx_doctor_verification_documents_verification_id
on public.doctor_verification_documents(doctor_verification_id);

create index if not exists idx_doctor_verification_documents_document_type
on public.doctor_verification_documents(document_type);

-- =========================================================
-- 3) RLS: allow doctors to manage their own verification + docs
-- =========================================================

create or replace function public.is_doctor_owner(p_doctor_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.doctors d
    where d.id = p_doctor_id
      and d.user_id = auth.uid()
  );
$$;

-- doctor_verification: add doctor-scoped policies (keep existing super_admin policies intact)
alter table public.doctor_verification enable row level security;

drop policy if exists "doctor_verification_select_own" on public.doctor_verification;
create policy "doctor_verification_select_own"
on public.doctor_verification
for select
to authenticated
using (
  public.is_super_admin()
  or public.is_doctor_owner(doctor_id)
);

drop policy if exists "doctor_verification_insert_own" on public.doctor_verification;
create policy "doctor_verification_insert_own"
on public.doctor_verification
for insert
to authenticated
with check (
  public.is_super_admin()
  or public.is_doctor_owner(doctor_id)
);

drop policy if exists "doctor_verification_update_own" on public.doctor_verification;
create policy "doctor_verification_update_own"
on public.doctor_verification
for update
to authenticated
using (
  public.is_super_admin()
  or public.is_doctor_owner(doctor_id)
)
with check (
  public.is_super_admin()
  or public.is_doctor_owner(doctor_id)
);

-- doctor_verification_documents: add doctor-scoped policies (keep existing super_admin policies intact)
alter table public.doctor_verification_documents enable row level security;

drop policy if exists "doctor_verification_documents_select_own" on public.doctor_verification_documents;
create policy "doctor_verification_documents_select_own"
on public.doctor_verification_documents
for select
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.doctor_verification dv
    where dv.id = doctor_verification_id
      and public.is_doctor_owner(dv.doctor_id)
  )
);

drop policy if exists "doctor_verification_documents_insert_own" on public.doctor_verification_documents;
create policy "doctor_verification_documents_insert_own"
on public.doctor_verification_documents
for insert
to authenticated
with check (
  public.is_super_admin()
  or exists (
    select 1
    from public.doctor_verification dv
    where dv.id = doctor_verification_id
      and public.is_doctor_owner(dv.doctor_id)
  )
);

drop policy if exists "doctor_verification_documents_update_own" on public.doctor_verification_documents;
create policy "doctor_verification_documents_update_own"
on public.doctor_verification_documents
for update
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.doctor_verification dv
    where dv.id = doctor_verification_id
      and public.is_doctor_owner(dv.doctor_id)
  )
)
with check (
  public.is_super_admin()
  or exists (
    select 1
    from public.doctor_verification dv
    where dv.id = doctor_verification_id
      and public.is_doctor_owner(dv.doctor_id)
  )
);

drop policy if exists "doctor_verification_documents_delete_own" on public.doctor_verification_documents;
create policy "doctor_verification_documents_delete_own"
on public.doctor_verification_documents
for delete
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.doctor_verification dv
    where dv.id = doctor_verification_id
      and public.is_doctor_owner(dv.doctor_id)
  )
);

-- =========================================================
-- 4) System audit logs: align schema + allow inserts by users
-- =========================================================

-- Add missing columns to match frontend expectations
alter table public.system_audit_logs
  add column if not exists action_type text,
  add column if not exists ip_address text,
  add column if not exists user_agent text;

-- Backfill action_type from legacy action column if present
update public.system_audit_logs
set action_type = coalesce(action_type, action)
where action_type is null;

-- Ensure action_type has a fallback (safe)
update public.system_audit_logs
set action_type = 'system'
where action_type is null;

-- RLS: keep select for super_admin; relax insert to authenticated users for self-logs
alter table public.system_audit_logs enable row level security;

drop policy if exists "system_audit_logs_insert_super_admin" on public.system_audit_logs;
drop policy if exists "system_audit_logs_insert_authenticated" on public.system_audit_logs;

create policy "system_audit_logs_insert_authenticated"
on public.system_audit_logs
for insert
to authenticated
with check (
  user_id = auth.uid()
);

commit;
