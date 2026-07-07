## Plan

### 1. Default theme = night (dark) mode
- **`src/contexts/ThemeContext.tsx`**: Change default `mode` from `'auto'` to `'dark'` when no saved preference exists in localStorage. User can still switch to light manually via `ThemeToggle`.

### 2. Queue display link "invalid or disconnected"
Root cause: the `get_queue_display` RPC is called with the anon client on a public route. The RPC likely requires auth or the `clinic_displays` row lookup by token is blocked by RLS / permissions.
- Investigate `get_queue_display` function definition and `clinic_displays` grants.
- **Migration**: Make `get_queue_display` `SECURITY DEFINER` with `search_path = public`, grant EXECUTE to `anon, authenticated`. Ensure `clinic_displays` token lookup works for anon (the function bypasses RLS as definer).
- Verify token generation in `QueueDisplaySettings` actually inserts a row into `clinic_displays` with a matching token column.

### 3. Room & bed management — add room/counter data doctors work in
- **`src/components/rooms/`** (RoomBedManagement UI): Extend the "Room" form so admins can assign one or multiple doctors to a `clinic_rooms` row (room_number/counter number is likely already a column; if not, add `room_number` / `counter_label`).
- **Migration** (only if columns missing): add `room_number text`, `counter_label text`, and a `clinic_room_doctors` join table (room_id, doctor_id) with grants + RLS.
- Surface the assigned room on the staff dashboard so the "Call next" broadcast + display screen already pick it up (wiring exists via `room_id` on appointments).

### 4. Currency stuck on `$` in appointment session procedure history, doctor profile, and booking page
- Find the hardcoded `$` in:
  - Appointment session "procedure added" history component
  - Doctor profile pricing
  - Booking page pricing
- Replace with the existing `useCurrency()` / `CurrencyContext` `formatCurrency()` helper (already used elsewhere) so it follows the practice/user currency setting.

### 5. i18n for the selected appointment detail dialog + Uzbek/Russian translations
Add translation keys for the appointment detail dialog visible in the screenshot:
- Tabs: Details, Clinical Items, Procedures, Treatment Plans, Patient
- Labels: Appointment type, Video, Notes, Patient name, Patient phone
- Actions: Book Follow-up, Download Summary, Reschedule, Cancel, Close
- Status: Confirmed

Add matching keys to `public/locales/en/appointments.json`, `public/locales/ru/appointments.json`, `public/locales/uz/appointments.json`, and swap hardcoded strings in the dialog component for `t(...)` calls.

### Files touched (approximate)
- `src/contexts/ThemeContext.tsx`
- `src/components/rooms/QueueDisplaySettings.tsx` + related room management UI
- Appointment detail dialog component (to be located under `src/components/doctor/` or `src/components/appointments/`)
- Procedure history + doctor profile + booking pricing components (currency)
- `public/locales/{en,ru,uz}/appointments.json`
- 1–2 Supabase migrations (queue display RPC grants; optional rooms schema)

### Order of execution
1. Theme default (1 file)
2. Locate & fix hardcoded currency
3. Queue display migration + verify
4. Rooms UI extension (+ migration if needed)
5. i18n keys + translations
