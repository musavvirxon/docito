begin;

create or replace function public.create_direct_conversation(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid;
  conv_id uuid;
begin
  me := auth.uid();
  if me is null then
    raise exception 'not_authenticated';
  end if;

  if target_user_id is null then
    raise exception 'target_user_id_required';
  end if;

  if target_user_id = me then
    raise exception 'cannot_message_self';
  end if;

  if not exists (select 1 from public.profiles p where p.user_id = target_user_id) then
    raise exception 'target_user_not_found';
  end if;

  -- Reuse existing non-context direct conversation between the two users (exactly 2 participants)
  select c.id
    into conv_id
  from public.conversations c
  where c.type = 'direct'
    and (c.context_type is null or c.context_type = '')
    and exists (
      select 1
      from public.conversation_participants cp
      where cp.conversation_id = c.id
        and cp.user_id = me
    )
    and exists (
      select 1
      from public.conversation_participants cp
      where cp.conversation_id = c.id
        and cp.user_id = target_user_id
    )
    and (select count(*) from public.conversation_participants cp where cp.conversation_id = c.id) = 2
  order by c.created_at desc
  limit 1;

  if conv_id is not null then
    return conv_id;
  end if;

  insert into public.conversations (type, name, created_by, metadata, context_type, context_id)
  values ('direct', null, me, '{}'::jsonb, null, null)
  returning id into conv_id;

  insert into public.conversation_participants (conversation_id, user_id, role)
  values (conv_id, me, 'member')
  on conflict do nothing;

  insert into public.conversation_participants (conversation_id, user_id, role)
  values (conv_id, target_user_id, 'member')
  on conflict do nothing;

  return conv_id;
end;
$$;

grant execute on function public.create_direct_conversation(uuid) to authenticated;

-- Allow any authenticated user to create group conversations with any set of valid users.
create or replace function public.create_group_conversation(p_name text, p_participant_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid;
  conv_id uuid;
  ids uuid[];
  uid uuid;
begin
  me := auth.uid();
  if me is null then
    raise exception 'not_authenticated';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'group_name_required';
  end if;

  ids := coalesce(p_participant_ids, '{}'::uuid[]);

  -- Ensure caller is included
  if not (me = any(ids)) then
    ids := array_append(ids, me);
  end if;

  -- Dedupe and drop nulls
  select array_agg(distinct x)
    into ids
  from unnest(ids) as x
  where x is not null;

  -- Require at least 3 total participants (caller + 2 others)
  if array_length(ids, 1) is null or array_length(ids, 1) < 3 then
    raise exception 'group_requires_at_least_3_participants';
  end if;

  -- Ensure all participants exist
  if exists (
    select 1
    from unnest(ids) u
    left join public.profiles p on p.user_id = u
    where p.user_id is null
  ) then
    raise exception 'one_or_more_participants_not_found';
  end if;

  insert into public.conversations (type, name, created_by, metadata, context_type, context_id)
  values ('group', btrim(p_name), me, '{}'::jsonb, null, null)
  returning id into conv_id;

  foreach uid in array ids loop
    insert into public.conversation_participants (conversation_id, user_id, role)
    values (conv_id, uid, case when uid = me then 'admin' else 'member' end)
    on conflict do nothing;
  end loop;

  return conv_id;
end;
$$;

grant execute on function public.create_group_conversation(text, uuid[]) to authenticated;

-- Search across ALL users (any role/entity), returning role info for display.
create or replace function public.search_chat_users(p_query text default '')
returns table(
  user_id uuid,
  full_name text,
  avatar_url text,
  highest_role text,
  roles text[]
)
language sql
security definer
set search_path = public
as $$
  with q as (
    select nullif(btrim(coalesce(p_query,'')), '') as term,
           auth.uid() as me
  ),
  base as (
    select
      p.user_id,
      p.full_name,
      p.avatar_url
    from public.profiles p, q
    where p.user_id is not null
      and p.user_id <> q.me
      and (
        q.term is null
        or p.full_name ilike '%' || q.term || '%'
        or p.user_id::text ilike '%' || q.term || '%'
      )
    order by p.full_name nulls last
    limit 50
  ),
  roles_agg as (
    select
      ur.user_id,
      array_agg(distinct ur.role::text order by ur.role::text) as roles,
      (array_agg(distinct ur.role::text order by ur.role::text))[1] as highest_role
    from public.user_roles ur
    group by ur.user_id
  )
  select
    b.user_id,
    b.full_name,
    b.avatar_url,
    r.highest_role,
    coalesce(r.roles, '{}'::text[]) as roles
  from base b
  left join roles_agg r on r.user_id = b.user_id;
$$;

grant execute on function public.search_chat_users(text) to authenticated;

commit;
