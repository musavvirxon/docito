## Problem

Three related issues on the Doctor → Profile section:

1. **Username appears not saved.** The DB write actually succeeds, but `fetchDoctorProfile` in `src/hooks/useDoctorIntegration.ts` only selects `full_name, email, avatar_url, phone` from `profiles` — it doesn't fetch `username` or `profile_visibility`. After `refreshAllData()`, `doctorProfile.profiles.username` is `undefined`, so the `useEffect` in `DoctorProfileSection.tsx` resets the input to `""` and the Public badge stays "Private". Looks like the save failed.

2. **Profile URL (`/doctor/{slug}`) doesn't work.** `DoctorPublicProfile` reads from `doctor_public_profile_view`, which filters `WHERE d.verified = true AND profile_visibility <> 'private'`. An unverified doctor (or one whose visibility wasn't actually flipped to public due to issue 1) gets a 404. There's also no feedback in the UI explaining why.

3. **Patient booking link doesn't work.** `bookingLink` is hardcoded to `https://docito.app/book-appointment/{id}`. In the preview/staging environment the doctor record may not be reachable on the production domain, so the link looks broken. The link should respect the current origin in non-production environments.

## Fix

### 1. `src/hooks/useDoctorIntegration.ts`
Add `username` and `profile_visibility` to the embedded `profiles` select inside `fetchDoctorProfile` (around line 212):

```ts
profiles:user_id (
  full_name,
  email,
  avatar_url,
  phone,
  username,
  profile_visibility
),
```

This makes the username/visibility round-trip after `refreshAllData()` so the input and "Public/Private" badge reflect the saved state.

### 2. `src/components/doctor/DoctorProfileSection.tsx`
- After a successful save, optimistically keep the entered `username` and `isPublic` in local state (don't depend solely on the refresh) so the field never visually "blanks out" even if the round-trip is delayed.
- Show a non-blocking inline notice under the Public Profile section when `isPublic` is on but `doctorProfile.verified` is `false`, explaining that the public `/doctor/{username}` page only goes live after verification (this is enforced by `doctor_public_profile_view`). Keep the Preview button but warn the user.
- Disable the Preview button when the doctor is unverified, with a tooltip explaining verification is required.

### 3. `src/lib/booking.ts` + `DoctorProfileSection.tsx`
Replace the hardcoded `https://docito.app` origin with an environment-aware origin:

```ts
export function getPublicBookingOrigin(): string {
  if (typeof window === 'undefined') return 'https://docito.app';
  const host = window.location.hostname;
  // Use production domain only when we're already on a production host
  const isProd = host === 'docito.app' || host === 'docito.live' || host.endsWith('.docito.live');
  return isProd ? 'https://docito.app' : window.location.origin;
}
```

Update `getBookingUrl(slug)` to use `getPublicBookingOrigin()`, and update `DoctorProfileSection.tsx`'s `bookingLink` to call `getBookingUrl(...)` instead of building the URL inline. This makes the booking link clickable inside the Lovable preview while still pointing at `docito.app` in production.

## Files touched

- `src/hooks/useDoctorIntegration.ts` — extend `profiles` select
- `src/components/doctor/DoctorProfileSection.tsx` — optimistic state, verification notice, use `getBookingUrl`
- `src/lib/booking.ts` — environment-aware origin helper

No DB or RLS changes needed.
