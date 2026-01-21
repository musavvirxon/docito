insert into public.verification_document_types (code, label_key, description_key, accepted_mime, requires_expiry)
values
('ID_NATIONAL', 'verification.docTypes.ID_NATIONAL.title', 'verification.docTypes.ID_NATIONAL.desc', array['image/png','image/jpeg','application/pdf'], false),
('PASSPORT', 'verification.docTypes.PASSPORT.title', 'verification.docTypes.PASSPORT.desc', array['image/png','image/jpeg','application/pdf'], false),
('SELFIE_LIVENESS', 'verification.docTypes.SELFIE_LIVENESS.title', 'verification.docTypes.SELFIE_LIVENESS.desc', array['image/png','image/jpeg'], false),
('PROOF_ADDRESS', 'verification.docTypes.PROOF_ADDRESS.title', 'verification.docTypes.PROOF_ADDRESS.desc', array['image/png','image/jpeg','application/pdf'], false),
('MED_LICENSE', 'verification.docTypes.MED_LICENSE.title', 'verification.docTypes.MED_LICENSE.desc', array['image/png','image/jpeg','application/pdf'], true),
('LICENSE_VERIFICATION', 'verification.docTypes.LICENSE_VERIFICATION.title', 'verification.docTypes.LICENSE_VERIFICATION.desc', array['application/pdf','image/png','image/jpeg'], false),
('DEGREE_DIPLOMA', 'verification.docTypes.DEGREE_DIPLOMA.title', 'verification.docTypes.DEGREE_DIPLOMA.desc', array['application/pdf','image/png','image/jpeg'], false),
('INTERNSHIP_CERT', 'verification.docTypes.INTERNSHIP_CERT.title', 'verification.docTypes.INTERNSHIP_CERT.desc', array['application/pdf','image/png','image/jpeg'], false),
('RESIDENCY_CERT', 'verification.docTypes.RESIDENCY_CERT.title', 'verification.docTypes.RESIDENCY_CERT.desc', array['application/pdf','image/png','image/jpeg'], false),
('SPECIALIST_CERT', 'verification.docTypes.SPECIALIST_CERT.title', 'verification.docTypes.SPECIALIST_CERT.desc', array['application/pdf','image/png','image/jpeg'], true),
('GOOD_STANDING', 'verification.docTypes.GOOD_STANDING.title', 'verification.docTypes.GOOD_STANDING.desc', array['application/pdf','image/png','image/jpeg'], true),
('CV', 'verification.docTypes.CV.title', 'verification.docTypes.CV.desc', array['application/pdf'], false),
('EMPLOYMENT_LETTER', 'verification.docTypes.EMPLOYMENT_LETTER.title', 'verification.docTypes.EMPLOYMENT_LETTER.desc', array['application/pdf','image/png','image/jpeg'], false),
('MALPRACTICE_INSURANCE', 'verification.docTypes.MALPRACTICE_INSURANCE.title', 'verification.docTypes.MALPRACTICE_INSURANCE.desc', array['application/pdf','image/png','image/jpeg'], true),
('CRIMINAL_RECORD_CHECK', 'verification.docTypes.CRIMINAL_RECORD_CHECK.title', 'verification.docTypes.CRIMINAL_RECORD_CHECK.desc', array['application/pdf','image/png','image/jpeg'], true),
('LANGUAGE_CERT', 'verification.docTypes.LANGUAGE_CERT.title', 'verification.docTypes.LANGUAGE_CERT.desc', array['application/pdf','image/png','image/jpeg'], true),
('LICENSE_TRANSLATION', 'verification.docTypes.LICENSE_TRANSLATION.title', 'verification.docTypes.LICENSE_TRANSLATION.desc', array['application/pdf','image/png','image/jpeg'], false),
('LEGALIZATION_APOSTILLE', 'verification.docTypes.LEGALIZATION_APOSTILLE.title', 'verification.docTypes.LEGALIZATION_APOSTILLE.desc', array['application/pdf','image/png','image/jpeg'], false),
('WORK_PERMIT', 'verification.docTypes.WORK_PERMIT.title', 'verification.docTypes.WORK_PERMIT.desc', array['application/pdf','image/png','image/jpeg'], true),
('DEA_REGISTRATION', 'verification.docTypes.DEA_REGISTRATION.title', 'verification.docTypes.DEA_REGISTRATION.desc', array['application/pdf','image/png','image/jpeg'], true),
('EPCS_ENABLEMENT', 'verification.docTypes.EPCS_ENABLEMENT.title', 'verification.docTypes.EPCS_ENABLEMENT.desc', array['application/pdf','image/png','image/jpeg'], true),
('PDMP_CHECK', 'verification.docTypes.PDMP_CHECK.title', 'verification.docTypes.PDMP_CHECK.desc', array['application/pdf','image/png','image/jpeg'], false)
on conflict (code) do nothing;

