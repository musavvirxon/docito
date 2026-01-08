begin;

-- ============================================================
-- 1) Ensure RLS is enabled on core tables (safe)
-- ============================================================
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='appointments') then
    execute 'alter table public.appointments enable row level security';
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='referrals') then
    execute 'alter table public.referrals enable row level security';
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='conversations') then
    execute 'alter table public.conversations enable row level security';
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='conversation_participants') then
    execute 'alter table public.conversation_participants enable row level security';
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='conversation_messages') then
    execute 'alter table public.conversation_messages enable row level security';
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='messages') then
    execute 'alter table public.messages enable row level security';
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='payments') then
    execute 'alter table public.payments enable row level security';
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='invoices') then
    execute 'alter table public.invoices enable row level security';
  end if;
end $$;

-- ============================================================
-- 2) Add performance indexes (safe)
-- ============================================================
do $$
begin
  -- referrals indexes
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='referrals') then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='referrals' and column_name='patient_id') then
      execute 'create index if not exists idx_referrals_patient_id on public.referrals (patient_id)';
    end if;

    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='referrals' and column_name='referrer_entity_id') then
      execute 'create index if not exists idx_referrals_referrer_entity_id on public.referrals (referrer_entity_id)';
    end if;

    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='referrals' and column_name='receiver_entity_id') then
      execute 'create index if not exists idx_referrals_receiver_entity_id on public.referrals (receiver_entity_id)';
    end if;

    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='referrals' and column_name='conversation_id') then
      execute 'create index if not exists idx_referrals_conversation_id on public.referrals (conversation_id)';
    end if;

    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='referrals' and column_name='status') then
      execute 'create index if not exists idx_referrals_status on public.referrals (status)';
    end if;
  end if;

  -- conversation_participants indexes
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='conversation_participants') then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='conversation_participants' and column_name='conversation_id') then
      execute 'create index if not exists idx_conv_participants_conversation on public.conversation_participants (conversation_id)';
    end if;

    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='conversation_participants' and column_name='user_id') then
      execute 'create index if not exists idx_conv_participants_user on public.conversation_participants (user_id)';
    end if;
  end if;

  -- conversation messages
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='conversation_messages') then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='conversation_messages' and column_name='conversation_id') then
      execute 'create index if not exists idx_conv_messages_conversation on public.conversation_messages (conversation_id)';
    end if;

    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='conversation_messages' and column_name='created_at') then
      execute 'create index if not exists idx_conv_messages_created_at on public.conversation_messages (created_at)';
    end if;
  end if;
end $$;

-- ============================================================
-- 3) Referral status constraint (only if status is text)
-- ============================================================
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='referrals' and column_name='status'
  ) then
    -- Add a constraint only if status is not already an enum.
    -- If status is enum, this will fail because pg_typeof differs; so we guard via exception.
    begin
      execute '
        alter table public.referrals
        add constraint referrals_status_allowed
        check (status in (
          ''pending'',
          ''sent'',
          ''received'',
          ''accepted'',
          ''rejected'',
          ''scheduled'',
          ''completed'',
          ''cancelled''
        ))
      ';
    exception when duplicate_object then
      null;
    when others then
      -- likely enum or different setup; ignore
      null;
    end;
  end if;
end $$;

-- ============================================================
-- 4) Prevent orphan referrals (patient_id required)
-- ============================================================
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='referrals' and column_name='patient_id'
  ) then
    begin
      execute 'alter table public.referrals alter column patient_id set not null';
    exception when others then
      -- If you already have nulls in prod, this will fail.
      -- Clean them first, then re-run.
      null;
    end;
  end if;
end $$;

commit;
