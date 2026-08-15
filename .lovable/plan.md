# Fix video consultation: wrong roles, wrong slots, no remote video

## What's actually wrong

The LiveKit token function decides who is "doctor" and who is "patient". In the room-only join path (`supabase/functions/livekit-token/index.ts`, the `else if (roomId)` branch) the code comment reads "Free-room flow (non-appointment) — treat caller as doctor" and sets `role = 'doctor'` for whoever calls it, with no check against the consultation.

`VideoRoom.tsx` requests a token with `{ appointmentId: consultation.appointment_id, roomId: consultation.room_id }`. Whenever `appointment_id` is null (standalone video consultations), the server falls into that room-only branch, so **both** participants get identity `doctor::<uid>` and metadata `role: doctor`. The browser console for this room confirms every participant logged as `doctor::9198d9af-...`.

Because the UI maps tracks to slots by role (`sourceToSlot` in `VideoRoom.tsx`), this produces exactly the reported symptoms:
- Everyone is labelled "(doctor)".
- The patient's own camera lands in the doctor camera slot.
- The remote camera also targets the doctor slot, so it overwrites/collides and each side effectively sees only itself.
- The patient camera slot stays empty, and screen share is unreliable.

## Fix

### 1. Resolve the real role server-side (`supabase/functions/livekit-token/index.ts`)

In the room-only branch, look up `video_consultations` by `room_id` with the service-role client and determine the caller:
- doctor if `doctors.user_id` (or `doctor_id`) matches the caller,
- patient if `patient_id` matches the caller directly or via `profiles.user_id`,
- neither -> 403, same wording as the appointment path.

Only when no consultation row exists at all (true ad-hoc room) keep the existing "caller hosts it" doctor fallback. Also set `participantName` from the profile in this branch, so names are correct instead of falling back to the email.

Redeploy the function.

### 2. Defensive slot mapping (`src/components/video/VideoRoom.tsx`)

Even with correct tokens, make the UI resilient: when a remote participant's parsed role equals the local user's role (a stale token, an old tab), place that remote camera in the *opposite* camera slot instead of overwriting the local slot. Remote screen share keeps going to the screen slot.

Also prefer participant `metadata.role` over the identity prefix when parsing the role, since the token carries both.

### 3. Verify

Reconnect a doctor and a patient to the same consultation and confirm: identities are `doctor::…` / `patient::…`, each side sees the other's camera in the correct slot, labels read correctly, and doctor screen share appears on the patient side.

## Technical notes

- Files: `supabase/functions/livekit-token/index.ts`, `src/components/video/VideoRoom.tsx`.
- No database migration; no schema changes.
- Existing capacity and role-uniqueness checks stay as-is — they start working properly once roles are no longer all "doctor".
