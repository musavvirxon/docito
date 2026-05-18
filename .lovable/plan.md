## Plan

1. **Fix public visibility for doctor profile lookup**
   - Add a database migration for `doctor_public_profile_view` so public doctor pages can resolve verified doctors by `username`, `custom_profile_link`, or doctor ID.
   - Keep the view `WITH (security_invoker=on)` and exclude sensitive/private-only data where possible.
   - Adjust the view filter so it relies on the doctor being verified and the profile not being private, instead of requiring `profiles.is_verified = true` through RLS.

2. **Keep frontend lookup compatible**
   - Preserve the existing `/doctor/:slug` and `/dr/:slug` routes.
   - Keep the UUID guard already added so non-UUID usernames like `dr.John.Doe1` are not sent to the UUID `id` filter.
   - Normalize username/custom-link matching if needed so saved lowercase usernames and public links work consistently.

3. **Validate as anonymous visitor**
   - Test the public REST query with the anon key for a known username such as `drjohndoe1`.
   - Confirm the query returns the doctor profile instead of `[]`, so `/doctor/drjohndoe1` can render publicly.

## Technical details

The current live data has a verified doctor with `profiles.username = drjohndoe1`, `profiles.profile_visibility = public`, and `doctors.verified = true`, but the anonymous public query returns no rows. The likely cause is that `doctor_public_profile_view` uses `security_invoker=on`, so the underlying `profiles` RLS policy also requires `profiles.is_verified = true`, which is currently false for this doctor. The fix should make the public doctor view use an RLS-safe pattern that exposes only verified doctor public-profile fields without depending on profile verification status.