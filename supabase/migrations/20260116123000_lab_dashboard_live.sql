-- File: supabase/migrations/20260116123000_lab_dashboard_live.sql

begin;

-- 1) Lab center settings (for Settings section)
create table if not exists public.lab_center_settings (
  id uuid primary key default gen_random_uuid(),
  lab_center_id uuid not null references public.lab_centers(id) on delete cascade,
  timezone text not null default 'UTC',
  billing_currency text not null default 'usd',
  notify_email boolean not null default true,
  notify_sms boolean not null default false,
  auto_accept_referrals boolean not null default false,
  default_turnaround_hours integer not null default 24,
  report_template text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lab_center_id)
);

alter table public.lab_center_settings enable row level security;

-- updated_at trigger (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'update_lab_center_settings_updated_at'
  ) then
    create trigger update_lab_center_settings_updated_at
      before update on public.lab_center_settings
      for each row
      execute function public.update_updated_at_column();
  end if;
end $$;

-- RLS policies (idempotent via exception handler)
do $$
begin
  begin
    create policy "Lab staff can view lab center settings"
    on public.lab_center_settings
    for select
    using (
      exists (
        select 1 from public.lab_centers lc
        where lc.id = lab_center_settings.lab_center_id
        and lc.admin_id = auth.uid()
      )
      or exists (
        select 1 from public.lab_staff ls
        where ls.lab_center_id = lab_center_settings.lab_center_id
        and ls.user_id = auth.uid()
        and ls.status = 'active'
      )
    );
  exception when duplicate_object then null;
  end;

  begin
    create policy "Lab staff can create lab center settings"
    on public.lab_center_settings
    for insert
    with check (
      exists (
        select 1 from public.lab_centers lc
        where lc.id = lab_center_settings.lab_center_id
        and lc.admin_id = auth.uid()
      )
      or exists (
        select 1 from public.lab_staff ls
        where ls.lab_center_id = lab_center_settings.lab_center_id
        and ls.user_id = auth.uid()
        and ls.status = 'active'
      )
    );
  exception when duplicate_object then null;
  end;

  begin
    create policy "Lab staff can update lab center settings"
    on public.lab_center_settings
    for update
    using (
      exists (
        select 1 from public.lab_centers lc
        where lc.id = lab_center_settings.lab_center_id
        and lc.admin_id = auth.uid()
      )
      or exists (
        select 1 from public.lab_staff ls
        where ls.lab_center_id = lab_center_settings.lab_center_id
        and ls.user_id = auth.uid()
        and ls.status = 'active'
      )
    )
    with check (
      exists (
        select 1 from public.lab_centers lc
        where lc.id = lab_center_settings.lab_center_id
        and lc.admin_id = auth.uid()
      )
      or exists (
        select 1 from public.lab_staff ls
        where ls.lab_center_id = lab_center_settings.lab_center_id
        and ls.user_id = auth.uid()
        and ls.status = 'active'
      )
    );
  exception when duplicate_object then null;
  end;
end $$;

-- 2) Billing: ensure entity scoping columns exist + index
alter table public.billing_transactions
  add column if not exists entity_type text,
  add column if not exists entity_id uuid;

create index if not exists idx_billing_transactions_entity on public.billing_transactions(entity_type, entity_id);

-- 3) Billing: allow lab admins/staff to SELECT entity-scoped transactions
do $$
begin
  begin
    create policy "Lab centers can view their entity transactions"
    on public.billing_transactions
    for select
    using (
      billing_transactions.entity_type = 'lab_center'
      and (
        exists (
          select 1 from public.lab_centers lc
          where lc.id = billing_transactions.entity_id
          and lc.admin_id = auth.uid()
        )
        or exists (
          select 1 from public.lab_staff ls
          where ls.lab_center_id = billing_transactions.entity_id
          and ls.user_id = auth.uid()
          and ls.status = 'active'
        )
      )
    );
  exception when duplicate_object then null;
  end;
end $$;

commit;