-- 2) Rule sets
insert into public.verification_rule_sets (code, name_key, version, is_active)
values
('GLOBAL_BASE', 'verification.ruleSets.GLOBAL_BASE.name', 1, true),
('REGULATOR_GOOD_STANDING_REQUIRED', 'verification.ruleSets.REGULATOR_GOOD_STANDING_REQUIRED.name', 1, true),
('TRANSLATION_REQUIRED', 'verification.ruleSets.TRANSLATION_REQUIRED.name', 1, true),
('BACKGROUND_CHECK_REQUIRED', 'verification.ruleSets.BACKGROUND_CHECK_REQUIRED.name', 1, true),
('LANGUAGE_PROFICIENCY_REQUIRED', 'verification.ruleSets.LANGUAGE_PROFICIENCY_REQUIRED.name', 1, true),
('US_CONTROLLED_SUBSTANCES_OPTIONAL', 'verification.ruleSets.US_CONTROLLED_SUBSTANCES_OPTIONAL.name', 1, true)
on conflict (code) do nothing;

-- 2.1) GLOBAL_BASE items (core)
with rs as (
  select id, code from public.verification_rule_sets
)
insert into public.verification_rule_set_items
(rule_set_id, doc_type_code, required, validity_days, notes_key, requires_source_verification, allowed_alternatives)
select
  (select id from rs where code = 'GLOBAL_BASE'),
  doc_type_code,
  required,
  validity_days,
  notes_key,
  requires_source_verification,
  allowed_alternatives
from (
  values
  -- Passport OR National ID alternative
  ('PASSPORT', true, null::int, 'verification.notes.ID_PRIMARY', false, '{"anyOf":["PASSPORT","ID_NATIONAL"]}'::jsonb),
  ('ID_NATIONAL', true, null::int, 'verification.notes.ID_PRIMARY', false, '{"anyOf":["PASSPORT","ID_NATIONAL"]}'::jsonb),

  ('SELFIE_LIVENESS', true, null::int, 'verification.notes.SELFIE', false, null::jsonb),
  ('PROOF_ADDRESS', true, 180::int, 'verification.notes.ADDRESS', false, null::jsonb),
  ('MED_LICENSE', true, null::int, 'verification.notes.LICENSE', true, null::jsonb),
  ('DEGREE_DIPLOMA', true, null::int, 'verification.notes.DEGREE', false, null::jsonb),
  ('CV', true, null::int, 'verification.notes.CV', false, null::jsonb),
  ('EMPLOYMENT_LETTER', false, 365::int, 'verification.notes.EMPLOYMENT_OPTIONAL', false, null::jsonb)
) as t(doc_type_code, required, validity_days, notes_key, requires_source_verification, allowed_alternatives)
on conflict (rule_set_id, doc_type_code) do nothing;

