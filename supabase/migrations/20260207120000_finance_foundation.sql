-- File: supabase/migrations/20260207120000_finance_foundation.sql
-- NOTE: This migration previously defined finance tables that later migrations redefine with a different schema.
-- To keep migrations deterministic and avoid schema conflicts, this file now only provides shared helpers
-- (used by later finance/staff migrations) and does not create any finance domain tables.

begin;

-- Ensure pgcrypto exists for gen_random_uuid().
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Trigger helper: updates updated_at and updated_by (if the column exists on the target table).
-- IMPORTANT: only attach this trigger to tables that include updated_at and updated_by columns.
create or replace function public.tg_set_updated_columns()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if to_jsonb(new) ? 'updated_by' then
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

commit;
