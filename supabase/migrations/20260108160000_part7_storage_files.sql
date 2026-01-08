begin;

-- ============================================================
-- PART 7A: Storage buckets + file metadata + RLS policies
-- ============================================================

-- 1) Create private buckets (idempotent)
insert into storage.buckets (id, name, public)
values
  ('attachments', 'attachments', false),
  ('profile-photos', 'profile-photos', false)
on conflict (id) do nothing;

-- 2) File metadata table (single source of truth)
-- We store references to objects in storage and link them to a context.
create table if not exists public.file_assets (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  object_path text not null, -- storage.objects.name (path inside bucket)
  content_type text,
  size_bytes bigint,
  original_filename text,

  -- Ownership / access context
  context_type text not null check (context_type in (
    'referral',
    'appointment',
    'practice_location',
    'procedure',
    'profile'
  )),
  context_id uuid not null,

  created_by uuid not null,
  created_at timestamptz not null default now(),

  -- Optional flags
  is_deleted boolean not null default false,

  unique (bucket_id, object_path)
);

create index if not exists idx_file_assets_context on public.file_assets (context_type, context_id);
create index if not exists idx_file_assets_created_by on public.file_assets (created_by);

alter table public.file_assets enable row level security;

-- ------------------------------------------------------------
-- Helper access checks for files (kept in DB so policies stay clean)
-- ------------------------------------------------------------

-- Can user access a referral? (mirrors your referral visibility logic)
create or replace function public.can_access_referral(p_referral_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select
    exists (select 1 from public.referrals r where r.id = p_referral_id and r.patient_id = auth.uid())
    or exists (select 1 from public.referrals r where r.id = p_referral_id and r.referrer_user_id = auth.uid())
    or exists (select 1 from public.referrals r where r.id = p_referral_id and r.receiver_user_id = auth.uid())
    or exists (
      select 1
      from public.referrals r
      join public.practices p on r.receiver_type = 'clinic' and p.id = r.receiver_entity_id
      where r.id = p_referral_id and p.admin_id = auth.uid()
    )
    or exists (
      select 1
      from public.referrals r
      join public.practice_staff ps on r.receiver_type = 'clinic' and ps.practice_id = r.receiver_entity_id
      where r.id = p_referral_id and ps.user_id = auth.uid() and coalesce(ps.status,'active')='active'
    )
    or public.has_role(auth.uid(), 'super_admin'::app_role);
$$;

grant execute on function public.can_access_referral(uuid) to authenticated;

-- Can user access an appointment?
create or replace function public.can_access_appointment(p_appointment_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select
    exists (select 1 from public.appointments a where a.id = p_appointment_id and a.patient_id = auth.uid())
    or exists (
      select 1 from public.appointments a
      join public.doctors d on d.id = a.doctor_id
      where a.id = p_appointment_id and d.user_id = auth.uid()
    )
    or exists (
      select 1 from public.appointments a
      where a.id = p_appointment_id
        and a.practice_id is not null
        and public.can_access_practice(a.practice_id)
    )
    or public.has_role(auth.uid(), 'super_admin'::app_role);
$$;

grant execute on function public.can_access_appointment(uuid) to authenticated;

-- Can user access a practice location?
create or replace function public.can_access_location(p_location_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select
    exists (
      select 1
      from public.practice_locations pl
      where pl.id = p_location_id
        and public.can_access_practice(pl.practice_id)
    )
    or public.has_role(auth.uid(), 'super_admin'::app_role);
$$;

grant execute on function public.can_access_location(uuid) to authenticated;

-- Can user access a procedure/service?
create or replace function public.can_access_procedure(p_procedure_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select
    exists (
      select 1
      from public.procedures prc
      join public.doctors d on d.id = prc.dentist_id
      where prc.id = p_procedure_id
        and public.can_access_practice(d.practice_id)
    )
    or public.has_role(auth.uid(), 'super_admin'::app_role);
$$;

grant execute on function public.can_access_procedure(uuid) to authenticated;

-- ------------------------------------------------------------
-- RLS policies: file_assets
-- ------------------------------------------------------------

drop policy if exists "File assets: select by context access" on public.file_assets;
create policy "File assets: select by context access"
on public.file_assets for select
using (
  is_deleted = false
  and (
    (context_type = 'referral' and public.can_access_referral(context_id))
    or (context_type = 'appointment' and public.can_access_appointment(context_id))
    or (context_type = 'practice_location' and public.can_access_location(context_id))
    or (context_type = 'procedure' and public.can_access_procedure(context_id))
    or (context_type = 'profile' and context_id = auth.uid())
    or public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

drop policy if exists "File assets: insert by context access" on public.file_assets;
create policy "File assets: insert by context access"
on public.file_assets for insert
with check (
  created_by = auth.uid()
  and (
    (context_type = 'referral' and public.can_access_referral(context_id))
    or (context_type = 'appointment' and public.can_access_appointment(context_id))
    or (context_type = 'practice_location' and public.can_access_location(context_id))
    or (context_type = 'procedure' and public.can_access_procedure(context_id))
    or (context_type = 'profile' and context_id = auth.uid())
    or public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

drop policy if exists "File assets: delete by owner or super admin" on public.file_assets;
create policy "File assets: delete by owner or super admin"
on public.file_assets for update
using (created_by = auth.uid() or public.has_role(auth.uid(), 'super_admin'::app_role))
with check (created_by = auth.uid() or public.has_role(auth.uid(), 'super_admin'::app_role));

-- ------------------------------------------------------------
-- Storage object policies (storage.objects)
-- These gate actual file bytes download/upload.
-- Policy approach:
-- - object is accessible only if there is a file_assets row mapping to it AND user can access the context.
-- ------------------------------------------------------------

-- Read objects if they are referenced and user has access
drop policy if exists "Storage: read private objects via file_assets" on storage.objects;
create policy "Storage: read private objects via file_assets"
on storage.objects for select
using (
  exists (
    select 1
    from public.file_assets fa
    where fa.bucket_id = storage.objects.bucket_id
      and fa.object_path = storage.objects.name
      and fa.is_deleted = false
      and (
        (fa.context_type = 'referral' and public.can_access_referral(fa.context_id))
        or (fa.context_type = 'appointment' and public.can_access_appointment(fa.context_id))
        or (fa.context_type = 'practice_location' and public.can_access_location(fa.context_id))
        or (fa.context_type = 'procedure' and public.can_access_procedure(fa.context_id))
        or (fa.context_type = 'profile' and fa.context_id = auth.uid())
        or public.has_role(auth.uid(), 'super_admin'::app_role)
      )
  )
);

-- Upload objects: allow authenticated, but only into approved buckets.
-- The metadata row (file_assets) will enforce who is actually allowed to reference it.
drop policy if exists "Storage: allow uploads to private buckets" on storage.objects;
create policy "Storage: allow uploads to private buckets"
on storage.objects for insert
with check (
  auth.role() = 'authenticated'
  and bucket_id in ('attachments', 'profile-photos')
);

-- Delete objects: only super admin (safest)
drop policy if exists "Storage: super admin delete objects" on storage.objects;
create policy "Storage: super admin delete objects"
on storage.objects for delete
using (public.has_role(auth.uid(), 'super_admin'::app_role));

commit;