-- 2.2) Good standing required
insert into public.verification_rule_set_items
(rule_set_id, doc_type_code, required, validity_days, notes_key, requires_source_verification)
select
  (select id from public.verification_rule_sets where code = 'REGULATOR_GOOD_STANDING_REQUIRED'),
  'GOOD_STANDING',
  true,
  180,
  'verification.notes.GOOD_STANDING',
  true
on conflict (rule_set_id, doc_type_code) do nothing;

-- 2.3) Translation required
insert into public.verification_rule_set_items (rule_set_id, doc_type_code, required, validity_days, notes_key)
select
  (select id from public.verification_rule_sets where code = 'TRANSLATION_REQUIRED'),
  'LICENSE_TRANSLATION',
  true,
  null,
  'verification.notes.TRANSLATION'
on conflict (rule_set_id, doc_type_code) do nothing;

insert into public.verification_rule_set_items (rule_set_id, doc_type_code, required, validity_days, notes_key)
select
  (select id from public.verification_rule_sets where code = 'TRANSLATION_REQUIRED'),
  'LEGALIZATION_APOSTILLE',
  false,
  null,
  'verification.notes.APOSTILLE_OPTIONAL'
on conflict (rule_set_id, doc_type_code) do nothing;

-- 2.4) Background check required
insert into public.verification_rule_set_items (rule_set_id, doc_type_code, required, validity_days, notes_key)
select
  (select id from public.verification_rule_sets where code = 'BACKGROUND_CHECK_REQUIRED'),
  'CRIMINAL_RECORD_CHECK',
  true,
  365,
  'verification.notes.BACKGROUND'
on conflict (rule_set_id, doc_type_code) do nothing;

-- 2.5) Language proficiency required
insert into public.verification_rule_set_items (rule_set_id, doc_type_code, required, validity_days, notes_key)
select
  (select id from public.verification_rule_sets where code = 'LANGUAGE_PROFICIENCY_REQUIRED'),
  'LANGUAGE_CERT',
  true,
  365,
  'verification.notes.LANGUAGE'
on conflict (rule_set_id, doc_type_code) do nothing;

-- 2.6) US controlled substances optional
insert into public.verification_rule_set_items (rule_set_id, doc_type_code, required, validity_days, notes_key)
select
  (select id from public.verification_rule_sets where code = 'US_CONTROLLED_SUBSTANCES_OPTIONAL'),
  'DEA_REGISTRATION',
  true,
  365,
  'verification.notes.DEA'
on conflict (rule_set_id, doc_type_code) do nothing;

insert into public.verification_rule_set_items (rule_set_id, doc_type_code, required, validity_days, notes_key)
select
  (select id from public.verification_rule_sets where code = 'US_CONTROLLED_SUBSTANCES_OPTIONAL'),
  'EPCS_ENABLEMENT',
  false,
  365,
  'verification.notes.EPCS_OPTIONAL'
on conflict (rule_set_id, doc_type_code) do nothing;

-- 3) Country profiles
-- Default profile row: country_iso2='*'
insert into public.country_verification_profiles (country_iso2, profile_code, rule_sets, overrides)
values
(
  '*',
  'GLOBAL_DEFAULT',
  array['GLOBAL_BASE'],
  jsonb_build_object(
    'optional_docs', jsonb_build_array('MALPRACTICE_INSURANCE'),
    'conditional_docs', jsonb_build_object(
      'foreign_graduate', jsonb_build_array('GOOD_STANDING','LICENSE_TRANSLATION','LEGALIZATION_APOSTILLE'),
      'prescribes_controlled', jsonb_build_array('DEA_REGISTRATION','EPCS_ENABLEMENT')
    )
  )
)
on conflict (country_iso2) do update
set profile_code = excluded.profile_code,
    rule_sets = excluded.rule_sets,
    overrides = excluded.overrides;

