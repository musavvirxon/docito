-- supabase/migrations/20260203155900_system_audit_logs_alignment.sql
begin;

-- ---------------------------------------------------------
-- Ensure system_audit_logs has the columns the UI + Edge tooling may expect
-- (idempotent)
-- ---------------------------------------------------------
do $$
begin
  if to_regclass('public.system_audit_logs') is not null then

    -- legacy column (some environments only had action_type)
    if not exists (
      select 1
      from information_schema.columns
      where table_schema='public' and table_name='system_audit_logs' and column_name='action'
    ) then
      execute 'alter table public.system_audit_logs add column action text null';
    end if;

    -- canonical column used by newer UI/tools
    if not exists (
      select 1
      from information_schema.columns
      where table_schema='public' and table_name='system_audit_logs' and column_name='action_type'
    ) then
      execute 'alter table public.system_audit_logs add column action_type text null';
    end if;

    -- optional request metadata
    if not exists (
      select 1
      from information_schema.columns
      where table_schema='public' and table_name='system_audit_logs' and column_name='ip_address'
    ) then
      execute 'alter table public.system_audit_logs add column ip_address text null';
    end if;

    if not exists (
      select 1
      from information_schema.columns
      where table_schema='public' and table_name='system_audit_logs' and column_name='user_agent'
    ) then
      execute 'alter table public.system_audit_logs add column user_agent text null';
    end if;

  end if;
end $$;

-- ---------------------------------------------------------
-- Backfill between action <-> action_type (idempotent)
-- ---------------------------------------------------------
do $$
begin
  if to_regclass('public.system_audit_logs') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='system_audit_logs' and column_name='action'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='system_audit_logs' and column_name='action_type'
    ) then
      execute 'update public.system_audit_logs set action_type = action where action_type is null and action is not null';
      execute 'update public.system_audit_logs set action = action_type where action is null and action_type is not null';
    end if;
  end if;
end $$;

-- ---------------------------------------------------------
-- Keep action/action_type in sync going forward (idempotent)
-- ---------------------------------------------------------
create or replace function public.sync_system_audit_log_action_columns()
returns trigger
language plpgsql
as $$
begin
  if new.action_type is null and new.action is not null then
    new.action_type := new.action;
  end if;

  if new.action is null and new.action_type is not null then
    new.action := new.action_type;
  end if;

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.system_audit_logs') is not null then
    execute 'drop trigger if exists trg_system_audit_logs_sync_action on public.system_audit_logs';
    execute 'create trigger trg_system_audit_logs_sync_action
      before insert or update on public.system_audit_logs
      for each row execute function public.sync_system_audit_log_action_columns()';
  end if;
end $$;

-- ---------------------------------------------------------
-- RLS: allow super admins to read logs (idempotent)
-- ---------------------------------------------------------
do $$
begin
  if to_regclass('public.system_audit_logs') is not null then
    execute 'alter table public.system_audit_logs enable row level security';
    execute 'drop policy if exists "system_audit_logs_select_super_admin" on public.system_audit_logs';
    execute 'create policy "system_audit_logs_select_super_admin"
      on public.system_audit_logs
      for select
      to authenticated
      using (public.is_super_admin())';
  end if;
end $$;

-- ---------------------------------------------------------
-- Helpful indexes (idempotent)
-- ---------------------------------------------------------
do $$
begin
  if to_regclass('public.system_audit_logs') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='system_audit_logs' and column_name='action_type'
    ) then
      execute 'create index if not exists system_audit_logs_action_type_idx on public.system_audit_logs (action_type)';
    end if;

    execute 'create index if not exists system_audit_logs_user_id_created_at_idx on public.system_audit_logs (user_id, created_at desc)';
  end if;
end $$;

commit;
