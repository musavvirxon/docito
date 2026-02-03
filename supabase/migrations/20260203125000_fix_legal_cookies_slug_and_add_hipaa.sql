-- supabase/migrations/20260203125000_fix_legal_cookies_slug_and_add_hipaa.sql
-- Idempotent: standardize cookies slug to 'cookies' and add HIPAA legal page if missing.

-- 1) Rename default cookie policy slug from 'cookie-policy' -> 'cookies' (only if 'cookies' does not already exist)
UPDATE public.legal_pages
SET slug = 'cookies',
    updated_at = now()
WHERE slug = 'cookie-policy'
  AND NOT EXISTS (
    SELECT 1
    FROM public.legal_pages
    WHERE slug = 'cookies'
  );

-- 2) Migrate any policy acceptances that referenced the old slug (avoid creating duplicates per user)
UPDATE public.user_policy_acceptances up
SET policy_slug = 'cookies'
WHERE up.policy_slug = 'cookie-policy'
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_policy_acceptances up2
    WHERE up2.user_id = up.user_id
      AND up2.policy_slug = 'cookies'
  );

-- 3) Ensure HIPAA page exists and is published
INSERT INTO public.legal_pages (slug, title, description, content, category, is_published)
SELECT
  'hipaa',
  'HIPAA Compliance',
  'How we safeguard Protected Health Information (PHI) and support HIPAA-aligned workflows.',
  '# HIPAA Compliance

## Our Commitment
Docito is built with healthcare-grade security practices designed to help covered entities and business associates operate safely and confidently.

## Security Controls
- **Encryption in transit and at rest** for sensitive data
- **Role-based access control (RBAC)** to limit data access by job function
- **Audit-friendly activity logging** for key actions
- **Secure authentication** with session management and auto-logout

## Data Handling
- **Minimum necessary access** principles
- **Segregation of duties** for administrative workflows
- **Secure storage** for documents and records

## Operational Safeguards
- Incident response and monitoring
- Regular platform maintenance and security updates
- Vendor and third-party review for high-risk integrations

## Questions
If you have compliance questions, contact **legal@docito.com**.',
  'legal',
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.legal_pages
  WHERE slug = 'hipaa'
);
