## Goal
Make every finance/billing surface respect the user's selected display currency (converted from each entity's base currency), and have completed appointment sessions automatically feed the finance ledger while also being aggregated live in dashboards.

## 1. Currency: store entity base, display in user's

### Data model
- Add `currency` column (text, default `'USD'`) to: `practices`, `doctors`, `clinic_lab_orders`/finance entities that don't already have it. Verify which already do (`finance_entries` already has one). Backfill `'USD'`.
- Ensure `finance_entries`, `billing_invoices`, `billing_transactions`, `payments`, `compensation_payouts`, `staff_compensation_profiles`, `payment_holds` all have a `currency` column. Backfill from parent entity.

### Frontend formatter
- New helper `useEntityMoney(entityCurrency)` (in `src/hooks/useEntityMoney.ts`) that:
  - reads display currency + FX rates from `CurrencyContext`
  - returns `format(amount)` / `formatCents(cents)` that **convert** from `entityCurrency` → display currency using FX rates from `fx_rates` (already cached in CurrencyContext), then formats with the display locale.
  - Falls back to entity currency formatting if FX unavailable.
- Update `src/lib/currency.ts` to expose a `convertAndFormat(amount, from, to, rates, locale?)` utility.

### Replace hardcoded `$` / `toFixed` across finance/billing
Refactor these files to use `useEntityMoney(entity.currency)` instead of `${x.toFixed(2)}` / `$${cents/100}`:
- `src/pages/AdminDashboard.tsx` → `billing` and `finances` cases (KPI cards, payment summary, ledger rows, recent entries, expense breakdown, transactions table, by-method/by-status).
- `src/pages/FinanceDashboard.tsx`
- `src/components/billing/BillingOverview.tsx`, `PaymentHoldsSection.tsx`, `SuperbillsManager.tsx`
- `src/components/financial/*` — every panel listed (FinanceOverview, FinanceLedgerPanel/Manager, FinanceTransactions, ExpensesPanel/EntriesPanel, IncomeEntriesPanel, PayrollPanel/EntriesPanel/RunsPanel, SuppliesPanel/PurchasesPanel, BudgetsPanel/Dashboard/Editor/VsActualPanel, ReportsPanel, RecurringRulesPanel/ExpensesPanel/TemplatesPanel, FinanceAnalyticsPanel, FinanceCategoriesManager, FinanceEntriesExportCard, FinanceEntryDialog, FinanceHub, CompensationManager/ProfileDialog/ProfilesPanel, AttendancePanel, AdvancedFinancialMetrics, ExpenseBreakdownPanel, InventoryItemsPanel, FinancialInputsModal, FinancePlaceholder, FinanceManagementSection).
- `src/components/doctor/FinancialOverview.tsx`, `FinancialChart.tsx`, `FinancialInsights.tsx`, `FinancialPayouts.tsx`, `FinancialPending.tsx`, `FinancialServices.tsx`, `PerformanceServices.tsx`, `MarkAsPaidDialog.tsx`, `TreatmentPlanningSection.tsx`, `DoctorProcedureLibrarySection.tsx`, `calendar/AppointmentModal.tsx`, `public/ProceduresSection.tsx`, `DoctorFinancialStatsSection.tsx`.

Each amount renders via `money(amount, sourceCurrency)`; the LanguageSwitcher / CurrencyContext already controls the target.

### Currency setting UI
- In each entity's Settings → Finance section, add a "Base currency" Select bound to entity row (`practices.currency`, `doctors.currency`, etc.).
- Confirm the global `CurrencySwitcher` is reachable from header (already exists via `useCurrency`).

## 2. Doctor appointment session → finance

### Trigger / edge function
- New DB trigger `on_appointment_session_completed_to_finance`: when an `appointment_sessions` row transitions to `ended_at IS NOT NULL` (or `status='completed'`) and a price is known, insert one `finance_entries` row:
  - `entity_type='practice'`, `entity_id = appointment.practice_id` (and a sibling row for `entity_type='doctor'`, `entity_id = appointment.doctor_id` when independent).
  - `type='income'`, `category='Consultation'` (or procedure name), `amount = remaining unpaid for that appointment` in entity currency, `reference = appointment_id`, `date = session.ended_at`.
  - Idempotent: skip if a row with same `reference` and `source='appointment_session'` already exists.
- Add `source` text column to `finance_entries` (default `'manual'`) to mark auto rows.

### Live aggregation in dashboards
- Update `useFinanceEntries` (or add `useEntityFinanceAggregate`) so AdminDashboard's `finances` case and `FinanceOverview` merge:
  - manual + auto `finance_entries`
  - **plus** live unbilled completed sessions not yet reflected (computed from `appointment_sessions` + `procedures.price` − `payments.amount`) — surfaced as "Pending from sessions" KPI and included in Income totals with a tag.
- Doctor's `FinancialOverview` already aggregates appointments; extend to also pull `finance_entries` where `entity_type='doctor'` so manual income/expenses show alongside session-derived totals.

## 3. i18n
- Add finance/currency keys (`finance.baseCurrency`, `finance.displayedIn`, `finance.pendingFromSessions`, etc.) to `en/finance.json` and mirror to the 10 other locales.

## Technical details
- All amounts stored as **major units** in `finance_entries.amount`, **cents** in `billing_*` and `payments` tables. The `useEntityMoney` hook exposes both `format(major, currency)` and `formatCents(cents, currency)`.
- FX conversion uses the existing `fx_rates` table loaded by `CurrencyContext`; fallback to `FALLBACK_FX_RATES` from `src/lib/currency.ts`.
- Trigger is SECURITY DEFINER, search_path locked, and writes through `service_role` grants already present on `finance_entries`.
- Idempotency key: unique partial index `finance_entries(reference, source) WHERE source='appointment_session'`.

## Out of scope
- Rewriting payments/Stripe flows.
- Multi-currency invoicing (invoices keep their original currency; display converts only).

```text
[entity.currency] --stored--> finance_entries / payments
                                     │
                                     ▼
                       useEntityMoney(entityCurrency)
                                     │
                       converts via fx_rates (CurrencyContext)
                                     ▼
                       displays in user's selected currency
```
