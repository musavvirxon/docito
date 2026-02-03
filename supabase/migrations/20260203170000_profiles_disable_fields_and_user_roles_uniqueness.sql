-- supabase/migrations/20260203170000_profiles_disable_fields_and_user_roles_uniqueness.sql
begin;

-- ---------------------------------------------------------
-- 1) Profiles: add disable fields used by Super Admin UI
--    (idempotent)
-- ---------------------------------------------------------
do $$
begin
  if to_regclass('public.profiles') is not null then

    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='profiles' and column_name='disabled'
    ) then
      execute 'alter table public.profiles add column disabled boolean not null default false';
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='profiles' and column_name='disabled_at'
    ) then
      execute 'alter table public.profiles add column disabled_at timestamptz null';
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='profiles' and column_name='disabled_reason'
    ) then
      execute 'alter table public.profiles add column disabled_reason text null';
    end if;

  end if;
end $$;

-- ---------------------------------------------------------
-- 2) user_roles: ensure uniqueness on (user_id, role)
--    (idempotent)
-- ---------------------------------------------------------
do $$
begin
  if to_regclass('public.user_roles') is not null then
    if not exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'user_roles'
        and c.conname = 'user_roles_user_id_role_key'
    ) then
      execute 'alter table public.user_roles add constraint user_roles_user_id_role_key unique (user_id, role)';
    end if;

    execute 'create index if not exists user_roles_user_id_idx on public.user_roles (user_id)';
    execute 'create index if not exists user_roles_role_idx on public.user_roles (role)';
  end if;
end $$;

commit;
