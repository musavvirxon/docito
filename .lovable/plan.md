## Part 1 — Why "Create Referral" still fails

The constraint was only one of two blockers. The real blocker is two `AFTER INSERT` triggers on `public.referrals` whose function bodies reference columns that don't exist on the table:

```sql
-- trigger_create_referral_conversation
INSERT INTO conversations (..., created_by) VALUES (..., NEW.referrer_id);
INSERT INTO conversation_participants (..., user_id, role)
  VALUES (..., NEW.referrer_id, 'referrer'),
         (..., NEW.patient_id,  'patient'),
         (..., NEW.receiver_id, 'receiver');

-- trigger_referral_messaging_permission
INSERT INTO messaging_permissions (user_id, can_message_user_id, ...)
  VALUES (NEW.referrer_id, NEW.patient_id, ...), ...
```

Actual columns on `public.referrals` are `referrer_user_id` / `receiver_user_id` (no `referrer_id` / `receiver_id`). Every INSERT raises `record "new" has no field "referrer_id"`, the transaction aborts, and the dialog throws — that's why the button "does nothing".

### Fix

One migration that rewrites both trigger functions to use the real columns:

- `create_referral_conversation`: read `NEW.referrer_user_id`, `NEW.receiver_user_id`. Skip participant inserts when the corresponding user id is NULL (covers walk-in patients with `patient_id IS NULL`, doctor-made patients, and general referrals with no specific receiver yet).
- `create_referral_messaging_permission`: same column rename + same NULL-guard for every pair so the insert never crashes when one side isn't a user yet.

No application code change needed for Part 1 — the frontend already passes the right field names.

---

## Part 2 — One prescription backend across Doctor Dashboard + Appointment Session

Today there are three places that touch prescriptions and they are inconsistent:

| Surface | File | Backend |
|---|---|---|
| Doctor Dashboard → Prescriptions | `DoctorPrescriptionsSection.tsx` (`CreatorPanel`) | `usePrescriptions.createPrescription` (RPC `create_prescription`) — real |
| `/appointment-session/:id` → Prescriptions tab | `AppointmentSession.tsx` → `PrescriptionCreator` | `usePrescriptions.createPrescription` — real ✅ |
| Visit workspace (`VisitPage` → `PrescriptionTab`) | `src/components/visit/tabs/PrescriptionTab.tsx` | **Local component state + mock `MEDICATIONS` list. Never persisted.** |

Goal: a single shared creator component used by all three, talking only to `usePrescriptions` / the `create_prescription` RPC. No mock medications anywhere.

### Refactor

1. **Extract** the creator currently inlined in `DoctorPrescriptionsSection.tsx` into a reusable component:

   ```
   src/components/prescriptions/SharedPrescriptionCreator.tsx
   ```

   Props:
   ```ts
   {
     doctorId: string;
     patientId?: string;          // pre-filled when known (visit / appointment)
     appointmentId?: string;      // links Rx to appointment when present
     patients?: Patient[];        // optional list when patient picker is needed
     prefilledItems?: PrescriptionItem[];
     recentMedications?: PrescriptionItem[];  // "From previous" chips
     onCreated?: (rxId: string) => void;
     compact?: boolean;           // dashboard = full, session/visit = compact
   }
   ```

   It hides the patient selector when `patientId` is provided, shows it (with search) otherwise. It always calls `usePrescriptions().createPrescription` and downloads the PDF on success. No mock data, ever.

2. **Doctor Dashboard**: `DoctorPrescriptionsSection.tsx` swaps its inlined `CreatorPanel` for `<SharedPrescriptionCreator />`. Behavior identical (patient selector + "From previous" + history).

3. **Appointment Session** (`src/pages/AppointmentSession.tsx`): replace `import PrescriptionCreator` with `SharedPrescriptionCreator`, pass `doctorId`, `patientId`, `appointmentId` from the session context. (`PrescriptionCreator.tsx` is left in place for any other callers but is no longer the canonical path.)

4. **Visit workspace** (`src/components/visit/tabs/PrescriptionTab.tsx`):
   - Delete the mock `MEDICATIONS` array and the local-only "Add prescription" dialog.
   - Render `<SharedPrescriptionCreator doctorId={...} patientId={...} appointmentId={...} compact />` for the entry form.
   - Replace the local list with `usePrescriptions({ doctorId, patientId }).prescriptions` so the table shows the real, server-stored Rx for this patient (and updates in realtime).
   - `VisitPage.tsx`: stop tracking `prescriptions` in local visit state for this tab; remove `handleAddPrescription` / `handleRemovePrescription` plumbing for prescriptions only (other visit fields stay). The visit page already receives `doctorId`/`patientId`/`appointmentId` — wire them through.

5. **Cleanup**: remove now-unused `VisitPrescription` references inside `PrescriptionTab` (keep the type if other tabs still reference it; otherwise drop it from `types.ts`).

### Out of scope

- No schema / RLS / RPC changes for prescriptions — the existing `create_prescription` RPC already handles auth and items.
- `ProcedurePrescriptionModal.tsx` is left untouched (it's an unrelated procedure-side prompt).
- No changes to PDF download or pharmacy-send flows.

---

## Technical summary

- **Migration**: rewrite `create_referral_conversation` and `create_referral_messaging_permission` to use `referrer_user_id` / `receiver_user_id` and NULL-guard each insert.
- **New file**: `src/components/prescriptions/SharedPrescriptionCreator.tsx` (single source of truth for Rx creation UI).
- **Edits**:
  - `src/components/doctor/prescriptions/DoctorPrescriptionsSection.tsx` — replace inline `CreatorPanel` with the shared creator.
  - `src/pages/AppointmentSession.tsx` — swap `PrescriptionCreator` for the shared creator.
  - `src/components/visit/tabs/PrescriptionTab.tsx` — replace mock dialog + local list with the shared creator + real `usePrescriptions` data.
  - `src/components/visit/VisitPage.tsx` — drop local prescription state plumbing, pass IDs down.
