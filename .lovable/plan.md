## Goal

Fix three independent regressions in priority order: public links → currency → i18n. This will land in 3 sequential passes so progress is visible and reviewable. The plan below is the contract for all three.

---

## Phase 1 — Public booking & doctor profile links (production "doctor not found")

**Diagnosis** (confirmed by hitting the production REST API):
- `doctor_public_profile_view` is reachable by anon (200 OK).
- Lookups are `.eq()` on `custom_profile_link` / `username`, which are **case-sensitive** in Postgres. Real data contains mixed case (e.g. `dr.John.Doe1`). Typing `dr.john.doe1` returns `[]` → "doctor not found".
- Same code path is used by `/book-appointment/:doctorId` via `resolveDoctorIdFromSlug` (`src/lib/doctorSlug.ts`) and by `/doctor/:slug` (`src/pages/doctor/DoctorPublicProfile.tsx`).
- Routes under non-language paths (`/doctor/:slug`, `/book-appointment/:doctorId`) exist in `App.tsx` but only as a fallback tree (lines 286–316); production canonical URLs from `getBookingUrl()` point at `https://docito.app/book-appointment/<slug>` with no language prefix, so the fallback tree must work.

**Changes**
1. `src/lib/doctorSlug.ts` — switch slug lookups from `.eq()` to `.ilike()` (case-insensitive exact match) on `custom_profile_link` and `username`. Keep UUID path as `.eq("id", …)`. Try `doctor_public_profile_view` first, then `doctor_profiles_view` as today.
2. `src/pages/doctor/DoctorPublicProfile.tsx` — same `.ilike()` switch in the inline lookup loop. Also normalize the slug (trim, decode `%2E`/dots safely) before querying.
3. Verify both URL families resolve in production by curling `…/rest/v1/doctor_public_profile_view?custom_profile_link=ilike.dr.john.doe1`.
4. Confirm the non-prefixed routes `/doctor/:slug`, `/dr/:slug`, `/book-appointment/:doctorId` are present in the fallback `<Routes>` block (they are — lines 286–316). No App.tsx changes needed.

No DB migration. No new dependency.

---

## Phase 2 — Currency propagation (remaining 80+ files)

`useCurrency()` exists and is wired through `CurrencyContext`. The earlier pass covered ~20 files. A grep finds ~60 more places still using hardcoded `$…toFixed(2)` or `Intl.NumberFormat('en-US',{currency:'USD'})`.

**Strategy** — replace each hardcoded formatter with `useCurrency().format(...)` or `formatCents(...)`. Source currency is preserved per row when the DB stores one (`row.currency`); display currency comes from the context. No conversion — only symbol/locale.

**Files to update** (batched 8–12 per turn):

Batch A — patient & appointment surfaces:
- `src/components/patient/PatientBilling.tsx`, `PatientTreatmentPlanModal.tsx`, `PatientTreatmentPlansSection.tsx`
- `src/components/patient-dashboard/QuickOverviewCards.tsx`, `tabs/HistoryTab.tsx`
- `src/components/appointments/AppointmentProceduresPanel.tsx`, `AppointmentTreatmentPlansSection.tsx`, `DentalProcedurePicker.tsx`
- `src/pages/AppointmentSession.tsx`

Batch B — treatment & procedures:
- `src/components/treatment/TreatmentPlanCard.tsx`, `TreatmentPlanDetailModal.tsx`, `AddProcedureToPlanModal.tsx`
- `src/components/visit/tabs/TreatmentTab.tsx`
- `src/components/consent/ProcedureConsentModal.tsx`, `ConsentSigningModal.tsx`
- `src/components/appointment/ProcedurePrescriptionModal.tsx`, `RealTimeProcedureNotification.tsx`
- `src/pages/TreatmentPlanning.tsx`, `ProcedureLibrary.tsx`

Batch C — clinic / lab / imaging / pharmacy:
- `src/components/clinic/ClinicServicesManager.tsx`
- `src/components/billing/SuperbillsManager.tsx`
- `src/components/admin/ProviderFinancialTab.tsx`
- `src/components/lab/LabAnalytics.tsx`, `TestOrderCreator.tsx`
- `src/components/imaging/ImagingAnalytics.tsx`, `ImagingBillingSection.tsx`
- `src/components/pharmacy/PharmacyDeliveryOrders.tsx`
- `src/hooks/usePharmacyStaffDashboard.ts`

Batch D — admin dashboard finance blocks:
- `src/pages/AdminDashboard.tsx` (lines 3282, 3284, 4275–4277, 4314, 4336, 4922, 4939, 4947, 4955)

Batch E — PDFs (display only, no conversion):
- `src/utils/generateInvoicePdf.ts`, `generateAppointmentPdf.ts` — accept `displayCurrency` parameter, pass `useCurrency().currency` from the caller; format via `formatCents()`/`formatCurrency()` from `@/lib/currency`.

Hooks not allowed in plain `.ts` utilities (`usePharmacyStaffDashboard` is a hook so OK; for `LabAnalytics` keep its inner helper but pass `currency` from props/context).

---

## Phase 3 — i18n sweep across Doctor, Clinic-Admin, Patient dashboards

**Plan**
1. Run a scan (`scripts/phase0-audit.mjs` already exists — extend if needed) that lists every JSX text node and `toast()` string under:
   - `src/components/doctor/**`, `src/pages/Doctor*.tsx`
   - `src/components/clinic/**`, `src/components/admin/**`, `src/pages/AdminDashboard.tsx`
   - `src/components/patient/**`, `src/components/patient-dashboard/**`, `src/pages/Patient*.tsx`
2. Group keys by feature; add missing keys to existing namespaces (`doctor`, `dashboard`, `patients`, `admin`, `finance`, `common`) — create new sub-namespaces only when a namespace exceeds ~300 keys.
3. Translate to all 11 languages (`en, ru, uz, ar, tr, es, de, zh, pt, ja, ko`) using existing translation conventions (don't re-translate brand names).
4. Wire `useTranslation(ns)` + `t("key")` in each component. Toasts use the same hook.
5. Verify with a final scan that no English literal >2 words remains in those trees outside intentional brand/proper-noun strings.

This phase is the largest and will be delivered in several turns (one dashboard tree per turn).

---

## Out of scope

- No DB schema or RLS changes.
- No new edge functions.
- No FX conversion changes (display-only currency stands).
- No design-system, routing, or auth refactors.

---

## Technical notes

- `.ilike(col, value)` in PostgREST: pass the literal slug — no `%` wildcards, exact case-insensitive match. PostgREST encodes dots fine in the value position.
- `useCurrency().format(amount, sourceCurrency?)` is the canonical formatter for major-unit values; `formatCents(cents, sourceCurrency?)` for cent-stored values.
- For PDF generators (non-React), pass `{ displayCurrency, sourceCurrency }` from the caller; never call hooks inside.
- i18n keys follow existing dotted style; reuse `common:buttons.*` and `common:status.*` where possible to avoid duplication.

---

## Execution order

1. Phase 1 (single turn).
2. Phase 2 — batches A–E (≈5 turns).
3. Phase 3 — doctor → clinic-admin → patient (≈3–4 turns).

I will pause after Phase 1 for you to verify the production link before continuing.
