# Appointment Session – Full Build Plan

Goal: turn the appointment session into a complete clinical + financial workspace, fix the LiveKit crash, connect messaging-type appointments to the chat thread, and surface everything in the summary PDF.

---

## 1. Fix VideoRoom "Room is not defined" crash

`src/components/video/VideoRoom.tsx` lazy-imports `livekit-client` into a module-level `lkModule` but then references `Room`, `RoomEvent`, `Track`, `ConnectionState`, `RemoteParticipant`, etc. as if they were globals.

Replace the lazy `getLivekit` pattern with a normal static import:

```ts
import {
  Room, RoomEvent, Track, ConnectionState,
  type RemoteTrackPublication, type LocalTrackPublication,
  type RemoteParticipant, type LocalParticipant,
} from 'livekit-client';
```

Remove the `let lkModule` block. Keep `// @ts-nocheck` off — proper types will work.

This eliminates the runtime "Room is not defined" error that throws the AppointmentSession route into the RouteErrorBoundary ("Something went wrong").

---

## 2. Procedures system in Appointment Session

The current Procedures section is a chip list in local React state only — nothing is persisted, nothing is costed, no tooth selection.

### 2a. Replace the chip UI with a real, persisted procedure manager

New component `src/components/appointments/AppointmentProceduresPanel.tsx` shown in the Session tab where the current "Procedures" card lives, and **renamed from "Dental" tab to "Procedures"** (the dental chart moves inside).

Features:
- "Add procedure" → modal with:
  - Procedure picker (autocomplete from `procedures` and `dental_procedures` tables; falls back to free text)
  - Cost (prefilled from `default_cost`, editable)
  - Quantity
  - Status (`planned | in_progress | completed | cancelled`)
  - Notes
  - **Tooth selector** (only when dentist) — inline mini odontogram picking 1+ teeth (32 permanent + optional primary toggle), reusing `ToothSVG` from `src/components/dental/`.
- List of added procedures with: name, teeth, status badge, cost, total, edit/delete.
- Totals row (subtotal, tax-aware later).
- "Mark all completed" bulk action.

### 2b. Persistence

Write to existing tables:
- Non-dental: `appointment_procedures` (`appointment_id`, `procedure_id`, `procedure_notes`, `estimated_cost`, `status`, `prescribed_by`).
- Dental (when teeth are selected): `tooth_procedure_history` (already used) with `appointment_id`, `procedure_id`, `procedure_name`, `tooth_numbers[]`, `cost`, `status`, `notes`, `performed_at`, `doctor_id`, `patient_id`.

Single React Query hook `useAppointmentProcedures(appointmentId)` that loads from both tables and returns a unified list.

### 2c. Rename "Dental" tab → "Procedures"

In `src/pages/AppointmentSession.tsx`:
- Tab key stays `dental` internally but label becomes "Procedures" with `Stethoscope` icon.
- The tab is now visible for **all specialties**, not only dentists.
- Inside the tab: `<AppointmentProceduresPanel />` on top, then (only for dentists) the `EnhancedDentalChart` below it as the visual selector — clicking a tooth opens the same Add Procedure modal pre-filled with that tooth.
- Update `VALID_TABS`, `handleTabChange` and `useEffect` that forces non-dentists off the `dental` tab.

---

## 3. Patient Finance – full management

Replace the placeholder `<PatientFinanceSection compact payments={[]} />` with a real `useAppointmentFinance(appointmentId, patientId)` hook backed by `payments`, `invoices`, `billing_transactions`.

### 3a. Hook responsibilities
- `loadInvoices()` — invoices for this patient (and one specifically for this appointment if exists).
- `loadPayments()` — `payments.appointment_id = appointmentId`.
- Aggregates: `billed`, `paid`, `outstanding`, `priorBalance` (other unpaid invoices), `discountTotal`, `refundTotal`.

### 3b. Actions in the panel
- **Create / regenerate invoice** for this appointment: builds line items from `appointment_procedures` + `tooth_procedure_history`, inserts into `invoices` (or `billing_invoices` per existing schema), returns invoice id.
- **Record payment**: amount, method (cash, card, insurance, transfer, other), reference no, paid_at → insert into `payments`.
- **Apply discount** (% or fixed) → stored as a negative adjustment line on the invoice or a discount payment row.
- **Mark fully paid** (one-click for the outstanding balance).
- **Refund** (negative payment).
- **Insurance**: select from `patient_insurance` (if present) and split portion.

### 3c. Invoice PDF
New util `src/utils/generateInvoicePdf.ts` (jsPDF) — branded layout with: clinic header, patient block, appointment date/doctor, line items (procedures w/ tooth numbers), subtotal/discount/tax/total, payments received, balance due, signature line. Saved as `invoice_{number}_{patient}.pdf`.

Download buttons in the finance panel: **Invoice PDF** and **Receipt PDF** (latter shows only the payment).

### 3d. Patient Profile parity
Already partially wired in `AdminDashboard.tsx`. Swap its `payments={[]}` for the live hook so the Billing tab uses the same data source.

