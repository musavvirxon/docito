-- Feedback center: bug reports & feature requests
-- Run in Supabase SQL editor or via migrations pipeline

create table if not exists public.feedback_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),
  kind text not null check (kind in ('bug', 'feature')),
  role text not null,
  subject text not null,
  description text not null,
  severity text,
  priority text,
  page_path text,
  language text,
  user_agent text,
  status text not null default 'new'
);

alter table public.feedback_requests enable row level security;

-- Authenticated users can submit
drop policy if exists "feedback_requests_insert_authenticated" on public.feedback_requests;
create policy "feedback_requests_insert_authenticated"
on public.feedback_requests
for insert
to authenticated
with check (auth.uid() = created_by);

-- Only super_admin can read everything (optional but recommended)
drop policy if exists "feedback_requests_select_super_admin" on public.feedback_requests;
create policy "feedback_requests_select_super_admin"
on public.feedback_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'super_admin'
  )
);
