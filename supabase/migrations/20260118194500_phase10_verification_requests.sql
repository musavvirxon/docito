-- File: supabase/migrations/20260118194500_phase10_verification_requests.sql
begin;

-- ============================================================
-- Phase 10: Verification Requests (for Top Nav "Verification" button)
-- - Stores requests per entity (practice/lab/imaging/pharmacy/clinic)
-- - RLS: entity members can insert/read their requests
-- - Super admin can read all
-- ============================================================

create table if not exists public.entity_verification_requests (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null check (entity_type in ('practice','clinic','lab','imaging','pharmacy')),
  entity_id uuid not null,

  status text not null default 'submitted' check (status in ('submitted','under_review','approved','rejected','cancelled')),
  comment text,

  submitted_by uuid not null references auth.users(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_verif_req_entity on public.entity_verification_requests(entity_type, entity_id, submitted_at desc);
create index if not exists idx_verif_req_status on public.entity_verification_requests(status, submitted_at desc);
create index if not exists idx_verif_req_submitter on public.entity_verification_requests(submitted_by, submitted_at desc);

alter table public.entity_verification_requests enable row level security;

-- Entity members can read their entity's requests; super_admin can read all
drop policy if exists "Entity members can read verification requests" on public.entity_verification_requests;
create policy "Entity members can read verification requests"
on public.entity_verification_requests
for select
to authenticated
using (
  public.has_role(auth.uid(), 'super_admin')
  or public.can_access_entity(
    case when lower(entity_type) = 'clinic' then 'practice' else lower(entity_type) end,
    entity_id
  )
);

-- Entity members can insert for their entity; super_admin can insert anywhere
drop policy if exists "Entity members can create verification requests" on public.entity_verification_requests;
create policy "Entity members can create verification requests"
on public.entity_verification_requests
for insert
to authenticated
with check (
  submitted_by = auth.uid()
  and (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_access_entity(
      case when lower(entity_type) = 'clinic' then 'practice' else lower(entity_type) end,
      entity_id
    )
  )
);

-- No client updates/deletes by default (handled by admins/service role)
-- (Super admin can update if needed)
drop policy if exists "Super admin can update verification requests" on public.entity_verification_requests;
create policy "Super admin can update verification requests"
on public.entity_verification_requests
for update
to authenticated
using (public.has_role(auth.uid(), 'super_admin'))
with check (public.has_role(auth.uid(), 'super_admin'));

-- RPC: create verification request (authenticated, entity-scoped)
create or replace function public.request_entity_verification(
  p_entity_type text,
  p_entity_id uuid,
  p_comment text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_type text := lower(coalesce(p_entity_type,''));
  new_id uuid;
begin
  if v_entity_type not in ('practice','clinic','lab','imaging','pharmacy') then
    raise exception 'Invalid entity_type';
  end if;

  if not (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_access_entity(
      case when v_entity_type = 'clinic' then 'practice' else v_entity_type end,
      p_entity_id
    )
  ) then
    raise exception 'Forbidden';
  end if;

  insert into public.entity_verification_requests(entity_type, entity_id, status, comment, submitted_by)
  values (v_entity_type, p_entity_id, 'submitted', nullif(p_comment,''), auth.uid())
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.request_entity_verification(text, uuid, text) to authenticated;

select pg_notify('pgrst', 'reload schema');

commit;