---

## 4. Connect everything to the Summary PDF

Currently `generateAppointmentPdf` only receives `treatment` (= sessionNotes) and patient/doctor names — procedures, finance, diagnoses, prescriptions are all empty.

Update the call site in `AppointmentSession.tsx` and the util signature to accept and render:
- Diagnoses (from `diagnoses` state — primary/secondary, ICD-10).
- Procedures (unified list from §2) with teeth and per-line cost.
- Prescriptions (query `prescriptions` for this appointment).
- Finance summary: billed / paid / outstanding + payment table (method, date, amount).
- Session notes.
- Signature + verification footer (existing 043/u layout preserved).

The util gains a `summary: { diagnoses, procedures, prescriptions, finance }` block; missing sections are skipped, never left blank with placeholder underlines.

---

## 5. Per-appointment-type feature wiring

The colored type-specific cards in the Session tab currently only `toast.info('coming soon')`. Make each one actually work.

| Type | Action | Wiring |
|------|--------|--------|
| `video` | Start / Join Video | already works via `startOrJoinVideo` (kept) |
| `video` | Copy Link | copy `/video-call/{consultation.id}` to clipboard |
| `in_person` / `in-person` | Mark Checked In | update `appointments.check_in_time = now()` |
| `home_visit` / `home` | Open in Maps | already works |
| `home_visit` | Log Travel Time | insert into `appointment_travel_log` (or `appointments.travel_time_min`) |
| `follow_up` | View Previous Notes | navigate to previous appointment session |
| `follow_up` | Schedule Next Follow-up | open booking modal pre-filled |
| `messaging` / `message` / `chat-removed` | **Open Chat Thread** | see §6 |

Also add a finance quick-pay button to every type card so a doctor can log payment without leaving the session.

---

## 6. Messaging-type appointment → real chat

`messaging` is in the `AppointmentType` union. The Session tab card has an "Open Chat Thread" button that currently just toasts.

Wire it to the existing `Messages` page (`src/pages/Messages.tsx`, route `/messages`):

1. Helper `getOrCreateAppointmentConversation(appointmentId, doctorId, patientId)`:
   - Query `conversations` where `context_type='appointment'` and `context_id=appointmentId`.
   - If none, insert new `conversations` row with that context, then insert two `conversation_participants` rows (doctor + patient).
2. On click, navigate to `/messages?conversation={id}` so `Messages.tsx` opens the thread directly.
3. In `Messages.tsx`, read the `conversation` query param on mount and auto-select that thread.
4. The session card also shows the **last 3 messages** preview inline (read-only) with an "Open full chat" link, so the doctor sees context without leaving.

Note: the previous `chat` type was removed (per earlier task) — `messaging` is the canonical async-consult type and is what binds to the conversation.

---

## 7. Translations

Add the new keys (procedures panel, finance actions, invoice/receipt buttons, messaging card, type-card actions) to `public/locales/en/dashboard.json` and mirror the keys (English fallback values) into `ru/`, `uz/` so nothing renders as `doctor.session.x.y` raw.

---

## Technical notes

- **No new packages** — `jspdf`, `livekit-client`, `lucide-react`, react-query, sonner are all present.
- **RLS**: writes to `payments`, `invoices`, `appointment_procedures`, `tooth_procedure_history`, `conversations`, `conversation_participants`, `messages` use the authenticated doctor's session — existing policies cover these (doctor of the appointment / participant). No migrations needed unless a missing column shows up at write time.
- **Realtime**: subscribe the finance panel to `payments` and `invoices` filtered by `appointment_id` so multiple staff stay in sync.
- **State/UX**: keep current ResizablePanelGroup layout, keep return-to-calendar `sessionStorage` flow, keep tab persistence.

## Files

**New**
- `src/components/appointments/AppointmentProceduresPanel.tsx`
- `src/components/appointments/AddProcedureModal.tsx`
- `src/hooks/useAppointmentProcedures.ts`
- `src/hooks/useAppointmentFinance.ts` (rewrite — currently a stub)
- `src/utils/generateInvoicePdf.ts`
- `src/lib/messaging/getOrCreateAppointmentConversation.ts`

**Edited**
- `src/components/video/VideoRoom.tsx` — static LiveKit imports, remove `@ts-nocheck`.
- `src/pages/AppointmentSession.tsx` — rename Dental→Procedures tab, mount panels, wire type cards, pass full summary to PDF, open chat link.
- `src/components/PatientFinanceSection.tsx` — accept full hook output (or render inside a thin wrapper using the new hook).
- `src/utils/generateAppointmentPdf.ts` — accept and render diagnoses, procedures, prescriptions, finance.
- `src/pages/Messages.tsx` — auto-select conversation from `?conversation=` param.
- `src/pages/AdminDashboard.tsx` — Billing tab uses the live finance hook.
- `public/locales/{en,ru,uz}/dashboard.json` — new keys.
