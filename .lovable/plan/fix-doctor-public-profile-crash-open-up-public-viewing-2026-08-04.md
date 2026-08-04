# Fix doctor public profile crash + open up public viewing

## What's wrong (confirmed by reproducing the page in a browser)

Opening `/doctor/<slug>` crashes with a page error: `Cannot read properties of null (reading 'split')`, thrown inside `PremiumHeroSection`. The error boundary catches it and shows the "something went wrong" popup.

Cause: the hero builds avatar initials from `doctor.profiles.full_name` without a null check. Several doctor rows in the public profile view have `full_name = null`, so the whole page blows up. The console 404s you pasted (missing logo file, missing `blog.json` locale files) are unrelated noise, but they are real and worth cleaning up.

## Changes

1. Crash fix (the actual bug)
   - `PremiumHeroSection`: guard the name — fall back to a neutral display name (e.g. localized "Doctor") when `full_name` is missing, and compute initials safely from whatever string is available.
   - Type the prop as `full_name: string | null` so this can't silently regress.
   - Sanity-check other places on the profile page that assume a name exists (SEO title/description, share title) and give them the same fallback.

2. Public viewing, sign-in only for booking
   - In `DoctorPublicProfile`, remove the auth gate from viewing-related actions: Share and Save no longer redirect to `/auth`.
   - Keep the sign-in requirement on Book (redirects to `/auth?returnTo=...` so the user lands back on the booking flow) and on Message (messaging is a private conversation).
   - No route-level auth exists on this page today, so nothing else blocks anonymous viewing.

3. Console 404 cleanup
   - `blog` is registered as an i18n namespace but `public/locales/<lng>/blog.json` does not exist for any language, so every load 404s. Add a `blog.json` for en/ru/uz (with the keys the blog UI actually reads) and minimal stubs for the remaining languages so i18next stops erroring.
   - The footer/nav logo points at `/logos/800x240 horizontal logo+name.png`. The spaces and `+` in the filename break in production. Reference the logo through a hyphenated, import-based asset instead of a raw spaced public path.

## Technical notes

- Files: `src/components/doctor/public/PremiumHeroSection.tsx`, `src/pages/doctor/DoctorPublicProfile.tsx`, `public/locales/*/blog.json`, the logo reference sites (`index.html`, `src/components/landing/RoleSelector.tsx`, footer).
- No database or RLS changes needed — anon already has SELECT on `doctor_public_profile_view` and `procedures`; the lookup itself works.
- Verification: reload `/doctor/<slug>` for both a named and an unnamed doctor and confirm the page renders with no page errors, Book redirects to auth when signed out, and Share works without signing in.
