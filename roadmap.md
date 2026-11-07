# Clinic admin i18n

- [x] Correct clinic admin translation namespace mismatches
- [x] Translate remaining main dashboard interface literals
- [x] Translate directly rendered clinic admin child sections
- [x] Synchronize English, Russian, and Uzbek locale keys
- [x] Add translation audit and verify all three languages

# Document branding

- [x] Unify secure clinic and doctor branding resolution
- [x] Apply branding to browser-generated documents
- [x] Apply doctor identity to server-generated documents
- [x] Verify branded PDFs and security checks

# Own procedure selection

- [x] Diagnose procedure price filtering and incorrect existing-plan owner lookup
- [x] Ensure selectors refresh each doctor's own saved procedures
- [x] Verify ownership isolation and procedure eligibility with regression tests
- [ ] Verify the reported account dropdown while signed in — external Supabase session unavailable; supplied email not found in connected account data

# Shared email and social sign-in

- [x] Finish consistent password settings for profile, doctor, and patient accounts
- [x] Validate invalid recovery-link rejection and confirm all four hosted sign-in providers are enabled
- [x] Run password-rule tests and check public sign-in/recovery screens in English, Russian, and Uzbek
- [ ] Verify identity linking, redirect allowlist, and authenticated password/recovery flow — external Supabase does not provide a test session or management access
