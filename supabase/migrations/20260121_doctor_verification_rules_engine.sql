create extension if not exists pgcrypto;

do $$ begin
  create type verification_submission_status as enum (
    'draft',
    'submitted',
    'under_review',
    'approved',
    'rejected'
  );
exception when duplicate_object then null;
end $$;


create table if not exists public.verification_document_types (
  code text primary key,
  label_key text not null,
  description_key text not null,
  accepted_mime text[] not null default array['application/pdf','image/png','image/jpeg'],
  requires_expiry boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.verification_rule_sets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_key text not null,
  version int not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.verification_rule_set_items (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references public.verification_rule_sets(id) on delete cascade,
  doc_type_code text not null references public.verification_document_types(code) on delete restrict,
  required boolean not null default true,
  validity_days int null,
  notes_key text null,
  requires_source_verification boolean not null default false,
  allowed_alternatives jsonb null, -- ex: {"anyOf":["PASSPORT","ID_NATIONAL"]}
  created_at timestamptz not null default now(),
  unique(rule_set_id, doc_type_code)
);

-- Country profiles mapping:
-- country_iso2 can be 'US', 'UZ', etc. We also support a default row using '*' as a special key.
create table if not exists public.country_verification_profiles (
  country_iso2 text primary key,
  profile_code text not null,
  rule_sets text[] not null default '{}',
  overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ----------------------------
-- 2) Submissions + files (protected)
-- NOTE: NO updated_at triggers/columns used here (removed to avoid NEW.updated_at errors)
-- ----------------------------

create table if not exists public.doctor_verification_submissions (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null, -- auth.users.id (or your doctors table id). Use your existing doctor user id.
  country_iso2 text not null,
  status verification_submission_status not null default 'draft',
  submitted_at timestamptz null,
  review_notes text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_doctor_verification_submissions_doctor
  on public.doctor_verification_submissions(doctor_id);

create table if not exists public.doctor_verification_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.doctor_verification_submissions(id) on delete cascade,
  doc_type_code text not null references public.verification_document_types(code) on delete restrict,
  file_path text not null,
  issued_at date null,
  expires_at date null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(submission_id, doc_type_code)
);

-- ----------------------------
-- 3) Admin check helper (adjust to your JWT structure)
-- ----------------------------
create or replace function public.is_docito_admin()
returns boolean language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','super_admin'),
    false
  );
$$;

-- ----------------------------
-- 4) RLS Policies
-- ----------------------------
alter table public.verification_document_types enable row level security;
alter table public.verification_rule_sets enable row level security;
alter table public.verification_rule_set_items enable row level security;
alter table public.country_verification_profiles enable row level security;

alter table public.doctor_verification_submissions enable row level security;
alter table public.doctor_verification_files enable row level security;

-- Reference tables: allow read to everyone (including anon), writes only to admins
drop policy if exists "read_all_verif_doc_types" on public.verification_document_types;
create policy "read_all_verif_doc_types"
on public.verification_document_types for select
to anon, authenticated
using (true);

drop policy if exists "admin_write_verif_doc_types" on public.verification_document_types;
create policy "admin_write_verif_doc_types"
on public.verification_document_types for all
to authenticated
using (public.is_docito_admin())
with check (public.is_docito_admin());

drop policy if exists "read_all_verif_rule_sets" on public.verification_rule_sets;
create policy "read_all_verif_rule_sets"
on public.verification_rule_sets for select
to anon, authenticated
using (true);

drop policy if exists "admin_write_verif_rule_sets" on public.verification_rule_sets;
create policy "admin_write_verif_rule_sets"
on public.verification_rule_sets for all
to authenticated
using (public.is_docito_admin())
with check (public.is_docito_admin());

drop policy if exists "read_all_verif_rule_set_items" on public.verification_rule_set_items;
create policy "read_all_verif_rule_set_items"
on public.verification_rule_set_items for select
to anon, authenticated
using (true);

drop policy if exists "admin_write_verif_rule_set_items" on public.verification_rule_set_items;
create policy "admin_write_verif_rule_set_items"
on public.verification_rule_set_items for all
to authenticated
using (public.is_docito_admin())
with check (public.is_docito_admin());

drop policy if exists "read_all_country_verif_profiles" on public.country_verification_profiles;
create policy "read_all_country_verif_profiles"
on public.country_verification_profiles for select
to anon, authenticated
using (true);

drop policy if exists "admin_write_country_verif_profiles" on public.country_verification_profiles;
create policy "admin_write_country_verif_profiles"
on public.country_verification_profiles for all
to authenticated
using (public.is_docito_admin())
with check (public.is_docito_admin());

-- Submissions: doctors can manage their own; admins can see all
drop policy if exists "doctor_select_own_submissions" on public.doctor_verification_submissions;
create policy "doctor_select_own_submissions"
on public.doctor_verification_submissions for select
to authenticated
using (doctor_id = auth.uid() or public.is_docito_admin());

drop policy if exists "doctor_insert_own_submissions" on public.doctor_verification_submissions;
create policy "doctor_insert_own_submissions"
on public.doctor_verification_submissions for insert
to authenticated
with check (doctor_id = auth.uid() or public.is_docito_admin());

