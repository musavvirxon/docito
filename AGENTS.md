# Procedure catalog

- Clinical procedure selectors use explicitly doctor-scoped catalog queries and refresh on catalog changes and window focus so custom additions remain available without crossing account boundaries.
- Keep procedure selection eligibility in `src/lib/ownProcedures.ts`, independent of price and public-booking flags, so clinical selection does not hide valid catalog entries.
- Public and patient-facing procedure lists (doctor profile, booking) read through the `get_public_doctor_procedures` RPC, because direct `procedures` reads are owner/clinic-only under RLS.
- Every procedure mutation calls `notifyProceduresChanged()` and `procedures` is in the realtime publication, so open pickers (treatment plans, sessions) refresh instantly.
