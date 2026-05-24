# Connect Doctor Financial Data → Clinic Admin + Invoice & Superbill Flow

## Goals

1. Every payment a doctor records (Mark Paid / partial) and every platform payment (Stripe/webhook) shows up in the clinic admin's Financial Stats, Billing transactions, Invoices, and Advanced KPIs in real time.
2. Invoice is auto-generated on payment and downloadable from doctor, clinic admin, and patient sides.
3. Real Superbill generation (not a prompt-only stub) available where each role needs it.

---

## 1. Unify payment data into clinic admin

**Database**
- Backfill `payments.practice_id` for any rows where it is null but the doctor is mapped to a clinic (re-run the existing `set_payments_practice_id` trigger logic as a one-shot UPDATE).
- Backfill `billing_invoices.entity_id`/`entity_type` to `practice` when the invoice's doctor belongs to a clinic, so clinic admin RLS sees them.
- Trigger update: when a `payments` row is inserted/updated and `practice_id` is null but `doctor_id` belongs to a clinic, auto-populate `practice_id`; mirror the same logic for `billing_invoices`.
- Verify RLS on `payments` and `billing_invoices` lets clinic admins/billing staff SELECT every row where `practice_id`/`entity_id` matches their clinic.

**Frontend / hooks**
- `useClinicBilling` / `usePracticeBilling` / `useFinancialStats` (clinic side): merge `billing_transactions` + `payments` for the clinic (already partially done in `practice-insights`); make sure the Billing tab in `AdminDashboard` lists every doctor's recorded payment with patient + doctor + service + invoice link.
- Add a Supabase realtime subscription on `payments` and `billing_invoices` filtered by `practice_id`/`entity_id` so clinic dashboards refresh the moment a doctor marks something paid or a webhook lands.
- Doctor `FinancialPending` rows currently show "Unknown Patient": patch the source query in `useFinancialStats` to join `profiles.full_name` (or `patient_profiles`) so names render on both doctor and clinic sides.

---

## 2. Invoice auto-generation + access

- `useRecordPayment` already creates/links a `billing_invoices` row and the `sync_invoice_from_payment` trigger updates balances. Extend:
  - On full payment, set `paid_at = now()` on the invoice and write `invoice_pdf_url` after a deferred PDF render (optional; download stays on-demand via `invoice-generate-pdf`).
  - On platform payments (Stripe `payment-webhook` / `create-payment-intent`), insert/upsert a `billing_invoices` row with the same shape so the same download endpoint works.
- Expose a "Download invoice" action everywhere a payment exists:
  - Doctor: `FinancialPending` (already in `MarkAsPaidDialog`) and `FinancialPayouts` rows that have `invoice_id`.
  - Clinic admin: Billing transactions table (already added) + new Invoices sub-tab listing every `billing_invoices` row for the clinic with status (pending/partial/paid), patient, doctor, amount, download.
  - Patient: in `PatientBilling` / appointment detail, show "Download invoice" for any appointment with a linked invoice.
- All downloads use the existing `invoice-generate-pdf` edge function (already locale + currency aware).

---

## 3. Superbill generation (real implementation)

Today `AdminDashboard` shows a "Generate Superbill" prompt that only fires a toast. Replace with a proper flow.

**Database**
- New table `superbills`: `id`, `practice_id`, `doctor_id`, `patient_id`, `appointment_id`, `superbill_number`, `service_date`, `diagnosis_codes jsonb` (ICD-10), `line_items jsonb` (CPT code, description, units, fee), `total_amount_cents`, `currency`, `status` (`draft`/`issued`/`submitted`), `pdf_url`, `metadata`, timestamps, `created_by`.
- RLS:
  - Doctor: full access to their own superbills.
  - Clinic admin / billing staff: full access to superbills where `practice_id` matches their clinic.
  - Patient: SELECT their own superbills.

**Edge function**
- New `superbill-generate-pdf` (mirrors `invoice-generate-pdf`): renders a localized, branded PDF including provider NPI/tax ID (from practice settings), patient info, diagnosis codes, CPT line items, totals, and payment received — what insurers require for reimbursement.

**Frontend**
- New `CreateSuperbillDialog`:
  - Pre-fills from appointment (patient, doctor, service date, services → CPT lines from procedure library).
  - Lets the user add/edit ICD-10 diagnosis codes and CPT line items.
  - Saves to `superbills` and triggers PDF render.
- Surfacing:
  - **Doctor** – on completed appointment row / patient detail: "Generate Superbill".
  - **Clinic admin** – Billing → Superbills tab: list all clinic superbills with status, patient, doctor, download; "Generate Superbill" action that opens the same dialog scoped to any doctor in the clinic.
  - **Patient** – Billing/appointment detail: download issued superbills for their visits.

---

## 4. Validation

- Doctor records full + partial payment → invoice status updates (`paid` / `partial`), appears in clinic admin Billing + Financial Stats + Advanced KPIs immediately.
- Platform Stripe payment webhook → same invoice flow, same visibility.
- Generate superbill from doctor side → shows up in clinic admin Superbills tab and patient billing, PDF downloads in current UI language.
- Empty states render cleanly when a doctor/clinic has no payments, invoices, or superbills.

---

## Technical notes

- Migrations: `superbills` table + RLS, payment/invoice `practice_id` backfill, trigger refresh.
- New edge function: `supabase/functions/superbill-generate-pdf/index.ts`.
- New hooks: `useSuperbills`, `useCreateSuperbill`.
- New components: `CreateSuperbillDialog`, `SuperbillsTable` (reused in doctor + clinic + patient surfaces).
- Realtime: append entity id + timestamp + random suffix to channel names per project memory.
- All UI strings via `useTranslation()`; add keys to `dashboard.json` for the 11 locales.
- Strip non-DB fields from any Supabase payload (per project memory).
