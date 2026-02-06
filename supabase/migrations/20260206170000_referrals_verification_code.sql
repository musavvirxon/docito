-- File: supabase/migrations/20260206170000_referrals_verification_code.sql
-- Adds verifiable referral codes and a public verification RPC.

begin;

create extension if not exists pgcrypto;

alter table public.referrals
  add column if not exists verification_code text;

do $$
begin
  -- Default for new rows
  begin
    alter table public.referrals
      alter column verification_code
      set default encode(gen_random_bytes(10), 'hex');
  exception when others then
    -- ignore if default cannot be set (older Postgres versions / permissions)
    null;
  end;
end $$;

-- Backfill existing rows
update public.referrals
set verification_code = encode(gen_random_bytes(10), 'hex')
where verification_code is null or verification_code = '';

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'uq_referrals_verification_code'
  ) then
    create unique index uq_referrals_verification_code
      on public.referrals(verification_code);
  end if;
end $$;

create or replace function public.trg_referrals_set_verification_code()
returns trigger
language plpgsql
as $$
begin
  if new.verification_code is null or new.verification_code = '' then
    new.verification_code := encode(gen_random_bytes(10), 'hex');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_referrals_set_verification_code on public.referrals;

create trigger trg_referrals_set_verification_code
before insert on public.referrals
for each row
execute function public.trg_referrals_set_verification_code();

-- Public verification endpoint (used by docito.app verify screen)
create or replace function public.verify_referral(
  p_referral_number text,
  p_verification_code text
)
returns table (
  referral_id uuid,
  referral_number text,
  status text,
  valid_from date,
  valid_until date,
  receiver_type public.referral_entity_type,
  receiver_entity_id uuid,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    r.id as referral_id,
    r.referral_number,
    r.status::text,
    r.valid_from,
    r.valid_until,
    r.receiver_type,
    r.receiver_entity_id,
    r.created_at
  from public.referrals r
  where r.referral_number = p_referral_number
    and r.verification_code = p_verification_code
  limit 1
$$;

revoke all on function public.verify_referral(text, text) from public;
grant execute on function public.verify_referral(text, text) to anon, authenticated;

commit;
