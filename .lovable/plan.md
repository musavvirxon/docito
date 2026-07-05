## Queue Display System — Wire-up Plan

The four new files (migration, `useQueueDisplay.ts`, `QueueDisplay.tsx`, `QueueDisplaySettings.tsx`) already exist. This plan wires them into the existing app.

### 1. `src/App.tsx` — public display route
- Add lazy import `const QueueDisplay = lazy(() => import("@/pages/QueueDisplay"))` right after `GuestVideoJoin`.
- Add `<Route path="display/:token" element={<QueueDisplay />} />` right after the `v/:token` route, outside the `supportedLangCodes.map(...)` block (no auth, no lang prefix).

### 2. `src/pages/AdminDashboard.tsx` — admin nav entry
- Extend the section type union: add `| "queueDisplays"` after `| "rooms"`.
- Import `Monitor` from `lucide-react` (if missing) and `QueueDisplaySettings` from `@/components/rooms/QueueDisplaySettings`.
- Add nav item `{ id: "queueDisplays", label: "Queue displays", icon: Monitor }` right after Rooms & Beds.
- Add `case "queueDisplays":` that renders `<QueueDisplaySettings practiceId={practice?.id ?? ""} userId={user?.id ?? ""} />` inside the same `SectionWrapper` pattern used by rooms.

### 3. `src/hooks/useStaffDashboard.ts` — expose queue fields
- Extend `StaffAppointment` with `room_name?`, `queue_status?`, `called_at?`.
- Add `queue_status, called_at, room_id, clinic_rooms(name)` to the appointments select.
- Map `room_name: apt.clinic_rooms?.name`, `queue_status`, `called_at` in the result.

### 4. `src/pages/StaffDashboardPage.tsx` — fix status bug + broadcast
- Split `handleStatusUpdate` by kind:
  - `pending | confirmed | completed | canceled | no_show` → update `status` (as today).
  - `arrived | called | in_progress` → update `queue_status`; when `called`, also set `called_at: new Date().toISOString()`.
- After a successful `called` write, broadcast on `display:${permissions.practice_id}` channel with `event: 'call'` so paired TVs refetch instantly.

This fixes the current DB error where `arrived`/`in_progress` are rejected by the `status` check constraint.

### 5. `src/components/staff/TodayScheduleSection.tsx` — queue UI
- Add `called` entry to `STATUS_CONFIG` (amber, `Bell` icon from lucide-react).
- Rewrite `getNextActions`:
  - `arrived` → offers "Call next" (`status: 'called'`).
  - `called` → offers "Start" (`status: 'in_progress'`) plus "Recall" (`status: 'called'` again).
- Key `STATUS_CONFIG` and `getNextActions` off `apt.queue_status || apt.status`.
- Show `apt.room_name` in a small `Badge` next to the doctor name when present.

### 6. Locale keys
- `public/locales/{en,ru,uz}/dashboard.json` — under `staff.schedule.status` add `called`; under `staff.schedule.actions` add `callNext` and `recall` (translated for ru/uz).
- `public/locales/{en,ru,uz}/rooms.json` — add the full `display` object listed in the request (English literal for en; translated for ru/uz), covering admin panel keys (roomsToday, pickRoom, pairedDisplays, addDisplay, online/offline, linkCopied, etc.) and TV screen keys (tapToStart, busy, free, nowCalling, goTo, …).

### Notes / assumptions
- The migration already ran in the previous turn (`20260705094959_...sql` created `clinic_displays`, added `queue_status`/`called_at`/`room_id` on appointments, and the `get_queue_display` RPC). No new migration needed.
- `useQueueDisplay.ts`, `QueueDisplay.tsx`, `QueueDisplaySettings.tsx` are treated as authoritative — no changes to their contents.
- I'll only touch the files listed above; no business logic changes beyond the `status` vs `queue_status` split, which is a bug fix required for the buttons to work.
