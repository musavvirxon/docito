begin;


alter table public.profiles enable row level security;

drop policy if exists "Public can view public verified doctor profiles" on public.profiles;

create policy "Public can view public verified doctor profiles"
on public.profiles
for select
using (
  profile_visibility = 'public'
  and exists (
    select 1
    from public.doctors d
    where d.user_id = profiles.user_id
      and coalesce(d.verified, false) = true
  )
);

commit;
