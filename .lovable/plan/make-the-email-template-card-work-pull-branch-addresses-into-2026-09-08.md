# Make the email template card work + pull branch addresses into emails and documents

## What's wrong now (verified)

- In the clinic Settings > Branding "Email customization" card, the three fields (email header, footer text, signature) are plain uncontrolled inputs. Nothing is loaded into them and nothing is saved — "Save template" only writes `email_customized: true`, so the typed text is lost on reload.
- That same Save also rewrites the whole branding block with only `colorIndex`, which wipes the clinic logo link saved earlier.
- Addresses on printed documents come from the clinic record or blindly from the first branch in the list (`practice?.address || locations[0]?.address`), so multi-branch clinics print the wrong address. The appointment session PDF uses a clinic name/address pair with no branch awareness.
- Appointments have no branch column, but doctors do (`doctors.practice_location_id`), and branches (`practice_locations`) carry per-language address, phone and email.

## What will change

### 1. Email template card actually saves
- Load the saved header / footer / signature from clinic settings into the fields when the page opens.
- Make the three fields controlled and save them under branding as `email_header`, `email_footer`, `email_signature`.
- Preserve everything already in the branding block when saving (logo, colour), so saving the template no longer erases the logo.
- Show a small live preview line of how the footer + signature will look, and disable Save until something changed.

### 2. Branch address used everywhere
- Add a small shared helper that, for a given appointment/visit, resolves the branch: doctor's assigned branch first, then the clinic's primary branch, then the first branch, then the clinic record's own address. It returns name, address (in the current language when a translated address exists), phone and email.
- Use it for the documents: appointment summary PDF, the 043/u medical card, invoices and treatment plan PDFs currently fed by `practice?.address || locations[0]?.address`.
- Use it for the email footer: the saved footer text supports a placeholder for the branch address, and where no footer is set the branch address + phone are used as the default footer line.

### 3. Translations
- New EN / RU / UZ keys for the preview label, the address placeholder hint, the changed Save state and the branch fallback labels.

## Technical notes

- `src/pages/AdminDashboard.tsx`: hydrate `emailHeader/emailFooter/emailSignature` in the existing settings-load effect (~line 380); make the inputs at 5728-5730 controlled; the Save at 5732 becomes `saveEntitySettings('branding', { ...existingBranding, colorIndex, logo_url: brandLogoUrl, email_header, email_footer, email_signature })`. Same spread fix for the brand-colour Save at 5700.
- New `src/lib/branchAddress.ts`: `resolveBranchForAppointment({ practice, locations, doctor, lang })` returning `{ id, name, address, phone, email }`; language picks `address_{en|ru|uz}` when present.
- Call sites updated: `src/pages/AppointmentSession.tsx` (`clinicInfo` at 169 / 1114-1115), `src/hooks/useAppointmentSummaryPdf.ts` (61-63), `src/pages/AdminDashboard.tsx` lines 1353, 3028, 3986.
- No schema changes: `doctors.practice_location_id` and `practice_locations.address*` already exist; email template text lives in the existing `entity_settings` branding payload.

## Verification

- `npx tsgo --noEmit -p tsconfig.app.json`.
- Save an email template, reload the Settings page, confirm the values persist and the logo is still there.
- Generate an appointment summary / 043 form for a doctor assigned to a non-primary branch and confirm that branch's address prints.
