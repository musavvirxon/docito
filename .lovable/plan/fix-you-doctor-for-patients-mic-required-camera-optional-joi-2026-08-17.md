# Fix "You (Doctor)" for patients + mic-required / camera-optional join

## What's wrong

`src/pages/AppointmentSession.tsx` renders the video room with a hardcoded `userRole="doctor"` (line 1283). The page is opened by both doctors and patients, so a patient joining through the session's Video tab is labelled "You (Doctor)" and their camera lands in the doctor slot. The page already computes `isPatientViewer` (appointment.patient_id === user.id) a few hundred lines above, it just isn't used for the video room.

Separately, `startMedia` in `src/components/video/VideoRoom.tsx` probes `getUserMedia({ audio: true, video: true })` in one call and aborts the whole join if it rejects. A user with no camera (or who denies camera) therefore cannot enter the consultation at all.

## Changes

### 1. Pass the real role (`src/pages/AppointmentSession.tsx`)

- `userRole={isPatientViewer ? 'patient' : 'doctor'}` on the `VideoRoom`.
- Use the matching join action: patients call `joinAsPatient`, doctors keep `joinAsDoctor`; a patient should not be able to create/end the consultation from this page (keep the end-call action doctor-only, patients get Leave).

### 2. Mic required, camera optional (`src/components/video/VideoRoom.tsx`)

Split the media probe in `startMedia`:
- Request audio first. If it fails (no device or denied), show the existing media error explanation plus a clear "a microphone is required to join" message and do not enter media state — the user stays on the pre-join screen and can retry after granting.
- Then request video separately. If it fails, log/toast a soft notice ("continuing without camera"), keep `isVideoOn` false, and continue joining with audio only.
- The local camera slot shows the existing empty-state hint instead of a preview when there is no camera.
- Keep the camera toggle usable so a user who plugs in / allows a camera mid-call can enable it.

### 3. Copy

Add i18n keys (EN, RU, UZ) for the two new messages: microphone required to join, and joined without camera.

## Technical notes

- Files: `src/pages/AppointmentSession.tsx`, `src/components/video/VideoRoom.tsx`, dashboard/common locale JSON for the new strings.
- No database or edge function changes; the `livekit-token` role resolution fixed earlier already returns the correct role — this is purely the client passing the wrong prop.