drop policy if exists "doctor_update_own_submissions" on public.doctor_verification_submissions;
create policy "doctor_update_own_submissions"
on public.doctor_verification_submissions for update
to authenticated
using (doctor_id = auth.uid() or public.is_docito_admin())
with check (doctor_id = auth.uid() or public.is_docito_admin());

-- Files: doctors can manage their own submission files; admins can see all
drop policy if exists "doctor_select_own_files" on public.doctor_verification_files;
create policy "doctor_select_own_files"
on public.doctor_verification_files for select
to authenticated
using (
  exists (
    select 1 from public.doctor_verification_submissions s
    where s.id = submission_id
      and (s.doctor_id = auth.uid() or public.is_docito_admin())
  )
);

drop policy if exists "doctor_insert_own_files" on public.doctor_verification_files;
create policy "doctor_insert_own_files"
on public.doctor_verification_files for insert
to authenticated
with check (
  exists (
    select 1 from public.doctor_verification_submissions s
    where s.id = submission_id
      and (s.doctor_id = auth.uid() or public.is_docito_admin())
  )
);

drop policy if exists "doctor_update_own_files" on public.doctor_verification_files;
create policy "doctor_update_own_files"
on public.doctor_verification_files for update
to authenticated
using (
  exists (
    select 1 from public.doctor_verification_submissions s
    where s.id = submission_id
      and (s.doctor_id = auth.uid() or public.is_docito_admin())
  )
)
with check (
  exists (
    select 1 from public.doctor_verification_submissions s
    where s.id = submission_id
      and (s.doctor_id = auth.uid() or public.is_docito_admin())
  )
);

-- ----------------------------
-- 5) RPC: get_verification_checklist
-- Returns UI-ready checklist for a given country and role.
-- Uses country-specific profile if present, otherwise '*' default profile.
-- ----------------------------

create or replace function public.get_verification_checklist(
  country_iso2 text,
  p_role text default 'doctor'
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  profile_row record;
  default_row record;
  rule_set_codes text[];
  rule_set_ids uuid[];
  base_items jsonb;
  overrides jsonb;
  validity_override jsonb;
  optional_docs jsonb;
  conditional_docs jsonb;
begin
  -- Load default profile row ('*')
  select * into default_row
  from public.country_verification_profiles
  where country_iso2 = '*';

  -- Load country profile if exists, else null
  select * into profile_row
  from public.country_verification_profiles
  where country_verification_profiles.country_iso2 = get_verification_checklist.country_iso2;

  -- Build profile: country profile falls back to default for missing fields
  if default_row is null then
    -- If no default row exists, use an implicit default
    rule_set_codes := array['GLOBAL_BASE'];
    overrides := '{}'::jsonb;
  else
    rule_set_codes := default_row.rule_sets;
    overrides := default_row.overrides;
  end if;

  if profile_row is not null then
    -- If country profile has rule_sets, use them; else keep default
    if array_length(profile_row.rule_sets, 1) is not null then
      rule_set_codes := profile_row.rule_sets;
    end if;

    -- Merge overrides (country overrides win)
    overrides := coalesce(overrides, '{}'::jsonb) || coalesce(profile_row.overrides, '{}'::jsonb);
  end if;

  -- Resolve rule_set_ids
  select array_agg(rs.id) into rule_set_ids
  from public.verification_rule_sets rs
  where rs.code = any(rule_set_codes)
    and rs.is_active = true;

  -- Collect base items from all rule sets
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'doc_type_code', i.doc_type_code,
        'required', i.required,
        'validity_days', i.validity_days,
        'notes_key', i.notes_key,
        'requires_source_verification', i.requires_source_verification,
        'allowed_alternatives', i.allowed_alternatives,
        'doc', jsonb_build_object(
          'label_key', dt.label_key,
          'description_key', dt.description_key,
          'accepted_mime', dt.accepted_mime,
          'requires_expiry', dt.requires_expiry
        )
      )
      order by i.required desc, i.doc_type_code
    ),
    '[]'::jsonb
  )
  into base_items
  from public.verification_rule_set_items i
  join public.verification_document_types dt on dt.code = i.doc_type_code
  where i.rule_set_id = any(rule_set_ids);

  -- Pull override blocks
  validity_override := coalesce(overrides->'validity_days_override', '{}'::jsonb);
  optional_docs := coalesce(overrides->'optional_docs', '[]'::jsonb);
  conditional_docs := coalesce(overrides->'conditional_docs', '{}'::jsonb);

  -- Apply validity overrides to base items (if any)
  base_items := (
    select jsonb_agg(
      case
        when (validity_override ? (item->>'doc_type_code')) then
          jsonb_set(item, '{validity_days}', validity_override -> (item->>'doc_type_code'))
        else
          item
      end
    )
    from jsonb_array_elements(base_items) as item
  );

  return jsonb_build_object(
    'country_iso2', get_verification_checklist.country_iso2,
    'role', p_role,
    'rule_sets', to_jsonb(rule_set_codes),
    'items', base_items,
    'overrides', overrides,
    'optional_docs', optional_docs,
    'conditional_docs', conditional_docs
  );
end;
$$;
