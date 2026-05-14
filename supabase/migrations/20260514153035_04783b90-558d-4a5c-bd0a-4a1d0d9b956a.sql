create or replace function public.docito_make_referral_verification_code()
returns text
language sql
volatile
set search_path = public
as $$
  select 'RF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
$$;

alter table public.referrals
  add column if not exists verification_code text;

update public.referrals
set verification_code = public.docito_make_referral_verification_code()
where verification_code is null or btrim(verification_code) = '';

alter table public.referrals
  alter column verification_code set default public.docito_make_referral_verification_code();

create unique index if not exists referrals_verification_code_uq
  on public.referrals (verification_code)
  where verification_code is not null;

create or replace function public.docito_set_referral_verification_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.verification_code is null or btrim(new.verification_code) = '' then
    new.verification_code := public.docito_make_referral_verification_code();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_referrals_set_verification_code on public.referrals;
create trigger trg_referrals_set_verification_code
before insert on public.referrals
for each row
execute function public.docito_set_referral_verification_code();