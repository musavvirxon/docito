# Video Consultation Stability + i18n Plan

## 1. Edge function: `supabase/functions/livekit-token/index.ts`
- Restrict role resolution to `doctor` | `patient` only for appointment rooms. Reject other roles with 403.
- Use LiveKit `RoomServiceClient.listParticipants(roomName)`:
  - If `participants.length >= 2` → 403 `"Room is full"`.
  - If any existing participant's metadata/identity matches the requesting role → 403 `"A {role} is already in this call"`.
- Token grant:
  - `maxParticipants: 2`
  - doctor → `canPublishSources: ["camera","microphone","screen_share"]`
  - patient → `canPublishSources: ["camera","microphone"]`
- Encode role into participant `metadata` (JSON) so server-side dedup works.

## 2. `src/components/video/VideoRoom.tsx`

### Screen share gating
- Before `setScreenShareEnabled(true)`, iterate `room.remoteParticipants` and check `getTrackPublications()` for `Track.Source.ScreenShare` active publications. If present → `toast.error(t('videoConsultation.screenShareBlocked'))` and return.

### Stable reconnection
- `connectOptions.reconnectPolicy = { nextRetryDelayInMs: ctx => Math.min(10000, 500 * 1.5 ** ctx.retryCount), maxRetries: 50 }`.
- Increase initial connect timeout `12000 → 20000`.
- On `RoomEvent.Reconnected`: `await reattachAll()`; if `isAudioOnRef.current` → `setMicrophoneEnabled(true)`; if `isVideoOnRef.current` → `setCameraEnabled(true)`.
- On `RoomEvent.MediaDevicesError`: auto-retry track enable after 3s, up to 3 attempts (tracked in a ref counter), then surface error.
- 30s heartbeat `setInterval` while `status === 'connected'`: inspect `localParticipant` publications; silently re-enable missing expected tracks. Clear on unmount/disconnect.
- Wrap all async event handlers in `try/catch` so nothing escapes to unhandled rejection.

### Session timer (1 h auto-close)
- When `status` becomes `connected` and `mediaStarted` becomes true: `sessionStartRef.current = Date.now()`.
- `setInterval(1000)` computes `remaining = 3600 - elapsed`; store in state `remainingSeconds`.
- Header badge: `mm:ss remaining` using `t('videoConsultation.sessionRemainingTime', { time })`.
- At `remaining === 300` show dismissible banner `t('videoConsultation.sessionEnding')`.
- At `remaining <= 0` call `handleEndCall()` and clear interval.
- Cleanup in unmount/disconnect effect.

## 3. `src/components/video/VideoWaitingRoom.tsx`
- `getUserMedia` errors handled by `err.name`:
  - `NotAllowedError` → permission denied message.
  - `NotFoundError` → no device message.
  - `NotReadableError` → "device in use", auto retry once after 2s.
  - Default → generic.
- Wrap all async handlers in try/catch.

## 4. i18n migration

### `public/locales/en/dashboard.json`
Add `videoConsultation` namespace with: `connecting, live, error, disconnected, idle, room, participants, couldNotJoin, retryButton, leaveButton, rejoinButton, youWereDisconnected, readyToJoin, browserWillAsk, startCameraAndMic, consultationNotes, notesPlaceholder, sessionEndsIn, sessionEnding, youDoctor, doctor, yourCameraOff, waitingDoctorCamera, patient, youPatient, waitingPatientCamera, doctorScreen, clickToShare, doctorNotSharing, screenShareBlocked, sessionRemainingTime`.

### `public/locales/en/popups.json`
Add `appointmentSession` block: status labels (`scheduled, confirmed, in_progress, completed, cancelled, no_show`), actions (`startSession, endSession, joinCall, reschedule, markNoShow, confirmAppointment`), and titles/descriptions found in `src/pages/AppointmentSession.tsx`.

### Replace hardcoded strings
- `VideoRoom.tsx`, `VideoWaitingRoom.tsx` → `useTranslation('dashboard')` + `t('videoConsultation.*')`.
- `AppointmentSession.tsx` → `useTranslation('popups')` for the new keys.
- Scan `src/components/clinic/`, `src/components/dashboard/`, `src/pages/AppointmentSession.tsx` for remaining English JSX literals; move into `dashboard.json` or `admin.json` under descriptive keys and replace with `t()`.
- English-only this pass (per request); other locales fall back to EN until a separate translation task.

## Files touched
- `supabase/functions/livekit-token/index.ts`
- `src/components/video/VideoRoom.tsx`
- `src/components/video/VideoWaitingRoom.tsx`
- `src/pages/AppointmentSession.tsx`
- Selected files under `src/components/clinic/` and `src/components/dashboard/` (only those containing English literals discovered during the sweep)
- `public/locales/en/dashboard.json`
- `public/locales/en/popups.json`

## Out of scope
- Non-EN locale translations for the new keys.
- UI redesign of video room (only string + behavior changes).
- Changes to billing/finance code.
