## Plan

1. **Unify clinic financial data sources**
   - Make clinic admin Billing and Financial stats aggregate both:
     - clinic-level `billing_transactions`
     - every clinic doctor’s rows in `payments`
   - Preserve legacy doctor-scoped payments where `practice_id` is missing by resolving them through `doctors.practice_id`.
   - Include doctor name, patient name, appointment/service metadata, and payment method in clinic admin transaction rows.

2. **Fix partial payment registration**
   - Update the payment recording flow so a payment less than the full pending amount is accepted.
   - Track paid amount vs remaining balance instead of treating any payment as “fully paid”.
   - Keep partially paid items visible as pending for the remaining balance, and show a clear `partial`/remaining state in doctor and clinic financial sections.

3. **Add invoice creation tied to real billing data**
   - Replace prompt-only invoice creation in clinic admin with a reusable invoice/payment helper that creates `billing_invoices` with patient, doctor, appointment, service, line items, and balance metadata.
   - When a payment is recorded, create or update the linked invoice so `amount_due_cents`, `amount_paid_cents`, and `amount_remaining_cents` stay correct.
   - Add the same capability to doctor financial pending payments so doctors can record payments and generate invoice PDFs from the resulting invoice.

4. **Expose invoices and financial info in dashboards**
   - Clinic admin Billing → Invoices: show real `billing_invoices`, plus invoice rows generated from doctor payments when needed.
   - Clinic admin Billing → Transactions: show all doctor + clinic payment transactions with doctor/patient/service columns.
   - Doctor Financial Stats: add invoice download/access for recorded payments and pending items.
   - Ensure CSV export includes unified payment/invoice data instead of only finance entries.

5. **Secure database support**
   - Add/adjust DB helpers and RLS-safe policies only where needed so:
     - doctors can create/manage invoices/payments for their own patients
     - clinic admins/billing staff can access invoices/payments for their clinic and clinic doctors
     - patients can only see their own invoices/payments
   - Add triggers/functions to backfill/maintain `practice_id`, invoice status (`pending`, `partial`, `paid`), and transaction metadata consistently.

6. **Validate**
   - Check Supabase function logs and test the affected edge functions.
   - Verify: full payment, partial payment, doctor-created payment, clinic-admin-created invoice, clinic aggregate totals, invoice PDF download, and empty-state behavior.