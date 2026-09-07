# Fix clinic logo upload (and the other broken file uploads)

## What's wrong

Confirmed by checking the storage rules on the server:

- The clinic logo is being saved into the private `attachments` storage area, in a folder named after the clinic. The rule for that area only allows a person to write into a folder named after their own account, so the upload is rejected — that's the "row-level security policy" error.
- Even if it uploaded, the link generated would not work: `attachments` is private, so the logo could never be shown publicly.
- There is already a proper public `practice-logos` area with rules that allow uploads into a folder named after the signed-in account. It is unused.
- The patient document upload button on the Patients > Documents tab has exactly the same problem (folder named after the patient inside `attachments`), so it fails the same way.
- After a successful upload the branding card still always shows "No logo uploaded" — the saved logo is never read back.

## Fix

1. Clinic logo (Settings > Branding)
   - Upload to the public `practice-logos` area using a path that starts with the signed-in user's ID, then the clinic ID and file name.
   - Basic validation: image types only, max ~5 MB, clear message if a clinic isn't selected.
   - Save the resulting public link into the clinic's branding settings as today.
2. Show the saved logo
   - Read `branding.logo_url` from the clinic settings when the page loads and display it in the branding card preview instead of the placeholder, with a "Replace"/"Remove" option; keep the placeholder only when nothing is set.
3. Patient documents upload
   - Change the path so it starts with the signed-in user's ID, then the patient folder, keeping the file inside the private `attachments` area (it should not be public).
4. Re-check remaining upload spots
   - Doctor profile photo and add-patient photo already use the public `avatars` area with allowed paths; no change expected, but they'll be confirmed while testing.

No database or security-rule changes are needed — the existing rules are correct; the app was writing to the wrong place.

## Technical notes

- `src/pages/AdminDashboard.tsx` line ~5644: `attachments` + `logos/${practice?.id}/...` -> `practice-logos` + `${user.id}/${practice.id}/${Date.now()}_${safeName}`, then `getPublicUrl` from `practice-logos`.
- `src/pages/AdminDashboard.tsx` line ~3128: `patients/${selectedPatient?.id}/...` -> `${user.id}/patients/${selectedPatient?.id}/...`.
- Add `logoUrl` state hydrated in the existing `entity_settings` branding loader (around line 379) and render it in the branding card.
- Sanitize the file name (strip non-ASCII/spaces) to avoid storage key errors with Cyrillic/Uzbek file names.
- Add EN/RU/UZ keys for the new validation and remove/replace labels.
