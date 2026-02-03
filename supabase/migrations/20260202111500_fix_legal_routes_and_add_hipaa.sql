-- supabase/migrations/20260202111500_fix_legal_routes_and_add_hipaa.sql
-- Fix legal slugs/routes (cookie policy -> /legal/cookies) and add HIPAA page
-- This migration is idempotent.

-- 1) Rename the default cookie policy slug from 'cookie-policy' -> 'cookies'
--    so it is accessible at /legal/cookies via the existing /legal/:slug route.
UPDATE public.legal_pages
SET slug = 'cookies',
    updated_at = now()
WHERE slug = 'cookie-policy'
  AND NOT EXISTS (
    SELECT 1
    FROM public.legal_pages
    WHERE slug = 'cookies'
  );

-- 2) Ensure a HIPAA page exists and is published.
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
