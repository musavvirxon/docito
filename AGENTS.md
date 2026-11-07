# Procedure catalog

- Clinical procedure selectors use explicitly doctor-scoped catalog queries and refresh on catalog changes and window focus so custom additions remain available without crossing account boundaries.
- Keep procedure selection eligibility in `src/lib/ownProcedures.ts`, independent of price and public-booking flags, so clinical selection does not hide valid catalog entries.
- Public and patient-facing procedure lists (doctor profile, booking) read through the `get_public_doctor_procedures` RPC, because direct `procedures` reads are owner/clinic-only under RLS.
- Every procedure mutation calls `notifyProceduresChanged()` and `procedures` is in the realtime publication, so open pickers (treatment plans, sessions) refresh instantly.

# Account authentication

- All signed-in password screens use `PasswordSettingsForm` and `passwordUpdateAttributes` so email and social accounts follow consistent current-password rules; recovery omits the current password.
- Link social identities through Supabase Auth on the signed-in account, never merge healthcare records or roles by email in browser code, because verified identity ownership must be enforced by Auth.
- Track recovery authorization from the SDK PASSWORD_RECOVERY event in `passwordRecovery.ts`, validate the user with Auth, and preserve query/hash during language redirects so ordinary sessions or forged URL text cannot authorize recovery.
