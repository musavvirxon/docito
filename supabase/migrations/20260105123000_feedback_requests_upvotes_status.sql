-- 1) Add status & upvote_count to feedback_requests
alter table public.feedback_requests
  add column if not exists upvotes_count integer not null default 0,
  add column if not exists status text not null default 'new'
    check (status in ('new', 'working', 'done'));

-- 2) Votes table (one vote per user per request)
create table if not exists public.feedback_votes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  request_id uuid not null references public.feedback_requests(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  unique (request_id, user_id)
);

alter table public.feedback_votes enable row level security;

-- Authenticated users can vote
drop policy if exists "feedback_votes_insert_authenticated" on public.feedback_votes;
create policy "feedback_votes_insert_authenticated"
on public.feedback_votes
for insert
to authenticated
with check (auth.uid() = user_id);

-- Authenticated users can remove their vote
drop policy if exists "feedback_votes_delete_own" on public.feedback_votes;
create policy "feedback_votes_delete_own"
on public.feedback_votes
for delete
to authenticated
using (auth.uid() = user_id);

-- 3) Make feedback_requests list readable by authenticated users
-- (So everyone logged-in can see the global list and vote)
drop policy if exists "feedback_requests_select_authenticated" on public.feedback_requests;
create policy "feedback_requests_select_authenticated"
on public.feedback_requests
for select
to authenticated
using (true);

-- 4) Only super_admin can update status
drop policy if exists "feedback_requests_update_super_admin" on public.feedback_requests;
create policy "feedback_requests_update_super_admin"
on public.feedback_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'super_admin'
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'super_admin'
  )
);

-- 5) Trigger to keep feedback_requests.upvotes_count in sync
create or replace function public.sync_feedback_upvotes_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    update public.feedback_requests
      set upvotes_count = upvotes_count + 1
      where id = new.request_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.feedback_requests
      set upvotes_count = greatest(upvotes_count - 1, 0)
      where id = old.request_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_feedback_votes_insert on public.feedback_votes;
create trigger trg_feedback_votes_insert
after insert on public.feedback_votes
for each row execute function public.sync_feedback_upvotes_count();

drop trigger if exists trg_feedback_votes_delete on public.feedback_votes;
create trigger trg_feedback_votes_delete
after delete on public.feedback_votes
for each row execute function public.sync_feedback_upvotes_count();
