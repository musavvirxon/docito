# Make procedure visibility work for every doctor automatically

The last fixes were written for all doctors, not one account. Nothing in them looks up Musavvirxon's name or ID. This plan confirms that for every doctor and closes any gaps that are left.

## What every doctor gets
- **Public profile and booking:** each doctor's active procedures show to visitors and patients. A new doctor's procedures show too, with no setup.
- **Treatment plan list:** a procedure appears right away in any open treatment plan or session picker, whatever screen the doctor added it from.
- **Clinic doctors:** doctors who work in a clinic see their own procedures the same way independent doctors do.

## Steps
1. Find every place a procedure can be created, edited or archived, including the procedures/services settings, the add-procedure screens inside sessions and plans, and clinic admin screens. Make sure each one tells open lists to refresh.
2. Find every procedure dropdown and list (treatment plans, sessions, booking, profile). Make sure each one uses the shared per-doctor loader, with no hard-coded doctor or user.
3. Check that the database lookup returns procedures for any doctor ID, not just one, using a few different doctors' profiles while signed out.
4. Add tests for these rules:
   - any doctor's own active procedures are included;
   - another doctor's procedures are never included;
   - the public lookup is not tied to one specific doctor.

## Technical details
- Mutation paths to audit: `useDoctorServices`, `supabase-api.ts`, `AddProcedureModal`, `CreateProcedureDialog`, and any other `.from('procedures')` writes. Each must call `notifyProceduresChanged()`.
- Readers to audit: any `.from('procedures')` read that is not owner-scoped, which should switch to `useProcedures` or `fetchPublicDoctorProcedures`.
- No per-user data changes or migrations are expected. The demo reviews added earlier for one profile stay as they are unless you want them removed.
