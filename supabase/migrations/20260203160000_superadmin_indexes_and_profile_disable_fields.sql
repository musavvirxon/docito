-- supabase/migrations/20260203160000_superadmin_indexes_and_profile_disable_fields.sql
begin;

-- ---------------------------------------------------------
-- Profiles: add optional disable fields (idempotent)
-- ---------------------------------------------------------
do $$
begin
  if to_regclass('public.profiles') is not null then
    -- Only add if missing
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'disabled'
    ) then
      execute 'alter table public.profiles add column disabled boolean not null default false';
    end if;

    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'disabled_at'
    ) then
      execute 'alter table public.profiles add column disabled_at timestamptz null';
    end if;

    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'disabled_reason'
    ) then
      execute 'alter table public.profiles add column disabled_reason text null';
    end if;
  end if;
end $$;

-- ---------------------------------------------------------
-- Clean duplicates before adding unique index (idempotent)
-- ---------------------------------------------------------
do $$
begin
  if to_regclass('public.user_roles') is not null then
    execute '
      delete from public.user_roles a
      using public.user_roles b
      where a.ctid < b.ctid
        and a.user_id = b.user_id
        and a.role = b.role
    ';
  end if;
end $$;

-- ---------------------------------------------------------
-- Indexes for superadmin UX (idempotent)
-- ---------------------------------------------------------
do $$
begin
  -- profiles email search (case-insensitive)
  if to_regclass('public.profiles') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema='public' and table_name='profiles' and column_name='email'
    ) then
      execute 'create index if not exists profiles_email_lower_idx on public.profiles (lower(email))';
    end if;

    execute 'create index if not exists profiles_created_at_idx on public.profiles (created_at)';
  end if;

  -- user_roles lookup + uniqueness
  if to_regclass('public.user_roles') is not null then
    execute 'create index if not exists user_roles_user_id_idx on public.user_roles (user_id)';
    execute 'create index if not exists user_roles_role_idx on public.user_roles (role)';
    execute 'create unique index if not exists user_roles_user_id_role_uq on public.user_roles (user_id, role)';
  end if;

  -- audit logs ordering
  if to_regclass('public.system_audit_logs') is not null then
    execute 'create index if not exists system_audit_logs_created_at_idx on public.system_audit_logs (created_at desc)';
    execute 'create index if not exists system_audit_logs_action_type_idx on public.system_audit_logs (action_type)';
    execute 'create index if not exists system_audit_logs_entity_idx on public.system_audit_logs (entity_type, entity_id)';
  end if;

  -- doctor verification queue speed
  if to_regclass('public.doctor_verification') is not null then
    execute 'create index if not exists doctor_verification_status_created_at_idx on public.doctor_verification (status, created_at desc)';
    execute 'create index if not exists doctor_verification_doctor_id_idx on public.doctor_verification (doctor_id)';
  end if;

  if to_regclass('public.doctor_verification_documents') is not null then
    execute 'create index if not exists doctor_verification_documents_vid_uploaded_idx on public.doctor_verification_documents (doctor_verification_id, uploaded_at desc)';
  end if;
end $$;

commit;
