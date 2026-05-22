## Plan

1. **Resolve doctor slugs before UUID-only queries**
   - Add a shared frontend helper that accepts a public doctor identifier (`dr.John.Doe1`, username, custom link, or UUID) and resolves it to the canonical `doctors.id` UUID using `doctor_public_profile_view` / `doctor_profiles_view`.
   - Keep the current sequential `.eq()` lookup pattern so dots and special characters in slugs do not break PostgREST filters.

2. **Fix the booking page**
   - Update `AppointmentBooking` so `/book-appointment/dr.John.Doe1` first resolves the slug to a UUID.
   - Use the resolved UUID for doctor loading, procedure loading, `get-availability`, and `book-appointment` Edge Function calls.
   - Preserve the original URL slug for `returnTo`, so unauthenticated patients come back to the same public booking link after sign-in.
   - Prevent `get-availability` from being called until the slug has resolved to a real UUID.

3. **Fix doctor dashboard shared booking links**
   - Update the doctor profile/dashboard booking link generator to use a booking-safe identifier.
   - Prefer `username` or `doctor.id` for booking links instead of `custom_profile_link` when the custom link can contain unsupported characters.
   - Keep links on `https://docito.app/book-appointment/...`.

4. **Harden the availability Edge Function**
   - Add UUID validation at the top of `get-availability` so invalid identifiers return a clean 400 error instead of causing Postgres `invalid input syntax for type uuid`.
   - The real fix remains frontend slug resolution; the Edge Function guard prevents noisy 500/non-2xx failures.

## Technical details

- Main files to change:
  - `src/pages/AppointmentBooking.tsx`
  - `src/components/doctor/DoctorProfileSection.tsx`
  - new helper under `src/lib/` for resolving public doctor identifiers
  - `supabase/functions/get-availability/index.ts`
- No database schema changes are required.
- The existing `book-appointment` Edge Function can stay UUID-only for security; the client will pass it a resolved doctor UUID.