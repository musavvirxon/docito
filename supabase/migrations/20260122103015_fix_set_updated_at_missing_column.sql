begin;

alter table if exists public.doctor_verification_submissions
  add column if not exists updated_at timestamptz;

alter table if exists public.country_verification_profiles
  add column if not exists updated_at timestamptz;


do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='doctor_verification_submissions' and column_name='updated_at'
  ) then
    execute 'update public.doctor_verification_submissions set updated_at = now() where updated_at is null';
    execute 'alter table public.doctor_verification_submissions alter column updated_at set default now()';
    execute 'alter table public.doctor_verification_submissions alter column updated_at set not null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='country_verification_profiles' and column_name='updated_at'
  ) then
    execute 'update public.country_verification_profiles set updated_at = now() where updated_at is null';
    execute 'alter table public.country_verification_profiles alter column updated_at set default now()';
    execute 'alter table public.country_verification_profiles alter column updated_at set not null';
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  begin
  
    new.updated_at := now();
  exception
    when undefined_column then
      null;
    when others then
      null;
  end;

  return new;
end;
$$;

drop trigger if exists trg_doctor_verif_submissions_updated_at on public.doctor_verification_submissions;
create trigger trg_doctor_verif_submissions_updated_at
before update on public.doctor_verification_submissions
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_country_verif_profiles_updated_at on public.country_verification_profiles;
create trigger trg_country_verif_profiles_updated_at
before update on public.country_verification_profiles
for each row execute procedure public.set_updated_at();

commit;
