-- File: supabase/migrations/20260206180000_referrals_scope_verification_notify.sql
begin;

-- ============================================================
-- 1) Referral scope enum + columns for general/specific referrals
-- ============================================================
do $$ begin
  create type public.referral_scope as enum ('general', 'specific');
exception
  when duplicate_object then null;
end $$;

alter table public.referrals
  add column if not exists scope public.referral_scope default 'specific'::public.referral_scope,
  add column if not exists target_specialty_key text,
  add column if not exists target_service_label text,
  add column if not exists verification_code text;

-- ============================================================
-- 2) Verification code generator + ensure-on-insert trigger
-- ============================================================
create or replace function public.generate_referral_verification_code()
returns text
language sql
volatile
as $$
  select upper(encode(gen_random_bytes(6), 'hex'));
$$;

-- Ensure referral_number + verification_code exist on insert (and keep idempotent)
create or replace function public.trg_referrals_set_verification_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.referral_number is null or btrim(new.referral_number) = '' then
    new.referral_number := 'REF-' || substr(gen_random_uuid()::text, 1, 8);
  end if;

  if new.verification_code is null or btrim(new.verification_code) = '' then
    new.verification_code := public.generate_referral_verification_code();
  end if;

  if new.scope is null then
    new.scope := 'specific'::public.referral_scope;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_referrals_set_verification_code on public.referrals;
create trigger trg_referrals_set_verification_code
before insert on public.referrals
for each row
execute function public.trg_referrals_set_verification_code();

-- Keep a default on the column too (safe if column already exists)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'referrals'
      and column_name = 'verification_code'
  ) then
    begin
      execute 'alter table public.referrals alter column verification_code set default public.generate_referral_verification_code()';
    exception when others then
      null;
    end;
  end if;
end $$;

create index if not exists idx_referrals_refnum_verification
  on public.referrals (referral_number, verification_code);

-- ============================================================
-- 3) Patient notification when referral is SENT
--    (uses notify_user() when available; falls back safely)
-- ============================================================
create or replace function public.trg_referrals_notify_patient_on_sent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_body text;
  v_action_url text;
  v_meta jsonb;
begin
  -- Only notify on INSERT with status=sent OR UPDATE transition to sent
  if tg_op = 'INSERT' then
    if coalesce(new.status, '') <> 'sent' then
      return new;
    end if;
  elsif tg_op = 'UPDATE' then
    if coalesce(new.status, '') <> 'sent' then
      return new;
    end if;
    if coalesce(old.status, '') = 'sent' then
      return new;
    end if;
  else
    return new;
  end if;

  if new.patient_id is null then
    return new;
  end if;

  v_title := 'New referral';
  v_body := coalesce(nullif(new.reason, ''), 'A new referral has been sent to you.');
  v_action_url := '/patient-dashboard';

  v_meta := jsonb_build_object(
    'referral_id', new.id,
    'referral_number', new.referral_number,
    'status', new.status,
    'scope', new.scope,
    'receiver_type', new.receiver_type,
    'receiver_entity_id', new.receiver_entity_id,
    'referrer_type', new.referrer_type,
    'referrer_entity_id', new.referrer_entity_id
  );

  -- Preferred: notify_user() helper (modern notifications schema)
  begin
    execute 'select public.notify_user($1,$2,$3,$4,$5,$6,$7,$8,$9)'
      using new.patient_id, 'referral', new.id, 'patient', 'info', v_title, v_body, v_action_url, v_meta;
  exception
    when undefined_function then
      -- Fallback 1: modern notifications table insert (best-effort)
      begin
        execute '
          insert into public.notifications (user_id, entity_type, entity_id, role_scope, level, title, body, action_url, metadata)
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ' using new.patient_id, 'referral', new.id, 'patient', 'info', v_title, v_body, v_action_url, v_meta;
      exception
        when others then
          -- Fallback 2: legacy schema (best-effort)
          begin
            execute '
              insert into public.notifications (user_id, title, message, type, related_id, related_type)
              values ($1,$2,$3,$4,$5,$6)
            ' using new.patient_id, v_title, v_body, 'referral', new.id, 'referral';
          exception
            when others then
              null;
          end;
      end;
    when others then
      -- Never block the referral write due to notification failures
      null;
  end;

  return new;
end;
$$;

drop trigger if exists trg_referrals_notify_patient_on_sent on public.referrals;
create trigger trg_referrals_notify_patient_on_sent
after insert or update on public.referrals
for each row
execute function public.trg_referrals_notify_patient_on_sent();

-- ============================================================
-- 4) RLS: allow staff (facility staff tables) + admin to create referrals
--    (Any authenticated non-patient role is allowed by app; DB enforces membership)
-- ============================================================
alter table public.referrals enable row level security;

drop policy if exists "Referrals: clinic staff can create" on public.referrals;
create policy "Referrals: clinic staff can create"
on public.referrals
for insert
with check (
  referrer_type = 'clinic'
  and referrer_user_id = auth.uid()
  and exists (
    select 1
    from public.clinic_staff cs
    where cs.user_id = auth.uid()
      and cs.status = 'active'
      and cs.practice_id = referrer_entity_id
  )
);

drop policy if exists "Referrals: lab staff can create" on public.referrals;
create policy "Referrals: lab staff can create"
on public.referrals
for insert
with check (
  referrer_type = 'lab'
  and referrer_user_id = auth.uid()
  and exists (
    select 1
    from public.lab_staff ls
    where ls.user_id = auth.uid()
      and ls.status = 'active'
      and ls.lab_center_id = referrer_entity_id
  )
);

drop policy if exists "Referrals: imaging staff can create" on public.referrals;
create policy "Referrals: imaging staff can create"
on public.referrals
for insert
with check (
  referrer_type = 'imaging_center'
  and referrer_user_id = auth.uid()
  and exists (
    select 1
    from public.imaging_staff isf
    where isf.user_id = auth.uid()
      and isf.status = 'active'
      and isf.imaging_center_id = referrer_entity_id
  )
);

drop policy if exists "Referrals: pharmacy staff can create" on public.referrals;
create policy "Referrals: pharmacy staff can create"
on public.referrals
for insert
with check (
  referrer_type = 'pharmacy'
  and referrer_user_id = auth.uid()
  and exists (
    select 1
    from public.pharmacy_staff ps
    where ps.user_id = auth.uid()
      and ps.status = 'active'
      and ps.pharmacy_id = referrer_entity_id
  )
);

drop policy if exists "Referrals: admin can create" on public.referrals;
create policy "Referrals: admin can create"
on public.referrals
for insert
with check (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'super_admin')
);

commit;
