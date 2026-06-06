# Full i18n Coverage: Finance UI + Frontend PDFs + Treatment-Plan Edge Fix

Goal: every hardcoded English string in financial/billing components and frontend PDF generators is translatable; the treatment-plan edge function honors all 11 supported languages.

Supported locales (everywhere): `en, ru, uz, ar, tr, es, de, zh, pt, ja, ko`.

---

## Step 1 — Create `finance` namespace

1. **`src/i18n/config.ts`** — add `"finance"` to `I18N_NAMESPACES` between `"patients"` and `"popups"`. No other changes.
2. **Create `public/locales/en/finance.json`** with the full key set from the spec (~130 keys: income/expense/payroll/net, totals, table headers, actions, budgets, payroll, inventory, recurring, billing, superbill, PDF labels `generatedBy/generated/confidential/preparedBy/legalNotice/page/of`, status/empty/loading messages).
3. **Create the same file for all 10 other languages**: `ru, uz, ar, tr, es, de, zh, pt, ja, ko`. Identical key set in each, accurate translations per language, Arabic in native RTL script. Use the per-key translation table provided in the spec as the source of truth for critical terms; translate the rest consistently in the same style.

## Step 2 — Convert financial / billing / appointment components to `t()`

For each file: add `import { useTranslation } from 'react-i18next'` and `const { t } = useTranslation('finance')`, then replace every hardcoded English label/header/button/empty-state with the corresponding `t('key')`. Do not touch business logic, queries, or props.

Files (all under `src/components/`):

- `financial/`: `FinanceLedgerPanel`, `FinanceLedgerManager`, `FinanceAnalyticsPanel`, `FinanceOverview`, `FinanceHub`, `FinanceCategoriesManager`, `FinanceCategorySelect`, `FinanceEntriesExportCard`, `FinanceEntryDialog`, `FinanceTransactions`, `BudgetsPanel`, `BudgetDashboard`, `BudgetEditorPanel`, `BudgetVsActualPanel`, `PayrollPanel`, `PayrollEntriesPanel`, `PayrollRunsPanel`, `CompensationManager`, `CompensationProfileDialog`, `CompensationProfilesPanel`, `AttendancePanel`, `InventoryItemsPanel`, `SuppliesPanel`, `SuppliesPurchasesPanel`, `RecurringExpensesPanel`, `RecurringRulesPanel`, `ExpensesPanel`, `ExpenseBreakdownPanel`, `ExpensesEntriesPanel`, `IncomeEntriesPanel`, `ReportsPanel`, `FinancialInputsModal`
- `finance/`: `FinanceHub`, `RecurringTemplatesPanel`
- `billing/`: `BillingOverview`, `PaymentHoldsSection`, `SuperbillsManager`
- `appointments/AppointmentFinancePanel`
- `patient/PatientBilling`
- `dashboard/ClinicBillingSection` — audit-only; add `t()` for any still-hardcoded strings

## Step 3 — `src/utils/generateAppointmentPdf.ts` (Pattern B)

- Change signature: `generateAppointmentPdf(data, lang: string = 'en')`.
- Add `type Locale` union of all 11 codes, `normalizeLocale()`, inline `I18N: Record<Locale, Record<string,string>>`, `tr(locale, key)` helper.
- Keys per spec (medical-card form: ministry, medicalCard, form, okpo, phone, patient name parts, dob, age, gender, address, profession, date, time, appointmentNo, diagnosis, complaints, externalExam, intraOral, dentalFormula, treatment, recommendations, nextVisit, doctorSignature, stamp, generatedBy, confidential, page, of). Provide accurate translations for all 11 languages.
- Replace every `ru ? 'x' : 'y'` ternary with `tr(locale, 'key')`.

## Step 4 — `src/utils/generateInvoicePdf.ts` (Pattern B)

- Add `lang?: string` parameter; default `'en'`.
- Same Pattern B scaffold. Keys: invoice, invoiceNumber, date, dueDate, billTo, appointment, doctor, code, description, amount, subtotal, discount, total, amountPaid, outstanding, paymentHistory, paidOn, via, thankYou, generatedBy, confidential, page, of. Translate for all 11 languages.
- Replace every hardcoded literal in the PDF body with `tr(...)`.

## Step 5 — `src/components/PatientSummaryPDF.tsx` + `generatePatientPDF`

- Extend `GeneratePDFOptions` with optional `labels?: { generatedBy, generated, confidential, preparedBy, legalNotice, page, of, patient, doctor, diagnosis, medications, allergies, vitals, notes }`.
- Inside `generatePatientPDF`, replace each hardcoded label with `options.labels?.<key> ?? '<English fallback>'`.
- In `PatientSummaryPDF.tsx`, use `useTranslation('finance')` to build the `labels` object from `t()` and pass it through.
- Ensure all needed keys exist in `finance.json` for every language (add any missing ones consistently).

## Step 6 — Fix `supabase/functions/treatment-plan-generate-pdf/index.ts`

- Widen `type Locale` to all 11 codes.
- Replace `normalizeLocale` with the version that accepts every supported code and falls back to `'en'`.
- Ensure the `I18N` object has entries for all 11 languages; for any missing language, add accurate translations of every existing key. No other logic changes.

## Step 7 — Pass `i18n.language` at call sites

- For every caller of `generateAppointmentPdf(...)` and `generateInvoicePdf(...)`: `import i18n from '@/i18n/config'` and pass `i18n.language` as the locale arg.
- For every `supabase.functions.invoke('treatment-plan-generate-pdf', { body: {...} })`: include `locale: i18n.language` in the body.

## Out of scope (explicitly do not touch)

- `src/i18n/config.ts` beyond adding `"finance"` to `I18N_NAMESPACES`.
- Any existing locale JSON file.
- Edge functions: `prescription-generate-pdf`, `invoice-generate-pdf`, `referral-generate-pdf`, `superbill-generate-pdf`, `appointment-summary-pdf`.
- Routing, auth, data fetching, currency logic, RLS, schemas, dependencies.

## Verification

- Build passes; no TS errors in modified files.
- Switching app language re-renders all updated finance/billing UI in the chosen language.
- Generated appointment PDF, invoice PDF, patient summary PDF render in the active language for each of the 11 locales.
- Treatment-plan edge function returns localized output when `locale` is passed for each of the 11 codes (no silent fallback to `en` for non-`ru` languages).
