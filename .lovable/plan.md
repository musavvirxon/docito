

## Status Audit: Admin Dashboard Functions + i18n

I have **NOT finished** the original request. Here's the honest state:

### What IS done ✅
- **Settings → Integrations**: Fully wired to Supabase `entity_settings` (API keys, webhooks, calendar sync persist)
- **Billing → Insurance**: Built (local state — claims, insurers, filters working)
- **Analytics → Reports**: Custom Reports tab with CSV export, metric builder, filters
- **i18n keys added**: ~500 keys populated in `public/locales/en/admin.json` (sidebar, providers, billing, finance, analytics, reports, settings)
- **i18n applied**: Onboarding screens, error states, Provider Profile tabs use `t()`

### What is NOT done ❌

**Placeholders still using `toast.info('coming soon')`** — 28 remaining, including:
- Settings tabs: clinic info, branding, notifications, security, data export — none wired to Supabase
- Finance: payroll calculation, payout processing, compensation editing, rule edit/pause/delete
- Patients: re-engagement emails, edit insurance, export patient data
- Billing: invoice template customization, audit logs viewer
- Analytics: scheduled reports (2 buttons)
- Integrations: Stripe/PayMe/Click/Lab/Imaging connect buttons (only Calendar Sync works)
- Insurance: claims persistence (currently local state only — survives page refresh = NO)

**i18n hardcoded strings** — only ~91 `t('admin.…')` calls vs 6021-line file. Estimated **80%+ of UI strings still hardcoded**, including:
- All Settings tab fields (clinic info, branding inputs, notification toggles, security panels)
- Finance tab labels, table headers, button text
- Billing tab labels, claims form, insurance UI
- Patients tab labels, search placeholders, table headers
- Analytics tab labels, chart titles, summary cards
- Integrations card titles, descriptions, button text

---

## Plan to Actually Finish

Given the scope (~28 placeholder wires + ~400+ hardcoded strings across a 6021-line file), I'll execute in **3 batches** in a single approval:

### Batch 1 — Wire remaining placeholders to Supabase
- **Settings** (clinic, branding, notifications, security, data) → persist via `entity_settings` payload
- **Insurance claims + insurers** → persist via `entity_settings.integrations.insurance`
- **Finance** (payroll, payout, compensation edit, rule edit/pause/delete) → use existing `finance_*` tables
- **Patients** (edit insurance, export, re-engage) → wire to existing patient mutation hooks
- **Payment gateways** (Stripe/PayMe/Click) → keep as "coming soon" but with proper modal explaining setup is admin-only (real Stripe Connect needs OAuth infra — out of scope)
- **Audit log viewer** → query `audit_logs` table inline

### Batch 2 — i18n key population
Add ~400 new keys to `public/locales/en/admin.json` covering:
- `settings.clinic.*`, `settings.branding.*`, `settings.notifications.*`, `settings.security.*`, `settings.data.*`, `settings.integrations.*`
- `finance.ledger.*`, `finance.payroll.*`, `finance.compensation.*`, `finance.rules.*`, `finance.categories.*`
- `billing.invoices.*`, `billing.transactions.*`, `billing.insurance.*`
- `patients.list.*`, `patients.profile.*`, `patients.notes.*`
- `analytics.charts.*`, `analytics.summary.*`, `reports.*`
- `providers.list.*`, `providers.profile.*`, `providers.calendar.*`

### Batch 3 — Replace hardcoded strings with `t()` calls
Sweep through Settings → Billing → Analytics → Patients → Providers in that priority order, replacing every hardcoded English string with `t('admin.…')`.

### Constraints
- English only (per your earlier choice)
- All edits to `src/pages/AdminDashboard.tsx` + `public/locales/en/admin.json`
- No new files, no schema changes (use existing `entity_settings`, `finance_*`, `audit_logs`, `billing_transactions`)
- Real Stripe/PayMe/Click OAuth out of scope — replaced with informative modals instead of toasts
- Wrap all new Supabase calls in try/catch with toast feedback

### Risk
This is ~3-4 hours of dense edits to one file. I will work in surgical line replacements, not full rewrites. If any single batch is too large for one response, I'll split mid-batch and report progress.

