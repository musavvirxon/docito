-- Path: supabase/migrations/20260117200000_phase5_audit_notifications_verification.sql
begin;

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Generic access helper (SECURITY DEFINER) for entity-scoped permissions
-- -----------------------------------------------------------------------------
create or replace function public.has_entity_access(p_entity_type text, p_entity_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or p_entity_id is null then
    return false;
  end if;

  if p_entity_type = 'clinic' then
    return exists (select 1 from public.practices x where x.id = p_entity_id and x.admin_id = uid)
      or exists (select 1 from public.clinic_staff s where s.practice_id = p_entity_id and s.user_id = uid and s.status = 'active');
  end if;

  if p_entity_type = 'lab' then
    return exists (select 1 from public.lab_centers x where x.id = p_entity_id and x.admin_id = uid)
      or exists (select 1 from public.lab_staff s where s.lab_center_id = p_entity_id and s.user_id = uid and s.status = 'active');
  end if;

  if p_entity_type = 'imaging' then
    return exists (select 1 from public.imaging_centers x where x.id = p_entity_id and x.admin_id = uid)
      or exists (select 1 from public.imaging_staff s where s.imaging_center_id = p_entity_id and s.user_id = uid and s.status = 'active');
  end if;

  if p_entity_type = 'pharmacy' then
    return exists (select 1 from public.pharmacies x where x.id = p_entity_id and x.admin_id = uid)
      or exists (select 1 from public.pharmacy_staff s where s.pharmacy_id = p_entity_id and s.user_id = uid and s.status = 'active');
  end if;

  return false;
end;
$$;

grant execute on function public.has_entity_access(text, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- AUDIT LOG
-- -----------------------------------------------------------------------------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_user_id uuid null,
  action text not null,
  entity_type text null,
  entity_id uuid null,
  target_type text null,
  target_id uuid null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_audit_log_occurred_at on public.audit_log (occurred_at desc);
create index if not exists idx_audit_log_actor on public.audit_log (actor_user_id);
create index if not exists idx_audit_log_entity on public.audit_log (entity_type, entity_id);
create index if not exists idx_audit_log_target on public.audit_log (target_type, target_id);

alter table public.audit_log enable row level security;

drop policy if exists "Audit log: user can view entity-scoped entries" on public.audit_log;

create policy "Audit log: user can view entity-scoped entries"
on public.audit_log
for select
using (
  (actor_user_id = auth.uid())
  or (
    entity_type in ('clinic','lab','imaging','pharmacy')
    and public.has_entity_access(entity_type, entity_id)
  )
);

-- Audit insert helper (SECURITY DEFINER) so triggers can write without RLS issues
create or replace function public.audit_write(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_target_type text,
  p_target_id uuid,
  p_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log(actor_user_id, action, entity_type, entity_id, target_type, target_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_target_type, p_target_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

grant execute on function public.audit_write(text, text, uuid, text, uuid, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- NOTIFICATIONS (user-scoped inbox)
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  entity_type text null,
  entity_id uuid null,
  role_scope text null,
  level text not null default 'info', -- info|success|warning|error
  title text not null,
  body text null,
  action_url text null,
  read_at timestamptz null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_notifications_user_created on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_user_read on public.notifications (user_id, read_at);

alter table public.notifications enable row level security;

drop policy if exists "Notifications: user can read own" on public.notifications;
drop policy if exists "Notifications: user can update own (mark read)" on public.notifications;

create policy "Notifications: user can read own"
on public.notifications
for select
using (user_id = auth.uid());

create policy "Notifications: user can update own (mark read)"
on public.notifications
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Create notification helper (SECURITY DEFINER)
create or replace function public.notify_user(
  p_user_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_role_scope text,
  p_level text,
  p_title text,
  p_body text,
  p_action_url text,
  p_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;

  insert into public.notifications(
    user_id, entity_type, entity_id, role_scope, level, title, body, action_url, metadata
  )
  values (
    p_user_id,
    p_entity_type,
    p_entity_id,
    p_role_scope,
    coalesce(nullif(p_level,''), 'info'),
    coalesce(p_title, 'Notification'),
    p_body,
    p_action_url,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

grant execute on function public.notify_user(uuid, text, uuid, text, text, text, text, text, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- VERIFICATION SUBMISSIONS (draft + submitted)
-- -----------------------------------------------------------------------------
create table if not exists public.verification_submissions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('clinic','lab','imaging','pharmacy')),
  entity_id uuid not null,
  submitted_by uuid not null,
  status text not null default 'draft' check (status in ('draft','submitted','approved','rejected')),
  payload jsonb not null default '{}'::jsonb,
  submitted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_verification_submissions_entity_draft
on public.verification_submissions(entity_type, entity_id)
where status = 'draft';

create index if not exists idx_verification_submissions_entity on public.verification_submissions(entity_type, entity_id);
create index if not exists idx_verification_submissions_status on public.verification_submissions(status, created_at desc);

alter table public.verification_submissions enable row level security;

drop policy if exists "Verification: entity access can read" on public.verification_submissions;
drop policy if exists "Verification: entity access can create draft" on public.verification_submissions;
drop policy if exists "Verification: entity access can update draft" on public.verification_submissions;

create policy "Verification: entity access can read"
on public.verification_submissions
for select
using (
  public.has_entity_access(entity_type, entity_id)
  and (
    submitted_by = auth.uid()
    or status <> 'draft'
    or status = 'draft'
  )
);

create policy "Verification: entity access can create draft"
on public.verification_submissions
for insert
with check (
  public.has_entity_access(entity_type, entity_id)
  and submitted_by = auth.uid()
);

create policy "Verification: entity access can update draft"
on public.verification_submissions
for update
using (
  public.has_entity_access(entity_type, entity_id)
  and (submitted_by = auth.uid())
  and status = 'draft'
)
with check (
  public.has_entity_access(entity_type, entity_id)
  and (submitted_by = auth.uid())
);

-- updated_at trigger support (function exists in repo earlier; create if missing)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_verification_submissions_updated_at on public.verification_submissions;
create trigger trg_verification_submissions_updated_at
before update on public.verification_submissions
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Trigger helpers for audit + notifications for core lifecycle changes
-- -----------------------------------------------------------------------------

-- 1) Referrals lifecycle auditing + notify receiver admin on new referral
create or replace function public.trg_referrals_audit_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  receiver_admin uuid;
  e_type text;
  action_url text;
  meta jsonb;
begin
  if tg_op = 'INSERT' then
    e_type := null;
    if new.receiver_type = 'imaging_center' then
      e_type := 'imaging';
      select ic.admin_id into receiver_admin from public.imaging_centers ic where ic.id = new.receiver_entity_id;
    elsif new.receiver_type = 'lab_center' then
      e_type := 'lab';
      select lc.admin_id into receiver_admin from public.lab_centers lc where lc.id = new.receiver_entity_id;
    elsif new.receiver_type = 'pharmacy' then
      e_type := 'pharmacy';
      select ph.admin_id into receiver_admin from public.pharmacies ph where ph.id = new.receiver_entity_id;
    elsif new.receiver_type = 'clinic' then
      e_type := 'clinic';
      select pr.admin_id into receiver_admin from public.practices pr where pr.id = new.receiver_entity_id;
    end if;

    meta := jsonb_build_object(
      'referral_id', new.id,
      'referral_number', new.referral_number,
      'receiver_type', new.receiver_type,
      'receiver_entity_id', new.receiver_entity_id,
      'priority', new.priority,
      'status', new.status
    );

    perform public.audit_write(
      'referral.created',
      e_type,
      new.receiver_entity_id,
      'referral',
      new.id,
      meta
    );

    action_url := case
      when e_type = 'imaging' then '/imaging/orders'
      when e_type = 'lab' then '/lab/orders'
      when e_type = 'pharmacy' then '/pharmacy/orders'
      when e_type = 'clinic' then '/clinic/referrals'
      else null
    end;

    if receiver_admin is not null then
      perform public.notify_user(
        receiver_admin,
        e_type,
        new.receiver_entity_id,
        'admin',
        'info',
        'New referral received',
        coalesce(new.reason, 'A new referral has been received.'),
        action_url,
        meta
      );
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if coalesce(old.status,'') <> coalesce(new.status,'') then
      meta := jsonb_build_object(
        'referral_id', new.id,
        'referral_number', new.referral_number,
        'old_status', old.status,
        'new_status', new.status
      );

      perform public.audit_write(
        'referral.status_changed',
        null,
        null,
        'referral',
        new.id,
        meta
      );
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_referrals_audit_notify on public.referrals;
create trigger trg_referrals_audit_notify
after insert or update on public.referrals
for each row execute function public.trg_referrals_audit_notify();

-- 2) Imaging order state: audit workflow changes + notify assigned staff user (if resolvable)
create or replace function public.trg_imaging_order_state_audit_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_user uuid;
  meta jsonb;
begin
  if tg_op = 'INSERT' then
    meta := jsonb_build_object(
      'referral_id', new.referral_id,
      'imaging_center_id', new.imaging_center_id,
      'workflow_status', new.workflow_status,
      'priority', new.priority,
      'assigned_staff_id', new.assigned_staff_id
    );

    perform public.audit_write(
      'imaging.workflow.created',
      'imaging',
      new.imaging_center_id,
      'referral',
      new.referral_id,
      meta
    );

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if coalesce(old.workflow_status,'') <> coalesce(new.workflow_status,'') then
      meta := jsonb_build_object(
        'referral_id', new.referral_id,
        'imaging_center_id', new.imaging_center_id,
        'old_workflow_status', old.workflow_status,
        'new_workflow_status', new.workflow_status,
        'assigned_staff_id', new.assigned_staff_id
      );

      perform public.audit_write(
        'imaging.workflow.status_changed',
        'imaging',
        new.imaging_center_id,
        'referral',
        new.referral_id,
        meta
      );

      if new.assigned_staff_id is not null then
        select s.user_id into assigned_user
        from public.imaging_staff s
        where s.id = new.assigned_staff_id;

        if assigned_user is not null then
          perform public.notify_user(
            assigned_user,
            'imaging',
            new.imaging_center_id,
            'assigned_staff',
            'info',
            'Imaging workflow updated',
            'An order status was updated to: ' || coalesce(new.workflow_status,''),
            '/imaging/orders',
            meta
          );
        end if;
      end if;
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_imaging_order_state_audit_notify on public.imaging_order_state;
create trigger trg_imaging_order_state_audit_notify
after insert or update on public.imaging_order_state
for each row execute function public.trg_imaging_order_state_audit_notify();

-- 3) Pharmacy fulfillment orders: audit status changes + notify pharmacy admin
create or replace function public.trg_fulfillment_orders_audit_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_user uuid;
  meta jsonb;
begin
  if tg_op = 'INSERT' then
    select p.admin_id into admin_user from public.pharmacies p where p.id = new.pharmacy_id;

    meta := jsonb_build_object(
      'fulfillment_order_id', new.id,
      'pharmacy_id', new.pharmacy_id,
      'status', new.status,
      'payment_status', new.payment_status
    );

    perform public.audit_write(
      'pharmacy.order.created',
      'pharmacy',
      new.pharmacy_id,
      'fulfillment_order',
      new.id,
      meta
    );

    if admin_user is not null then
      perform public.notify_user(
        admin_user,
        'pharmacy',
        new.pharmacy_id,
        'admin',
        'info',
        'New fulfillment order',
        'A new fulfillment order was created.',
        '/pharmacy/orders',
        meta
      );
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if coalesce(old.status,'') <> coalesce(new.status,'') then
      select p.admin_id into admin_user from public.pharmacies p where p.id = new.pharmacy_id;

      meta := jsonb_build_object(
        'fulfillment_order_id', new.id,
        'pharmacy_id', new.pharmacy_id,
        'old_status', old.status,
        'new_status', new.status
      );

      perform public.audit_write(
        'pharmacy.order.status_changed',
        'pharmacy',
        new.pharmacy_id,
        'fulfillment_order',
        new.id,
        meta
      );

      if admin_user is not null then
        perform public.notify_user(
          admin_user,
          'pharmacy',
          new.pharmacy_id,
          'admin',
          'info',
          'Order status updated',
          'Order status changed to: ' || coalesce(new.status,''),
          '/pharmacy/orders',
          meta
        );
      end if;
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_fulfillment_orders_audit_notify on public.fulfillment_orders;
create trigger trg_fulfillment_orders_audit_notify
after insert or update on public.fulfillment_orders
for each row execute function public.trg_fulfillment_orders_audit_notify();

-- -----------------------------------------------------------------------------
-- PostgREST schema reload
-- -----------------------------------------------------------------------------
select pg_notify('pgrst', 'reload schema');

commit;
