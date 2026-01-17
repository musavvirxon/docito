-- Path: supabase/migrations/20260117213000_phase8_verification_file_uploads.sql
begin;

-- -----------------------------------------------------------------------------
-- Storage bucket for verification docs (idempotent)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-docs',
  'verification-docs',
  false,
  52428800,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Verification files table (idempotent)
-- -----------------------------------------------------------------------------
create table if not exists public.verification_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid null references public.verification_submissions(id) on delete set null,
  entity_type text not null check (entity_type in ('clinic','lab','imaging','pharmacy')),
  entity_id uuid not null,
  uploaded_by uuid not null,
  bucket text not null default 'verification-docs',
  object_path text not null,
  file_name text not null,
  mime_type text null,
  size_bytes bigint null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_verification_files_entity on public.verification_files(entity_type, entity_id, created_at desc);
create index if not exists idx_verification_files_submission on public.verification_files(submission_id, created_at desc);
create unique index if not exists uq_verification_files_object on public.verification_files(bucket, object_path);

alter table public.verification_files enable row level security;

drop policy if exists "Verification files: entity access can read" on public.verification_files;
drop policy if exists "Verification files: uploader can insert" on public.verification_files;
drop policy if exists "Verification files: uploader or super admin can delete" on public.verification_files;

create policy "Verification files: entity access can read"
on public.verification_files
for select
using (
  public.has_entity_access(entity_type, entity_id)
  or public.is_super_admin()
);

create policy "Verification files: uploader can insert"
on public.verification_files
for insert
with check (
  uploaded_by = auth.uid()
  and public.has_entity_access(entity_type, entity_id)
);

create policy "Verification files: uploader or super admin can delete"
on public.verification_files
for delete
using (
  uploaded_by = auth.uid()
  or public.is_super_admin()
);

-- -----------------------------------------------------------------------------
-- Storage object policies for verification-docs bucket
-- Key format enforced by app: {entity_type}/{entity_id}/{submission_id}/{uuid}-{filename}
-- -----------------------------------------------------------------------------
drop policy if exists "verification-docs: read for entity access" on storage.objects;
drop policy if exists "verification-docs: insert for entity access" on storage.objects;
drop policy if exists "verification-docs: update for uploader" on storage.objects;
drop policy if exists "verification-docs: delete for uploader/superadmin" on storage.objects;

create policy "verification-docs: read for entity access"
on storage.objects
for select
using (
  bucket_id = 'verification-docs'
  and public.has_entity_access(split_part(name, '/', 1), split_part(name, '/', 2)::uuid)
);

create policy "verification-docs: insert for entity access"
on storage.objects
for insert
with check (
  bucket_id = 'verification-docs'
  and public.has_entity_access(split_part(name, '/', 1), split_part(name, '/', 2)::uuid)
);

create policy "verification-docs: update for uploader"
on storage.objects
for update
using (
  bucket_id = 'verification-docs'
  and exists (
    select 1
    from public.verification_files vf
    where vf.bucket = storage.objects.bucket_id
      and vf.object_path = storage.objects.name
      and vf.uploaded_by = auth.uid()
  )
)
with check (true);

create policy "verification-docs: delete for uploader/superadmin"
on storage.objects
for delete
using (
  bucket_id = 'verification-docs'
  and (
    public.is_super_admin()
    or exists (
      select 1
      from public.verification_files vf
      where vf.bucket = storage.objects.bucket_id
        and vf.object_path = storage.objects.name
        and vf.uploaded_by = auth.uid()
    )
  )
);

-- -----------------------------------------------------------------------------
-- Reload schema
-- -----------------------------------------------------------------------------
select pg_notify('pgrst', 'reload schema');

commit;
