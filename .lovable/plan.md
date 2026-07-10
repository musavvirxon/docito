## Three fixes

### 1. Doctor can't see own camera / screen share in the call

Root cause: `getUserMedia` / `getDisplayMedia` fail silently inside the Lovable preview iframe (Permissions-Policy blocks them). The slots stay in the "Waiting…" empty state because LiveKit never publishes a local track. There is also no independent self-preview — the doctor's self-view depends entirely on the LiveKit publish succeeding.

Changes in `src/components/video/VideoRoom.tsx`:
- Add a **local preview stream** (`navigator.mediaDevices.getUserMedia`) that runs the moment `startMedia` is clicked, in parallel with LiveKit publish. Attach it to `doctor-camera` (or `patient-camera` for patients) immediately so the user sees themselves even if publishing to LiveKit is still in progress or fails.
- When LiveKit successfully publishes the local camera track, swap the slot to the LiveKit track and stop the preview stream. If LiveKit publish fails, keep the preview visible and show the "Open in new tab" banner.
- For screen share: attach the local `MediaStreamTrack` from `getDisplayMedia` to the `doctor-screen` slot immediately (same pattern), so the doctor sees their own shared screen without waiting on the remote SFU echo.
- Make `doctor-screen` the auto-focused slot when the doctor starts sharing, so it's visible full-size to the doctor.

### 2. "Opens in preview mode" when opening the call in another tab

Root cause: `openCallInNewTab` in `src/lib/mediaEnv.ts` opens `window.location.href` verbatim, which on the Lovable preview host reopens the same preview URL — so the doctor lands on the preview iframe host again instead of `docito.app`.

Change in `src/lib/mediaEnv.ts`:
- Rewrite `openCallInNewTab` to build the target URL from `getPublicAppUrl()` + `window.location.pathname + search + hash`, so the new tab always opens on `https://docito.app/...` (or `docito.live` for that domain). Preserves the current route (`/video/:roomId` or `/appointment-session/:id?tab=video`).

### 3. Doctor can't add procedures for manually added patients (or from the appointment session)

Root cause: `AdHocAddProcedureButton` inserts an `appointments` row with only `doctor_patient_id` set (no `patient_id`). The current appointments RLS policy `INSERT` check requires the caller to be either the doctor owner OR the `patient_id = auth.uid()` — and it does not recognize `doctor_patient_id`-only inserts as authorized for the doctor. In addition, the button is only rendered on the patient detail page; it's not exposed inside the appointment session for the doctor to add ad-hoc extra procedures to a manually-added patient's live session.

Changes:
- `src/components/doctor/patients/AdHocAddProcedureButton.tsx`: before inserting the appointment, verify `doctorPatientId` truly belongs to `doctorId`; surface the real error message from Supabase (`error.message`) instead of a generic toast.
- Add a Supabase migration that widens the `appointments` INSERT policy so a doctor can create their own appointment against a `doctor_patient_id` they own (mirroring the existing `patient_id` path). Migration will `DROP POLICY … ; CREATE POLICY …` using `has_role`-safe checks. Grants stay unchanged.
- `src/pages/AppointmentSession.tsx`: in the Procedures tab, when the current appointment has no scheduled procedure yet AND the patient is a `doctor_patient` (manually added), still render the inline `AppointmentProceduresPanel` / add-procedure UI (currently the panel is gated on scheduled procedures existing, which hides it for manual patients).

### Verification

1. Open the call in the Lovable preview → click Start → doctor's own camera preview appears immediately; the "Open in new tab" banner appears if the browser blocks LiveKit publish. Click the banner → new tab opens on `https://docito.app/...`.
2. In the real tab, click Share screen → doctor sees own shared screen in the `doctor-screen` slot; patient sees it too.
3. Open a manually added patient → click "Add Procedure" → modal opens, submitting a procedure succeeds without RLS error.
4. Inside an appointment session for a manually added patient → Procedures tab shows the add-procedure UI and new procedures are saved.

### Files touched

- `src/components/video/VideoRoom.tsx` (self-preview + auto-focus on share)
- `src/lib/mediaEnv.ts` (canonical public URL for new-tab)
- `src/components/doctor/patients/AdHocAddProcedureButton.tsx` (better errors)
- `src/pages/AppointmentSession.tsx` (show add-procedure UI for manual patients)
- One Supabase migration for the `appointments` INSERT policy (RLS only; no schema/data change)
