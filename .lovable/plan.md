## 1. Fix "Summary PDF" failure in Appointment Session

`src/pages/AppointmentSession.tsx` (line 783) calls the edge function `appointment-summary-pdf`, which is broken because:

- It selects `doctors.profile_id` and uses it for authorisation, but the `doctors` table only has `user_id` (no `profile_id` column) → query fails / authorisation always fails.
- `String.fromCharCode(...pdfBytes)` blows the call stack on PDFs > ~64 KB.
- The function may not be redeployed since the bug was introduced.

**Fix in `supabase/functions/appointment-summary-pdf/index.ts`**:

- Replace every `profile_id` reference with `user_id`:
  - `select("id, profile_id")` → `select("id, user_id")`
  - `(doctorRow as any).profile_id === user.id` → `(doctorRow as any).user_id === user.id`
  - The `profiles` lookup `eq("user_id", profile_id)` becomes `eq("user_id", doctorRow.user_id)`.
- Replace `btoa(String.fromCharCode(...pdfBytes))` with a chunked encoder that walks the `Uint8Array` in 0x8000-byte slices.
- Wrap the `appointment_summary_documents` insert in a try/catch so an audit-log failure never aborts the response.
- Re-deploy `appointment-summary-pdf`.

No DB migrations.

## 2. Rename popup CTA & add Finance section

The "patient and appointment details popup" is `AppointmentQuickPreview.tsx` (the dialog that opens on appointment click).

**`src/components/doctor/calendar/AppointmentQuickPreview.tsx`**

- Change the dental-chart button label from `tp("openDentalChart")` → `tp("appointmentSession")` ("Appointment Session"). Keep the click target (`/appointment-session/${id}?tab=dental`) and the `Stethoscope` icon, and show it for all doctors (not just dentists) — user wants this to be the standard entry to the session.
- Add a new collapsible **Finance** section above the action buttons, visible only when the viewer is the doctor or clinic staff (skip for patients):
  - Reads `payments` (by `appointment_id`) and `billing_transactions` (by `appointment_id`) for that appointment, plus `patient_insurance` (by `patient_id`) for the active card.
  - Computes: total billed, total paid, outstanding balance, prior patient balance (sum of unpaid `billing_transactions` for the same patient across other appointments), and any discount lines (`transaction_type = 'discount'` or negative-amount entries).
  - Inline form to **record a new payment** that inserts into `payments` with: `amount`, `payment_method` (cash, card, insurance, bank_transfer, other), `notes`, `status='completed'`, `paid_at=now()`. After insert, refresh totals.
  - Action chips: **Mark fully paid**, **Apply discount** (opens small dialog with amount + reason → inserts a `billing_transactions` row with `transaction_type='discount'`).
  - Show insurance summary line if `patient_insurance` row exists (provider name, member id, copay).

All amounts use the existing `useCurrency` hook for display formatting; raw values stay in their stored currency.

## 3. English translations for doctor dashboard

Audit `public/locales/en/dashboard.json` for missing keys referenced by:
- `src/pages/AppointmentSession.tsx` (every `t('doctor.session.*')` call — Session/Diagnoses/Dental/Rx/Notes tab labels, Quick Actions, header buttons).
- `src/components/doctor/calendar/AppointmentQuickPreview.tsx` (`tp("appointmentSession")`, finance subsection labels).
- `src/components/doctor/calendar/AppointmentModal.tsx` (`tm(...)` keys already partly localised — fill any remaining hardcoded English fallbacks).

Add the missing keys (English values only) under existing namespaces:
- `appointmentPreview.appointmentSession`, `appointmentPreview.finance.*` (totalBilled, totalPaid, outstanding, priorBalance, discount, insurance, recordPayment, paymentMethod, cash, card, insuranceMethod, bankTransfer, other, markFullyPaid, applyDiscount, reason, amount).
- `doctor.session.*` for hard-coded strings (Quick Actions, Session, Diagnoses, Dental, Rx, Notes, Video Consultation, Start/Join Video, End Video, End Session, etc.).

Only English (`public/locales/en/dashboard.json`) — other locales already exist and aren't part of this task.

## Files touched

- `supabase/functions/appointment-summary-pdf/index.ts` (fix + redeploy)
- `src/components/doctor/calendar/AppointmentQuickPreview.tsx` (label rename + finance panel)
- `src/components/appointments/AppointmentFinancePanel.tsx` (new — finance UI)
- `src/hooks/useAppointmentFinance.ts` (new — totals + mutations)
- `public/locales/en/dashboard.json` (new keys)

## Out of scope

- No new tables/migrations.
- No changes to non-English locale files.
- No changes to the patient-side preview.
