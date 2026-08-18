# Fix doctor public profiles: name, photo, sections, i18n, visibility

## What's actually wrong (verified against the database and by loading the page)

Loading `/doctor/drjohndoe1` as a signed-out visitor returns "Doctor not found", and for signed-in visitors the name/photo area is empty. Root cause is row-level security, not the page code:

- `doctor_public_profile_view` is a `security_invoker` view that joins `doctors` to `profiles`. The only anon-facing policy on `profiles` requires `is_verified = true`. Almost every doctor profile row has `is_verified = false`, so the join returns no profile row and `full_name`, `avatar_url` and `username` all come back `NULL`.
- Because `username` is NULL for visitors, slug lookups by username (which is how `/doctor/drjohndoe1` resolves) find nothing at all — hence "Doctor not found" for anonymous visitors and profiles that "won't go public" even when set to public in the dashboard.
- Everything below the hero (availability, about, procedures, clinic, reviews) hangs off the same record, so those sections render empty for the same reason.
- Separately, most doctors — including Musavvirxon — have no `avatar_url` stored at all, so even with RLS fixed there is no image to show. The avatar upload path needs a check.

## Changes

1. Public profile data access (database)
   - Add a `SECURITY DEFINER` function `get_public_doctor_profile(slug_or_id text)` that returns the public-safe columns only (id, username, custom_profile_link, full name, avatar, specialty, bio, languages, fee, verified, experience, rating, review count, consultation types, accepting-new-patients, practice name/city/country/verified). No email, no phone.
   - Scope it exactly to the agreed rule: `doctors.verified = true` AND profile visibility is not private. Unverified doctors stay hidden from the public URL.
   - Add a matching list function/refresh for the public directory so search results and the profile page use the same rule.
   - Grant execute to `anon` and `authenticated`.

2. Profile page wiring
   - `DoctorPublicProfile` resolves the slug through the new RPC instead of the two view lookups, keeping the existing UUID / custom-link / username fallbacks.
   - Same for `src/lib/doctorSlug.ts` so booking and other slug consumers resolve identically.
   - Keep the current "not found" card for genuinely private/unverified profiles.

3. Doctor photo
   - Confirm the dashboard avatar upload writes `profiles.avatar_url` (the `avatars` bucket is public) and fix it if the URL is not persisted; the hero already renders `avatar_url` with initials as fallback.

4. i18n (EN / RU / UZ)
   - Replace the hardcoded English consultation-type badge labels in `PremiumHeroSection` ("Video", "In-person", "Messaging", "Home visit") with translation keys.
   - Add the missing `publicProfile.page.*` strings (unnamed doctor, pending verification, sign-in required, share/copy toasts) to `doctors.json` for en, ru and uz; the RU/UZ files currently fall back to English for several of these.

5. Reviews for Musavvirxon
   - Seed 3 public 5-star reviews for Musavvirxon Abduvoxidov (`00eeb95a-…`), each attached to a completed appointment so the existing rating trigger recomputes `average_rating` = 5.0 and `num_reviews` = 3. This is demo content by request; it will be created as real rows and can be removed later.

## Technical notes

- Files: new migration (RPC + grants), `src/pages/doctor/DoctorPublicProfile.tsx`, `src/lib/doctorSlug.ts`, `src/components/doctor/public/PremiumHeroSection.tsx`, `public/locales/{en,ru,uz}/doctors.json`.
- No change to `profiles` RLS — the definer function exposes only the whitelisted public columns, so patient/staff data stays protected.
- Verification: load a verified public doctor's URL signed out and confirm name, photo, badges and all sections below the hero render; confirm an unverified doctor still shows "not found"; switch language to RU and UZ and confirm no English leaks; confirm Musavvirxon's profile shows 5.0 with 3 reviews.
