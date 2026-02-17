-- File: supabase/migrations/20260207123000_staff_compensation_profiles.sql
-- BOOTSTRAP: Minimal table needed for early foreign keys (e.g. payroll runs) without creating schema conflicts.
-- The full, canonical schema is applied later (see 20260207163000_staff_compensation_profiles.sql).

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.staff_compensation_profiles (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  staff_user_id uuid null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_compensation_profiles_entity_idx
  on public.staff_compensation_profiles (entity_type, entity_id);

create index if not exists staff_compensation_profiles_staff_user_idx
  on public.staff_compensation_profiles (staff_user_id);

commit;
