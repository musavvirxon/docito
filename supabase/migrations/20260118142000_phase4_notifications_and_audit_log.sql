-- File: supabase/migrations/20260118142000_phase4_notifications_and_audit_log.sql
begin;

-- ---------------------------------------------------------
-- 1) Notifications
-- ---------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  entity_type text not null check (entity_type in ('practice','clinic','lab','imaging','pharmacy','doctor','patient','platform')),
  entity_id uuid,

  level text not null default 'info' check (level in ('info','success','warning','error')),
  title text not null,
  body text,
  action_url text,

  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_user_read on public.notifications(user_id, read_at);

alter table public.notifications enable row level security;

drop policy if exists "Users can read their notifications" on public.notifications;
create policy "Users can read their notifications"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can update their notifications" on public.notifications;
create policy "Users can update their notifications"
on public.notifications
for update
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can delete their notifications" on public.notifications;
create policy "Users can delete their notifications"
on public.notifications
for delete
to authenticated
using (user_id = auth.uid());

-- Insert is only via RPC / service role; do not allow client insert by default.

-- ---------------------------------------------------------
-- 2) Audit log (entity-scoped)
-- ---------------------------------------------------------
create table if not exists public.entity_audit_logs (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null check (entity_type in ('practice','clinic','lab','imaging','pharmacy','doctor','patient','platform')),
  entity_id uuid,

  action text not null,
  actor_id uuid references auth.users(id) on delete set null,

  old_values jsonb,
  new_values jsonb,
  metadata jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_audit_entity_created on public.entity_audit_logs(entity_type, entity_id, created_at desc);
create index if not exists idx_audit_actor_created on public.entity_audit_logs(actor_id, created_at desc);

alter table public.entity_audit_logs enable row level security;

-- Read policy: entity members can read logs for their entity, super admin sees all
drop policy if exists "Entity members can read audit logs" on public.entity_audit_logs;
create policy "Entity members can read audit logs"
on public.entity_audit_logs
for select
to authenticated
using (
  public.has_role(auth.uid(), 'super_admin')
  or (
    entity_type in ('practice','clinic')
    and entity_id is not null
    and public.can_access_entity('practice', entity_id)
  )
  or (
    entity_type = 'lab'
    and entity_id is not null
    and public.can_access_entity('lab', entity_id)
  )
  or (
    entity_type = 'imaging'
    and entity_id is not null
    and public.can_access_entity('imaging', entity_id)
  )
  or (
    entity_type = 'pharmacy'
    and entity_id is not null
    and public.can_access_entity('pharmacy', entity_id)
  )
);

-- No client writes; only RPC/service role.

-- ---------------------------------------------------------
-- 3) RPC: create_notification (service role only) + helpers for users
-- ---------------------------------------------------------
create or replace function public.create_notification(
  p_user_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_level text,
  p_title text,
  p_body text,
  p_action_url text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  -- Ensure only service role can call (jwt "role" claim == 'service_role')
  if coalesce((auth.jwt() ->> 'role')::text, '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  insert into public.notifications(user_id, entity_type, entity_id, level, title, body, action_url)
  values (p_user_id, p_entity_type, p_entity_id, coalesce(p_level,'info'), p_title, p_body, p_action_url)
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.create_notification(uuid, text, uuid, text, text, text, text) from public;
grant execute on function public.create_notification(uuid, text, uuid, text, text, text, text) to service_role;

create or replace function public.get_my_unread_notifications_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.notifications
  where user_id = auth.uid()
    and read_at is null;
$$;

grant execute on function public.get_my_unread_notifications_count() to authenticated;

create or replace function public.mark_my_notifications_read(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.notifications
  set read_at = now()
  where user_id = auth.uid()
    and id = any(p_ids)
    and read_at is null;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.mark_my_notifications_read(uuid[]) to authenticated;

create or replace function public.mark_all_my_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.notifications
  set read_at = now()
  where user_id = auth.uid()
    and read_at is null;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.mark_all_my_notifications_read() to authenticated;

-- ---------------------------------------------------------
-- 4) RPC: write_audit_log (service role only)
-- ---------------------------------------------------------
create or replace function public.write_audit_log(
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_actor_id uuid,
  p_old_values jsonb,
  p_new_values jsonb,
  p_metadata jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if coalesce((auth.jwt() ->> 'role')::text, '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  insert into public.entity_audit_logs(entity_type, entity_id, action, actor_id, old_values, new_values, metadata)
  values (p_entity_type, p_entity_id, p_action, p_actor_id, p_old_values, p_new_values, p_metadata)
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.write_audit_log(text, uuid, text, uuid, jsonb, jsonb, jsonb) from public;
grant execute on function public.write_audit_log(text, uuid, text, uuid, jsonb, jsonb, jsonb) to service_role;

select pg_notify('pgrst', 'reload schema');

commit;
