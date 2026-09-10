# Clinic branding on every generated document

Goal: when a document is produced by a clinic — or by any doctor who has joined that clinic — it carries the clinic's logo, name, branch address/phone and brand colour. Covers treatment plans, referrals, the 043/u medical card, receipts/invoices, plus prescriptions, superbills and visit summaries which share the same headers.

## What's wrong today

- The logo uploaded in Settings > Branding is saved only into the clinic settings record. The clinic profile's own logo field is empty for every clinic in the database, and most documents read that empty field — so no logo prints.
- Only the treatment plan looks up a doctor's clinic through an approved join request. Referrals, prescriptions, receipts and superbills only check the doctor's directly assigned clinic, so a doctor who joined a clinic gets a blank or personal header.
- The 043/u medical card prints the clinic name and address as plain text lines and has no logo or brand colour at all.
- Brand colour chosen in Settings is never used; all PDFs use a hard-coded blue.

## What will change

1. **One source of truth for branding.** A database helper returns, for a clinic: name, logo (branding setting first, clinic profile logo as fallback), brand colour, and contact details. Saving branding in Settings also mirrors the logo onto the clinic profile so older readers stay correct.

2. **One rule for "which clinic does this doctor belong to".** A shared resolver used by every document: doctor's assigned clinic, then active clinic staff membership, then approved join request, then practice staff. Independent doctors keep their own header as today.

3. **Branded header on every document.** Logo top-left, clinic name and the correct branch address/phone beside it, brand colour used for the header rule, section titles and footer line. Applies to: treatment plan, referral, receipt/invoice, superbill, prescription, appointment/visit summary.

4. **043/u medical card.** Add clinic logo and brand colour to the form header while keeping the official layout and the institution name/address lines. Data is passed from the appointment session and the clinic admin views, which already resolve the right branch.

5. **Fallback.** If a clinic has no logo, documents show the clinic name in brand colour; if there is no clinic, the current Docito header is kept.

## Technical notes

- New `SECURITY DEFINER` function `public.get_document_branding(_practice_id uuid)` with pinned `search_path` and explicit grants, reading `entity_settings.payload->'branding'` joined to `practices`.
- New `supabase/functions/_shared/branding.ts`: `resolvePracticeIdForDoctor(service, doctorId)` and `loadBranding(service, practiceId)` returning `{ name, logoUrl, brandColor, address, phone, email }`; branch selection reuses the existing doctor-branch priority (assigned branch → primary → first → clinic address).
- Update `treatment-plan-generate-pdf`, `referral-generate-pdf`, `invoice-generate-pdf`, `superbill-generate-pdf`, `prescription-generate-pdf`, `appointment-summary-pdf` to use the shared helper for logo embed, header text and the `brandPrimary` colour (parsed from the stored colour index).
- Client: extend `MedicalCardData` in `src/utils/generateMedicalCard043u.ts` with `clinicLogoUrl` and `brandColor`; fetch/pass from `AppointmentSession.tsx` and `AdminDashboard.tsx` call sites next to the existing `branchFor(...)` values; add a small `useEntityBranding` read where needed.
- `AdminDashboard.tsx` branding save additionally updates `practices.logo_url`.
