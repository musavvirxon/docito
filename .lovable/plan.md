## Part 1 — Fix "Create Referral" button

### Root cause

The DB has a stale CHECK constraint on `public.referrals`:

```
referrals_status_check  CHECK (status IN ('pending','accepted','declined','completed'))
```

But `useReferralActions.createReferral` inserts `status: 'draft'`. Every insert fails with a check-constraint violation, so the dialog throws and never closes — that's why the button "doesn't work".

Two secondary issues uncovered while tracing:

- `doctor_patient_id` is set in `DoctorReferralsSection.handleCreateSubmit` (when the picker returns a `doctor_made` patient with `patient_id: null`), but `createReferral` only inserts a hand-picked field list and silently drops it. Combined with `referrals_patient_required_chk` (`patient_id IS NOT NULL OR patient_name IS NOT NULL`) and `referrals_walkin_phone_required_chk`, the insert can also fail with no patient identity.
- The status-history log/trigger expects the new lifecycle values (`draft|sent|...`), so we need the constraint to match the lifecycle the app already uses.

### Fix (migration + small code edits)

1. **Migration** on `public.referrals`:
   - Drop `referrals_status_check`. Replace with one that matches the real lifecycle:
     `draft, sent, accepted, rejected, declined, slots_available, booked, in_progress, completed, cancelled, expired, pending`.
   - Keep `patient_required_chk` and `walkin_phone_required_chk`, but extend them to also accept `doctor_patient_id IS NOT NULL` so doctor-made patients satisfy the constraint without a phone.

2. **`src/hooks/useReferrals.ts` — `createReferral`**:
   - Accept and forward optional `doctor_patient_id` on `CreateReferralInput`.
   - When `doctor_patient_id` is set, also write `patient_name` (from caller) so the patient-required check is satisfied even if the row is later read by a function that ignores `doctor_patient_id`.
   - Sanitize the payload (strip `undefined`s) before `insert`.

3. **`src/components/doctor/DoctorReferralsSection.tsx` — `handleCreateSubmit`**:
   - Pass `doctor_patient_id` and `patient_name: selectedPatient.full_name` (and `patient_phone` if present) through to `createReferral` for `doctor_made` patients.

No RLS changes — the existing `Referrers can create referrals` policy already covers this user.

---

## Part 2 — Doctor Dashboard "Prescriptions" section

Implement exactly as specified in the brief. No schema, RPC, or hook changes.

### Files

- **Create** `src/components/doctor/prescriptions/DoctorPrescriptionsSection.tsx` — the full section: header + 4 stat chips, left panel (search/filters, prescription rows, "Medication History" derived list), right panel (creator OR detail), all loading/empty states, mobile drawer.
- **Modify** `src/pages/DoctorDashboard.tsx` — import `Pill` from `lucide-react`, add `{ id: "prescriptions", label: t("doctor.navigation.prescriptions","Prescriptions"), icon: Pill }` to **both** sidebar arrays, and add `case "prescriptions": return <DoctorPrescriptionsSection />;` to the `switch (activeSection)`.

### Data flow

```
useDoctorData() ──► doctorProfile.id
                          │
                          ▼
           usePrescriptions({ doctorId })  ──► realtime list of every Rx
                          │
        ┌─────────────────┼──────────────────────────────┐
        ▼                 ▼                              ▼
   stat chips      left panel list +              right panel:
                   "Medication History"           - PrescriptionCreatorPanel (new)
                   (derived via useMemo)          - PrescriptionDetailPanel  (new)
```

`PrescriptionCreatorPanel` wraps the existing `PrescriptionCreator` from `src/components/prescriptions/` and adds:
- Patient selector (searchable combobox sourced from `useDoctorData`).
- "From previous" chip strip — the last 5 unique medications derived from the loaded `prescriptions`. Click appends to the item list via local state lifted into the wrapper.
- All existing fields/behavior preserved; existing `createPrescription` RPC + PDF download unchanged.

`PrescriptionDetailPanel` is an inline (non-dialog) render of the same content the existing `PrescriptionList` detail dialog shows: header, status badge, expiry/refills, linked-appointment chip, item cards, notes, and action buttons (`Download PDF` via `downloadPrescriptionPdf`, `Send to Pharmacy` via `sendToPharmacy`, `Re-prescribe`, `Cancel` if `pending`).

### Re-prescribe / Medication History

Both reuse one local state slice in `DoctorPrescriptionsSection`:

```ts
setRightPanel('creator');
setPrefilledPatientId(rx.patient_id);
setPrefilledItems(rx.items ?? []);
```

`Medication History` derived in a single `useMemo` over `prescriptions.flatMap(rx => rx.items)`, grouped by lowercased `medication_name`, sorted by count desc; each row click pre-fills the creator with that medication (last-used dosage/frequency/unit) and leaves the patient selector empty for the doctor to choose.

### Status badge colors, layout breakpoints, stat math, and empty/loading states

Exactly as specified in the brief (4 chips, two-panel desktop / stacked mobile w/ Sheet, semantic tokens for status colors mapped through the existing `Badge` variants where possible, `Skeleton` for loading).

### Out of scope

No edits to `usePrescriptions`, `PrescriptionCreator`, `PrescriptionList`, Supabase schema, or RPCs.

---

## Technical summary

- 1 SQL migration: relax `referrals_status_check`, broaden `patient_required_chk` / `walkin_phone_required_chk` to accept `doctor_patient_id`.
- `useReferrals.ts`: forward `doctor_patient_id` + `patient_name`/`patient_phone` and sanitize payload.
- `DoctorReferralsSection.tsx`: pass walk-in / doctor-made identifiers through.
- New section component + 2 inline sub-panels under `src/components/doctor/prescriptions/`.
- 3 lines added to `DoctorDashboard.tsx` (import, nav item ×2, switch case).
