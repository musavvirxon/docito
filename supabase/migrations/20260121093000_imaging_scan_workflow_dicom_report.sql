-- supabase/migrations/20260121093000_imaging_scan_workflow_dicom_report.sql

-- 1) Buckets (idempotent)
insert into storage.buckets (id, name, public)
values ('imaging-dicom', 'imaging-dicom', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('imaging-reports', 'imaging-reports', false)
on conflict (id) do nothing;

-- 2) Extend imaging_order_state.workflow_status allowed values (idempotent, safe)
do $$
declare
  conname text;
begin
  select c.conname into conname
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'imaging_order_state'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%workflow_status%';

  if conname is not null then
    execute format('alter table public.imaging_order_state drop constraint if exists %I', conname);
  end if;

  alter table public.imaging_order_state
    add constraint imaging_order_state_workflow_status_check
    check (
      workflow_status in (
        'scheduled',
        'checked_in',
        'in_progress',
        'images_ready',
        'awaiting_report',
        'completed',
        'delivered',
        'cancelled'
      )
    );

exception
  when duplicate_object then
    -- constraint already exists with correct name
    null;
end $$;

-- 3) Storage policies (idempotent)
-- NOTE: These policies assume object paths are: <centerId>/<referralId>/<filename>
-- and that <centerId> is a UUID.

-- DICOM: SELECT
drop policy if exists "imaging_dicom_select" on storage.objects;
create policy "imaging_dicom_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'imaging-dicom'
  and split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
  and (
    exists (
      select 1
      from public.imaging_centers ic
      where ic.id = split_part(name, '/', 1)::uuid
        and ic.admin_id = auth.uid()
    )
    or exists (
      select 1
      from public.imaging_staff s
      where s.imaging_center_id = split_part(name, '/', 1)::uuid
        and s.user_id = auth.uid()
        and s.status = 'active'
    )
  )
);

-- DICOM: INSERT
drop policy if exists "imaging_dicom_insert" on storage.objects;
create policy "imaging_dicom_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'imaging-dicom'
  and split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
  and (
    exists (
      select 1
      from public.imaging_centers ic
      where ic.id = split_part(name, '/', 1)::uuid
        and ic.admin_id = auth.uid()
    )
    or exists (
      select 1
      from public.imaging_staff s
      where s.imaging_center_id = split_part(name, '/', 1)::uuid
        and s.user_id = auth.uid()
        and s.status = 'active'
    )
  )
);

-- DICOM: UPDATE
drop policy if exists "imaging_dicom_update" on storage.objects;
create policy "imaging_dicom_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'imaging-dicom'
  and split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
  and (
    exists (
      select 1
      from public.imaging_centers ic
      where ic.id = split_part(name, '/', 1)::uuid
        and ic.admin_id = auth.uid()
    )
    or exists (
      select 1
      from public.imaging_staff s
      where s.imaging_center_id = split_part(name, '/', 1)::uuid
        and s.user_id = auth.uid()
        and s.status = 'active'
    )
  )
)
with check (
  bucket_id = 'imaging-dicom'
);

-- DICOM: DELETE
drop policy if exists "imaging_dicom_delete" on storage.objects;
create policy "imaging_dicom_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'imaging-dicom'
  and split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
  and (
    exists (
      select 1
      from public.imaging_centers ic
      where ic.id = split_part(name, '/', 1)::uuid
        and ic.admin_id = auth.uid()
    )
    or exists (
      select 1
      from public.imaging_staff s
      where s.imaging_center_id = split_part(name, '/', 1)::uuid
        and s.user_id = auth.uid()
        and s.status = 'active'
    )
  )
);

-- REPORTS: SELECT
drop policy if exists "imaging_reports_select" on storage.objects;
create policy "imaging_reports_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'imaging-reports'
  and split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
  and (
    exists (
      select 1
      from public.imaging_centers ic
      where ic.id = split_part(name, '/', 1)::uuid
        and ic.admin_id = auth.uid()
    )
    or exists (
      select 1
      from public.imaging_staff s
      where s.imaging_center_id = split_part(name, '/', 1)::uuid
        and s.user_id = auth.uid()
        and s.status = 'active'
    )
  )
);

-- REPORTS: INSERT
drop policy if exists "imaging_reports_insert" on storage.objects;
create policy "imaging_reports_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'imaging-reports'
  and split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
  and (
    exists (
      select 1
      from public.imaging_centers ic
      where ic.id = split_part(name, '/', 1)::uuid
        and ic.admin_id = auth.uid()
    )
    or exists (
      select 1
      from public.imaging_staff s
      where s.imaging_center_id = split_part(name, '/', 1)::uuid
        and s.user_id = auth.uid()
        and s.status = 'active'
    )
  )
);

-- REPORTS: UPDATE
drop policy if exists "imaging_reports_update" on storage.objects;
create policy "imaging_reports_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'imaging-reports'
  and split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
  and (
    exists (
      select 1
      from public.imaging_centers ic
      where ic.id = split_part(name, '/', 1)::uuid
        and ic.admin_id = auth.uid()
    )
    or exists (
      select 1
      from public.imaging_staff s
      where s.imaging_center_id = split_part(name, '/', 1)::uuid
        and s.user_id = auth.uid()
        and s.status = 'active'
    )
  )
)
with check (
  bucket_id = 'imaging-reports'
);

-- REPORTS: DELETE
drop policy if exists "imaging_reports_delete" on storage.objects;
create policy "imaging_reports_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'imaging-reports'
  and split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
  and (
    exists (
      select 1
      from public.imaging_centers ic
      where ic.id = split_part(name, '/', 1)::uuid
        and ic.admin_id = auth.uid()
    )
    or exists (
      select 1
      from public.imaging_staff s
      where s.imaging_center_id = split_part(name, '/', 1)::uuid
        and s.user_id = auth.uid()
        and s.status = 'active'
    )
  )
);
