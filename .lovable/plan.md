## Goal

Replace marketing/UI copy that promises **"automatic insurance claim submission"** or **"in-platform payment processing"** with three new positionings, in every language:

| Old positioning | New positioning |
|---|---|
| "Automatic insurance claims" / "insurance claim submission" / "process insurance claims" | **Automatic superbill generation** — generated instantly after every appointment, ready for the patient to submit to their insurer |
| "In-platform payments" / "pay through the platform" / "accept online payments" (when describing earnings, charges, transactions) | **Billing documentation** |
| "In-platform payments" (when describing dashboard revenue, outstanding balances, payment history) | **Revenue tracking & analytics** |

Tone stays professional and medical.

## Scope

### In scope
- All UI strings, labels, dashboard sections, onboarding text, marketing copy
- All 11 language locale files (`en, es, de, pt, ru, tr, uz, ar, ja, ko, zh`) for the affected keys
- Hardcoded English strings in components

### Out of scope (intentionally untouched)
- Patient-side **insurance information storage** (patients listing their insurer, providers listing accepted plans) — this is metadata, not a "we submit your claim" promise. Legal page (`legal.json`) already correctly disclaims this and is left as-is.
- Educational blog posts in `src/content/blog/posts/**` that discuss claim submission as general industry knowledge (not as a Docito feature).
- Database tables, RPC functions, edge functions — only UI copy changes.
- Stripe Connect functionality where it exists for facility-paid subscriptions to Docito itself (this is platform billing of facilities, not patient↔provider payments).

## Files to update

### 1. Hardcoded component copy
- `src/pages/Doctors.tsx` (line 43) — replace "Accept payments securely…" feature card with **Billing documentation** copy.
- `src/pages/Index.tsx`, `src/pages/PremiumHome.tsx`, `src/components/HeroSection.tsx`, `src/components/FeaturesSection.tsx`, `src/components/InsuranceSection.tsx` — sweep for any remaining hardcoded "insurance claim" / "in-platform payment" / "accept payments" marketing strings and rebrand.
- `src/pages/AdminDashboard.tsx` (lines ~3899-4059) — rename the **"Insurance Claims"** admin tab to **"Billing Documentation"**; relabel "Submit Claim" → "Generate Superbill"; "No insurance claims yet" → "No superbills generated yet". The underlying data structure stays; only labels change.
- `src/components/pharmacy/PharmacyInsuranceClaims.tsx` — rename header "Billing & Insurance Claims" → "Billing Documentation"; "Submit Claim" button → "Generate Superbill"; subtitle and column copy rebranded. Component file name kept to avoid churn; only visible strings change.
- `src/components/insurance/AdminInsuranceApproval.tsx` — copy review (the underlying RPC `process_insurance_request` is admin tooling for *patient insurance records*, not claim submission, so it stays — only verify no misleading user-facing copy).

### 2. English locale keys to rewrite
- `public/locales/en/features.json` → `billing.description`, `billing.benefit1`, `billing.benefit2`
- `public/locales/en/practicePage.json` → `billingPayments.description`, `solution.bullets.paymentProcessing`
- `public/locales/en/imagingPage.json` → `services.payments.*`, `howItWorks.steps.step5.description`
- `public/locales/en/pharmacyPage.json` → `services.payments.*`, `howItWorks.steps.step5.description`
- `public/locales/en/doctorPage.json` → `slowBilling.*`
- `public/locales/en/premium.json` → `multiCurrency.description`
- `public/locales/en/pharmacyAdminDashboard.json` → `billing.title`, `billing.subtitle`, `billing.metrics.*`
- `public/locales/en/admin.json` → keys 465-495 (`insuranceClaims`, `submitClaim`, `newClaim`, `claimsTitle`, `claimSubmitted`, `noClaimsYet`, `claimsByStatus`, `claimsByInsurer`, `claimFieldsRequired`, etc.) become superbill / billing-documentation language. `acceptedInsurers` and `addInsurer*` (provider-side accepted plans metadata) stay.

### 3. Mirror the same key changes in the 10 other locales
For each updated EN key, write the translated equivalent in: `es, de, pt, ru, tr, uz, ar, ja, ko, zh`. Same JSON structure; values translated using the new positioning vocabulary.

## Replacement vocabulary (per language)

| Lang | Superbill generation | Billing documentation | Revenue tracking & analytics |
|---|---|---|---|
| en | Automatic superbill generation | Billing documentation | Revenue tracking & analytics |
| es | Generación automática de superfacturas | Documentación de facturación | Seguimiento de ingresos y analítica |
| de | Automatische Superbill-Erstellung | Abrechnungsdokumentation | Umsatz-Tracking & Analytik |
| pt | Geração automática de superbills | Documentação de cobrança | Monitorização de receitas e análise |
| ru | Автоматическое создание суперсчетов | Документация по биллингу | Отслеживание доходов и аналитика |
| tr | Otomatik superbill oluşturma | Faturalama dokümantasyonu | Gelir takibi ve analitik |
| uz | Avtomatik superbill yaratish | Hisob-kitob hujjatlari | Daromadni kuzatish va analitika |
| ar | إنشاء فواتير سوبر تلقائي | توثيق الفواتير | تتبع الإيرادات والتحليلات |
| ja | スーパービル自動生成 | 請求ドキュメント | 収益トラッキングと分析 |
| ko | 슈퍼빌 자동 생성 | 청구 문서화 | 수익 추적 및 분석 |
| zh | 自动生成超级账单 | 账单文档 | 收入跟踪与分析 |

A short footnote sentence ("generated instantly after every appointment, ready for the patient to submit to their insurer") is added to the long-form descriptions where the current copy is descriptive (features.json, practicePage.json, imaging/pharmacy pages).

## Verification

1. After edits, re-run `rg -ni "insurance claim|in[- ]platform payment|process.{0,15}insurance|pay through" src public/locales` and confirm zero remaining hits in UI/locale copy (blog posts excluded).
2. Open Doctor landing page, Practice page, Imaging page, Pharmacy page, Admin → Billing tab, Pharmacy Admin → Billing tab in preview; spot-check the new copy renders and switching language to ES + AR shows the translated strings.
3. Build runs clean.

## Out-of-scope follow-ups (flagged, not done)

- Renaming the file `PharmacyInsuranceClaims.tsx` and the route `AdminInsuranceManagement.tsx` for code-level consistency. These can be renamed in a second pass if desired; UI copy is what users see.
- Removing the `process_insurance_request` admin RPC if you decide insurance-record approval is no longer a workflow you want.
