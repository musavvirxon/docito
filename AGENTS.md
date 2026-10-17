# Procedure catalog

- Clinical procedure selectors use explicitly doctor-scoped catalog queries and refresh on catalog changes and window focus so custom additions remain available without crossing account boundaries.
- Keep procedure selection eligibility in `src/lib/ownProcedures.ts`, independent of price and public-booking flags, so clinical selection does not hide valid catalog entries.