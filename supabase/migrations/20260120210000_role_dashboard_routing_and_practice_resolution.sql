-- File: supabase/migrations/20260120210000_role_dashboard_routing_and_practice_resolution.sql
begin;

-- Helpful indexes (idempotent)
create index if not exists practices_admin_id_idx
  on public.practices (admin_id);

create index if not exists practice_staff_user_status_idx
  on public.practice_staff (user_id, status);

create index if not exists practice_staff_practice_user_idx
  on public.practice_staff (practice_id, user_id);

-- Resolve the best/primary practice for the current authenticated user.
-- Priority:
--   1) practices where admin_id = auth.uid()
--   2) practice_staff membership (active), preferring is_admin=true
create or replace function public.get_my_primary_practice_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  with candidates as (
    select
      1 as priority,
      p.id as practice_id,
      p.created_at as created_at
    from public.practices p
    where p.admin_id = auth.uid()

    union all

    select
      2 as priority,
      ps.practice_id as practice_id,
      ps.created_at as created_at
    from public.practice_staff ps
    where ps.user_id = auth.uid()
      and coalesce(ps.status, 'active') = 'active'
  )
  select practice_id
  from candidates
  order by priority asc, created_at desc
  limit 1;
$$;

grant execute on function public.get_my_primary_practice_id() to authenticated;

commit;