-- Country-specific profiles (starter)
insert into public.country_verification_profiles (country_iso2, profile_code, rule_sets, overrides)
values
('UZ', 'BASE', array['GLOBAL_BASE'], '{}'::jsonb),
('KZ', 'BASE', array['GLOBAL_BASE'], '{}'::jsonb),
('KG', 'BASE', array['GLOBAL_BASE'], '{}'::jsonb),
('TJ', 'BASE', array['GLOBAL_BASE'], '{}'::jsonb),
('TM', 'BASE', array['GLOBAL_BASE'], '{}'::jsonb),

('US', 'US_BASE', array['GLOBAL_BASE','BACKGROUND_CHECK_REQUIRED'],
  jsonb_build_object(
    'conditional_docs', jsonb_build_object(
      'prescribes_controlled', jsonb_build_array('DEA_REGISTRATION','EPCS_ENABLEMENT')
    )
  )
),

('CA', 'CA_PLUS', array['GLOBAL_BASE','REGULATOR_GOOD_STANDING_REQUIRED'],
  jsonb_build_object(
    'optional_docs', jsonb_build_array('LANGUAGE_CERT'),
    'notes', jsonb_build_object('GOOD_STANDING','often_required_for_cross_jurisdiction_registration')
  )
),

('GB', 'UK_PLUS', array['GLOBAL_BASE','REGULATOR_GOOD_STANDING_REQUIRED','BACKGROUND_CHECK_REQUIRED'], '{}'::jsonb),

('AU', 'AU_PLUS', array['GLOBAL_BASE','REGULATOR_GOOD_STANDING_REQUIRED','BACKGROUND_CHECK_REQUIRED'], '{}'::jsonb),
('NZ', 'NZ_PLUS', array['GLOBAL_BASE','REGULATOR_GOOD_STANDING_REQUIRED'], '{}'::jsonb),

('SG', 'SG_STRICT', array['GLOBAL_BASE','REGULATOR_GOOD_STANDING_REQUIRED'],
  jsonb_build_object(
    'validity_days_override', jsonb_build_object('GOOD_STANDING', 90)
  )
),

('AE', 'UAE_PLUS', array['GLOBAL_BASE','REGULATOR_GOOD_STANDING_REQUIRED'],
  jsonb_build_object('optional_docs', jsonb_build_array('WORK_PERMIT'))
),

('DE', 'DE_PLUS', array['GLOBAL_BASE','TRANSLATION_REQUIRED','BACKGROUND_CHECK_REQUIRED','LANGUAGE_PROFICIENCY_REQUIRED'], '{}'::jsonb),
('FR', 'EU_PLUS', array['GLOBAL_BASE','TRANSLATION_REQUIRED'], '{}'::jsonb),
('IT', 'EU_PLUS', array['GLOBAL_BASE','TRANSLATION_REQUIRED'], '{}'::jsonb),
('ES', 'EU_PLUS', array['GLOBAL_BASE','TRANSLATION_REQUIRED'], '{}'::jsonb),

('SA', 'GCC_PLUS', array['GLOBAL_BASE','REGULATOR_GOOD_STANDING_REQUIRED'],
  jsonb_build_object('optional_docs', jsonb_build_array('WORK_PERMIT'))
),
('QA', 'GCC_PLUS', array['GLOBAL_BASE','REGULATOR_GOOD_STANDING_REQUIRED'], '{}'::jsonb),
('KW', 'GCC_PLUS', array['GLOBAL_BASE','REGULATOR_GOOD_STANDING_REQUIRED'], '{}'::jsonb),
('BH', 'GCC_PLUS', array['GLOBAL_BASE','REGULATOR_GOOD_STANDING_REQUIRED'], '{}'::jsonb),
('OM', 'GCC_PLUS', array['GLOBAL_BASE','REGULATOR_GOOD_STANDING_REQUIRED'], '{}'::jsonb)
on conflict (country_iso2) do update
set profile_code = excluded.profile_code,
    rule_sets = excluded.rule_sets,
    overrides = excluded.overrides;
