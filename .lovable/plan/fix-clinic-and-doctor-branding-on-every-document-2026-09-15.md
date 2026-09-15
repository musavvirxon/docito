# Fix clinic and doctor branding on every document

## Goal
Every generated clinical and financial document will consistently show both:
- the producing clinic’s logo, name, brand colour, and correct branch contact details; and
- the responsible doctor’s name, specialty, license details, and profile photo when available.

This covers treatment plans, referrals, 043/u medical cards, receipts/invoices, prescriptions, superbills, appointment summaries, and the remaining browser-generated printouts.

## Confirmed problems
- Clinic branding is stored in `entity_settings`, but browser-generated documents read it directly under access rules that do not allow every joined doctor to retrieve it. The helper silently returns an empty result.
- The shared branding helper supports a branch ID, but no PDF generator passes one, so documents cannot reliably select the appointment’s actual clinic location.
- Branch translations are read without selecting the translated columns, and the fallback branch query is unordered.
- Several document paths still read only `practices.logo_url`; the clinic with configured branding currently has its logo only in the branding settings record.
- Doctor profile photos live in `profiles.avatar_url`, while PDF functions mostly look at `doctors.logo_url`, which is empty for the relevant doctors. Doctor photos therefore never appear.
- Branding and image failures are swallowed without useful logs, making blank headers look like legitimate empty branding.
- One superbill query requests a nonexistent doctor name column, preventing reliable doctor identity hydration.

## Implementation

1. **Create one secure branding source**
   - Extend the existing document-branding database function to return clinic branding, deterministic branch details, and the responsible doctor’s public professional identity.
   - Keep access scoped to authenticated users who can access the document or clinic; do not broaden medical or facility data access.
   - Read the clinic logo from branding settings first, then the clinic profile fallback; read the doctor photo from `profiles.avatar_url`, then the legacy doctor logo fallback.

2. **Use one resolver everywhere**
   - Update the shared browser and Edge Function helpers to consume the same normalized branding result.
   - Resolve clinic membership through direct assignment, active clinic staff membership, accepted join request, or practice staff membership.
   - Pass the doctor’s assigned location, or the document/appointment location when available, into branch resolution.
   - Select localized branch fields and apply deterministic primary/created-order fallback.

3. **Render clinic and doctor identity together**
   - Standardize document headers: clinic logo/name and brand colour as the main identity; doctor photo and professional details in a clearly separated provider block.
   - Apply the same fallback rules to all listed documents and browser printouts.
   - Preserve Docito branding only when neither clinic nor independent-doctor branding exists.

4. **Fix document-specific broken paths**
   - Replace direct `practices.logo_url` reads in browser-generated appointment summaries, invoices, and medical cards with the shared resolver.
   - Fix the superbill doctor query and remove duplicated/manual clinic-resolution logic from treatment plans and referrals.
   - Ensure receipts/invoices created for a clinic use the producing clinic and doctor context rather than only the invoice entity label.

5. **Make failures diagnosable**
   - Log safe branding-resolution and image-fetch failures in PDF functions without exposing patient data or private URLs.
   - Keep PDF generation resilient: if an image cannot be embedded, render the clinic and doctor names instead of leaving a blank header.

6. **Verify with real records**
   - Generate and visually inspect each document type using the existing clinic that has a saved branding logo and its joined doctor.
   - Confirm clinic logo, clinic name, brand colour, correct branch address/phone, doctor name, and doctor photo.
   - Verify independent-doctor fallback, missing-logo fallback, English/Russian/Uzbek text, and that no unrelated clinic branding leaks across records.
   - Run focused type checks and PDF/Edge Function tests, then inspect rendered PDF pages for clipping, missing images, or blank headers.

## Technical notes
- Database changes will be delivered through a migration with explicit function grants and a pinned search path.
- The existing `entity_settings` and profile records remain the sources of truth; no duplicate branding table is required.
- No patient-data permissions will be widened.
