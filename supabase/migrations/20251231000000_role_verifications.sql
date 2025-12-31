-- Role verification per-role, independent statuses per account.
-- This supports: "verification is separate for each role"

create table if not exists public.role_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  status text not null default 'unverified', -- unverified | pending | verified | rejected
  metadata jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists role_verifications_user_role_unique
  on public.role_verifications(user_id, role);

alter table public.role_verifications enable row level security;

-- Users can read their own role verification states
create policy "role_verifications_select_own"
on public.role_verifications
for select
to authenticated
using (user_id = auth.uid());

-- Users can create or update their own verification request (pending)
create policy "role_verifications_insert_own"
on public.role_verifications
for insert
to authenticated
with check (user_id = auth.uid());

create policy "role_verifications_update_own"
on public.role_verifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Optional: helper trigger to keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_role_verifications_updated_at on public.role_verifications;
create trigger trg_role_verifications_updated_at
before update on public.role_verifications
for each row execute function public.set_updated_at();
