# Fix: new diagnoses not visible after adding

## Root cause

In `src/hooks/useDoctorIntegration.ts`, the CRUD functions `addDiagnosis`, `updateDiagnosis`, and `deleteDiagnosis` succeed against the `procedure_templates` table but only bump a `refreshSeq.current` ref. The actual UI refresh is expected to come from a Supabase realtime channel subscribed to `public.procedure_templates` (lines 629–637).

That table is not part of the `supabase_realtime` publication (verified via `pg_publication_tables`), so the channel never fires, `fetchDiagnoses()` is never called, and the local `diagnoses` state stays stale. Reloading the page shows the new row because the initial fetch runs.

## Change

Make the diagnosis CRUD helpers refetch directly, the same way other entities recover when realtime is unavailable.

In `src/hooks/useDoctorIntegration.ts`:

1. `addDiagnosis` — after a successful insert, `await fetchDiagnoses()` before returning `{ success: true }`.
2. `updateDiagnosis` — after a successful update, `await fetchDiagnoses()`.
3. `deleteDiagnosis` — after a successful delete, `await fetchDiagnoses()`.

Keep the `refreshSeq.current += 1` bumps and the realtime subscription as-is (harmless; will start working if the table is later added to the publication).

## Out of scope

- Adding `procedure_templates` to the realtime publication (DB change). Not needed for the fix and avoids a migration; can be done later if true realtime sync across tabs is desired.
- Any other CRUD paths.

## Files

- `src/hooks/useDoctorIntegration.ts` — 3 small edits in the diagnosis CRUD block (~lines 510–576).
