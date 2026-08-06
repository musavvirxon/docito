# Move visit billing into its own "Billing" tab

Today the visit finance panel (`AppointmentFinancePanel`) renders inline inside the **Session** tab of the appointment session page, below clinical findings. It will be promoted to a dedicated tab in the same tab bar.

## What changes

- Add a `billing` tab trigger with a wallet icon, placed after **Retsept (Rx)** and before **Eslatmalar (Notes)**.
- Move `AppointmentFinancePanel` out of the Session tab content into a new `TabsContent value="billing"`, with the same props (appointment id, patient id, patient name, date, procedures) — no logic or data-model change.
- Gate the tab the same way the panel is gated today: only render when an appointment is loaded.
- Everything else on the Session tab (findings, session notes) stays where it is.

## i18n

Add `doctor.session.tabs.billing` to the doctor namespace for en / ru / uz ("Billing" / "Оплата" / "To'lov"). No hardcoded strings.

## Technical notes

- Single file edit: `src/pages/AppointmentSession.tsx` (tab list around line 1219, panel around line 1557) plus the three locale files.
- Deep-linking already works via the existing `?tab=` query handling, so `?tab=billing` will open it directly.
- Tab bar already wraps on narrow widths, so mobile stays legible.
