-- Path: supabase/migrations/20260127225000_user_settings_table_rls.sql
begin;

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.tg__set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
before update on public.user_settings
for each row
execute function public.tg__set_updated_at();

alter table public.user_settings enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'user_settings'
      and p.polname = 'user_settings_select_own'
  ) then
    create policy user_settings_select_own
      on public.user_settings
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'user_settings'
      and p.polname = 'user_settings_insert_own'
  ) then
    create policy user_settings_insert_own
      on public.user_settings
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'user_settings'
      and p.polname = 'user_settings_update_own'
  ) then
    create policy user_settings_update_own
      on public.user_settings
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'user_settings'
      and p.polname = 'user_settings_delete_own'
  ) then
    create policy user_settings_delete_own
      on public.user_settings
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

grant select, insert, update, delete on public.user_settings to authenticated;

commit;
