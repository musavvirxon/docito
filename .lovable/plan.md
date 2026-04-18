

## Plan: Complete All Remaining Admin Dashboard Work (Except Payment Gateways)

Wire up every remaining placeholder to Supabase and finish the i18n sweep across `src/pages/AdminDashboard.tsx`. Skip only Stripe/PayMe/Click/LemonSqueezy connect buttons.

---

### Batch 1 — Wire remaining placeholders to Supabase

**Settings tabs** (persist to `entity_settings.payload`)
- Clinic info: name, address, phone, email, hours, timezone → save via `entitySettings.saveSettings({ clinic: {...} })`
- Branding: logo URL, primary color, accent color, theme preset → save under `branding`
- Notifications: email/SMS toggles, reminder windows, escalation rules → save under `notifications`
- Security: session timeout, 2FA requirement, IP allowlist → save under `security`
- Data export: trigger CSV download of patients/appointments/billing via existing data + `xlsx` package

**Finance** (use existing `finance_*` tables)
- Payroll calculation → query `staff_compensation` + `appointments` to compute period totals; insert `finance_payroll_runs` row
- Payout processing → mark payroll run as `paid`, insert `finance_transactions` records
- Compensation editing → upsert into `staff_compensation`
- Rule edit/pause/delete → update `finance_rules` (status flag + delete)

**Patients**
- Edit insurance → update patient `insurance_info` JSONB column
- Export patient data → CSV via existing `xlsx`
- Re-engagement emails → invoke existing `send-notification` edge function with template

**Billing**
- Invoice template customization → save template under `entity_settings.payload.billing.invoice_template`
- Audit logs viewer → already done last batch (verify works)

**Insurance**
- Already persisted to `entity_settings.payload.insurance` — verify hydration

**Analytics**
- Scheduled reports (2 buttons) → save schedule config under `entity_settings.payload.reports.schedules` (cron-style metadata; actual cron execution is out of scope, store the intent)

**Integrations — Medical Systems**
- Lab system connect → save selected lab provider ID under `integrations.lab_provider_id`
- Imaging/PACS connect → save under `integrations.imaging_provider_id`
- Both pull options from existing `practices` table filtered by `entity_type`

---

### Batch 2 — i18n key population (`public/locales/en/admin.json`)

Add ~400 keys in these namespaces:
- `settings.clinic.*`, `settings.branding.*`, `settings.notifications.*`, `settings.security.*`, `settings.data.*`, `settings.integrations.*`
- `finance.ledger.*`, `finance.payroll.*`, `finance.compensation.*`, `finance.rules.*`, `finance.categories.*`
- `billing.invoices.*`, `billing.transactions.*`, `billing.insurance.*`, `billing.claims.*`
- `patients.list.*`, `patients.profile.*`, `patients.notes.*`, `patients.actions.*`
- `analytics.charts.*`, `analytics.summary.*`, `reports.builder.*`, `reports.schedule.*`
- `providers.list.*`, `providers.profile.*`, `providers.calendar.*`
- `common.*` (save, cancel, delete, edit, loading, empty states)

---

### Batch 3 — Replace hardcoded strings with `t()` calls

Sweep `AdminDashboard.tsx` in priority order: Settings → Billing → Analytics → Patients → Providers → Finance. Replace every English literal in JSX (labels, placeholders, button text, toasts, table headers, descriptions) with `t('admin.…')`.

---

### Constraints
- English only (`en/admin.json`)
- All edits to `src/pages/AdminDashboard.tsx` + `public/locales/en/admin.json` (no new files)
- Skip Stripe / PayMe / Click / LemonSqueezy — keep "coming soon" toasts on those 4 buttons only
- No schema changes — reuse `entity_settings`, `finance_*`, `audit_logs`, `billing_transactions`, `staff_compensation`, `patients.insurance_info`
- All Supabase calls wrapped in try/catch with toast feedback
- Use `xlsx` (already in deps) for CSV exports
- Use existing `send-notification` edge function for re-engagement emails

### Risk note
Very dense single-file work (~6000+ lines). I'll execute in mid-batch checkpoints if any single tool call gets too large, and report progress between batches so you can interrupt if priorities shift.

