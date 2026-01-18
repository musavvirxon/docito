-- File: supabase/migrations/20260118183000_phase8_entity_files_storage.sql
begin;

-- ============================================================
-- Phase 8: Entity file uploads (verification + reports) via Storage
-- - Bucket: entity-files (private)
-- - Table: public.entity_files (metadata + audit)
-- - RLS: entity members only
-- - Storage policies: entity prefix enforced
-- Naming convention for storage object name:
--   <entity_type>/<entity_id>/<category>/<file_id>_<sanitized_filename>
-- entity_type in: practice|clinic|lab|imaging|pharmacy
-- ============================================================

-- Ensure bucket exists (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'entity-files',
  'entity-files',
  false,
  52428800,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Metadata table
create table if not exists public.entity_files (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null check (entity_type in ('practice','clinic','lab','imaging','pharmacy')),
  entity_id uuid not null,

  category text not null default 'general',

  bucket_id text not null default 'entity-files',
  object_path text not null, -- same as storage.objects.name
  original_filename text,
  content_type text,
  size_bytes bigint,

  status text not null default 'pending' check (status in ('pending','uploaded','deleted')),

  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint entity_files_unique unique (bucket_id, object_path)
);

create index if not exists idx_entity_files_entity on public.entity_files(entity_type, entity_id);
create index if not exists idx_entity_files_entity_category on public.entity_files(entity_type, entity_id, category);
create index if not exists idx_entity_files_object_path on public.entity_files(object_path);

alter table public.entity_files enable row level security;

-- Helper: safely parse entity_id from object name (name = <type>/<uuid>/...)
create or replace function public._entity_id_from_object_name(p_name text)
returns uuid
language sql
immutable
as $$
  select
    case
      when split_part(p_name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (split_part(p_name, '/', 2))::uuid
      else null
    end;
$$;

-- Helper: normalize entity_type for access checks
create or replace function public._entity_type_for_access(p_entity_type text)
returns text
language sql
immutable
as $$
  select
    case
      when lower(p_entity_type) = 'clinic' then 'practice'
      else lower(p_entity_type)
    end;
$$;

-- RLS: SELECT
drop policy if exists "Entity members can read entity_files" on public.entity_files;
create policy "Entity members can read entity_files"
on public.entity_files
for select
to authenticated
using (
  public.has_role(auth.uid(), 'super_admin')
  or public.can_access_entity(public._entity_type_for_access(entity_type), entity_id)
);

-- RLS: INSERT
drop policy if exists "Entity members can insert entity_files" on public.entity_files;
create policy "Entity members can insert entity_files"
on public.entity_files
for insert
to authenticated
with check (
  public.has_role(auth.uid(), 'super_admin')
  or public.can_access_entity(public._entity_type_for_access(entity_type), entity_id)
);

-- RLS: UPDATE
drop policy if exists "Entity members can update entity_files" on public.entity_files;
create policy "Entity members can update entity_files"
on public.entity_files
for update
to authenticated
using (
  public.has_role(auth.uid(), 'super_admin')
  or public.can_access_entity(public._entity_type_for_access(entity_type), entity_id)
)
with check (
  public.has_role(auth.uid(), 'super_admin')
  or public.can_access_entity(public._entity_type_for_access(entity_type), entity_id)
);

-- RLS: DELETE
drop policy if exists "Entity members can delete entity_files" on public.entity_files;
create policy "Entity members can delete entity_files"
on public.entity_files
for delete
to authenticated
using (
  public.has_role(auth.uid(), 'super_admin')
  or public.can_access_entity(public._entity_type_for_access(entity_type), entity_id)
);

-- ------------------------------------------------------------
-- Storage policies on storage.objects for bucket 'entity-files'
-- Enforce that the object path encodes entity_type + entity_id,
-- and the current user can access that entity.
-- ------------------------------------------------------------

-- SELECT from storage.objects (download/list)
drop policy if exists "Entity members can read storage objects (entity-files)" on storage.objects;
create policy "Entity members can read storage objects (entity-files)"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'entity-files'
  and (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_access_entity(
      public._entity_type_for_access(lower(split_part(name, '/', 1))),
      public._entity_id_from_object_name(name)
    )
  )
);

-- INSERT into storage.objects (uploads)
drop policy if exists "Entity members can upload storage objects (entity-files)" on storage.objects;
create policy "Entity members can upload storage objects (entity-files)"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'entity-files'
  and (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_access_entity(
      public._entity_type_for_access(lower(split_part(name, '/', 1))),
      public._entity_id_from_object_name(name)
    )
  )
);

-- DELETE from storage.objects
drop policy if exists "Entity members can delete storage objects (entity-files)" on storage.objects;
create policy "Entity members can delete storage objects (entity-files)"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'entity-files'
  and (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_access_entity(
      public._entity_type_for_access(lower(split_part(name, '/', 1))),
      public._entity_id_from_object_name(name)
    )
  )
);

select pg_notify('pgrst', 'reload schema');

commit;
