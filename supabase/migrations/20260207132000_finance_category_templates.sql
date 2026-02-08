-- File: supabase/migrations/20260207132000_finance_category_templates.sql

/*
  Step 12: Default finance categories (templates) + optional seed data

  Goals:
  - Provide a standard set of categories for expenses (supplies, utilities, taxes, etc.)
  - Keep it idempotent and safe
  - Frontend will call an Edge Function to "ensure" default categories for an entity

  Notes:
  - This does NOT auto-apply templates to entities in SQL (since we don't have a guaranteed entity-creation trigger here).
  - Instead, Step 12 adds templates + seeds them, then the Edge Function copies missing ones into finance_categories.
*/

create extension if not exists pgcrypto;

create table if not exists public.finance_category_templates (
  id uuid primary key default gen_random_uuid(),
  kind text not null, -- 'income' | 'expense' | 'payroll' | 'transfer' | 'adjustment'
  name text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'finance_category_templates_kind_chk'
  ) then
    alter table public.finance_category_templates
      add constraint finance_category_templates_kind_chk
      check (kind in ('income','expense','payroll','transfer','adjustment'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'finance_category_templates_name_nonempty_chk'
  ) then
    alter table public.finance_category_templates
      add constraint finance_category_templates_name_nonempty_chk
      check (length(trim(name)) > 0);
  end if;
end $$;

create unique index if not exists finance_category_templates_kind_name_uniq
  on public.finance_category_templates (kind, lower(name));

create index if not exists finance_category_templates_sort_idx
  on public.finance_category_templates (kind, sort_order, name);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'tg_finance_category_templates_updated'
  ) then
    create trigger tg_finance_category_templates_updated
    before update on public.finance_category_templates
    for each row
    execute function public.tg_set_updated_columns();
  end if;
end $$;

alter table public.finance_category_templates enable row level security;

do $$
begin
  -- Readable by authenticated users (low risk; no sensitive data)
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='finance_category_templates' and policyname='finance_category_templates_select'
  ) then
    create policy finance_category_templates_select
      on public.finance_category_templates
      for select
      to authenticated
      using (auth.uid() is not null);
  end if;

  -- Only admins should edit templates. We keep inserts/updates/deletes disabled by default (no policies).
end $$;

-- Seed defaults (idempotent via unique index)
insert into public.finance_category_templates (kind, name, is_active, sort_order)
values
  ('income', 'Services', true, 10),
  ('income', 'Product sales', true, 20),
  ('income', 'Other income', true, 90),

  ('expense', 'Supplies', true, 10),
  ('expense', 'Utilities (water/electricity/gas/heating)', true, 20),
  ('expense', 'Rent', true, 30),
  ('expense', 'Taxes', true, 40),
  ('expense', 'Maintenance', true, 50),
  ('expense', 'Marketing', true, 60),
  ('expense', 'Other expense', true, 90),

  ('payroll', 'Payroll', true, 10),

  ('transfer', 'Transfers', true, 10),
  ('adjustment', 'Adjustments', true, 10)
on conflict (kind, lower(name)) do update
set
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;
