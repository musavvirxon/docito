# Show real patient data in the appointment dialog + credit balance for overpayments

## 1. Patient card in the appointment details dialog shows "P / Patient"

The dashboard's upcoming/recent appointments are built in `src/hooks/useDoctorDashboard.ts`, which only joins `profiles:patient_id`. For manually added patients (`doctor_patient_id`, no `patient_id`) that join returns nothing, so `patient_name` becomes "Unknown Patient" / empty and the card in `UpcomingAppointmentCard.tsx` falls back to the placeholder avatar "P" and the literal "Patient", with no phone or email.

Changes:
- In `useDoctorDashboard.ts`, after loading appointments, collect the `doctor_patient_id` values and fetch `full_name, phone, email` from `doctor_patients` in one query, then merge those into `patient_name` / `patient_phone` / `patient_email`.
- Keep the `profiles` join for registered patients; only fall back to the manual record when the join yields nothing.
- Replace the hardcoded `'Unknown Patient'` / `'Patient'` strings in the hook and in `UpcomingAppointmentCard.tsx` with translated fallbacks (EN/RU/UZ), used only when neither source has a name.
- Show date of birth/gender is out of scope here — the full profile is already available via the "View Patient Details" dialog.

## 2. Overpayment should become a credit balance

In `src/components/patient/PatientFinancialTab.tsx` the running balance already goes negative when payments exceed charges, but the card clamps it with `Math.max(outstanding, 0)` and simply labels it "Settled", so the extra money disappears from view.

Changes:
- When the running balance is negative, render the card as a **credit balance**: positive amount, neutral/success styling, and a "Credit" badge instead of "Settled" (settled stays for an exact zero balance).
- Show the credit amount in the ledger footer/summary as well, so the running-balance column reads consistently.
- In `src/components/appointments/AppointmentFinancePanel.tsx`, the outstanding KPI (`finance.outstanding + finance.priorBalance`) gets the same treatment: negative total renders as "Credit balance" with a success tone rather than a negative-looking outstanding figure.
- New strings (`ledger.creditBalance`, `ledger.credit`, `finance.kpi.credit`) added to the `finance` namespace for EN/RU/UZ.

## Technical notes

Frontend/presentation only. No schema, RLS, or ledger-logic changes: the underlying ledger already nets payments against charges, so a credit is just the negative side of the existing balance being displayed instead of hidden. Files: `src/hooks/useDoctorDashboard.ts`, `src/components/doctor/UpcomingAppointmentCard.tsx`, `src/components/patient/PatientFinancialTab.tsx`, `src/components/appointments/AppointmentFinancePanel.tsx`, plus `public/locales/{en,ru,uz}` finance/dashboard files.
