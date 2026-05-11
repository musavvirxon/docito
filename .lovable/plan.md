# Final copy sweep: payments, insurance, coverage, billing

The earlier pass missed several strings on the home page (PremiumHome → `premium.json`) plus a few other surfaces. This pass cleans them up everywhere they still render in the UI.

## Replacement vocabulary (recap)

- "Collect payments / send payment links / card & link payments / online payments" → **Billing documentation** (invoices, receipts, superbills) — patients pay their insurer or provider directly outside the platform.
- "Insurance verification / instant eligibility / coverage checks / pre-authorization / direct claims submission / claims submitted automatically" → **Automatic superbill generation** — Docito generates an itemized superbill instantly after each appointment, ready for the patient to submit to their insurer.
- "Insurance & coverage / Insurance Integration / Works with insurance providers" → **Superbill-ready billing** / **Insurer-ready superbills** (kept neutral and professional; no claim that Docito processes claims).

## Scope

### 1. `public/locales/en/premium.json` (drives the home page)

- `platformPillars.items.insuranceCoverage` → rename to **"Insurer-ready superbills"**, description: "Itemized superbills generated after each visit—ready for patients to submit to their insurer."
- `platformPillars.items.payments` → **"Billing documentation"**, description: "Invoices, receipts, and superbills tracked alongside every appointment."
- `workflows.description` → drop "payments"; use "Scheduling, records, billing documentation, and insights—connected across your entire care journey."
- `workflows.items.payments` → **"Billing documentation"**, description: "Generate invoices, receipts, and superbills—reconciled with each appointment."
  - features → `["Itemized invoices", "Receipts & superbills", "Reconciliation"]`
- `automation.description` → replace "and payments" with "and billing documentation".
- `automation.flow.billing` → title **"Billing documentation connected"**, description: "Invoices, receipts, and superbills—kept in sync with appointments and services."
- `insurance.*` block → reframe as **"Superbill generation"**:
  - `badge` → "Insurer-ready billing"
  - `title` → "Superbills built for every insurer, worldwide"
  - `description` → "Docito generates itemized superbills after every visit—patients submit them to their insurer in any country, in any currency."
  - `steps.selectProvider` → "Capture insurer details" / "Patients add their insurer during booking so it appears on the superbill."
  - `steps.verification` → "Itemized after the visit" / "Procedures, codes, and charges are compiled into a clean superbill automatically."
  - `steps.directBilling` → "Patient submits to insurer" / "The superbill is delivered to the patient, ready to submit for reimbursement."
  - `benefits` → `["Automatic superbill generation", "Itemized procedure codes", "Multi-currency support", "Patient-ready PDFs", "Works with any insurer"]`
- `global.features.multiCurrency.description` → already says "Document billing"; keep.
- Remove stray "payment links" phrasing in `automation.flow.billing` (handled above).

### 2. Other locales (es, de, pt, ru, tr, uz, ar, ja, ko, zh) — `premium.json`

Mirror the same key changes via a small Node script; English fallback used where translation gap is acceptable, then replace the few high-visibility strings with localized equivalents using the same vocabulary already established in the previous rebrand (Billing Documentation / Automatic Superbill Generation / Revenue Tracking & Analytics translations already exist in those locale files for other namespaces and will be reused).

### 3. `public/locales/en/faqs.json`

- `payment.answer` → remove "work with insurance providers"; rephrase as: "We accept major credit/debit cards and HSA/FSA cards for service charges. Itemized superbills are generated automatically so you can submit them to your insurer for reimbursement."
- `insurance.question` → "Can I use my insurance with Docito?"
- `insurance.answer` → "Docito generates an itemized superbill after every appointment that you can submit to your insurer for reimbursement, according to your plan's out-of-network or telemedicine benefits."
- Mirror to all other locales.

### 4. `public/locales/en/practicePage.json`

- `solution.bullets.insuranceVerification` → "Insurer details captured for superbills"
- (already updated `paymentProcessing` → "Billing documentation") — verify no stragglers.
- Mirror to all locales.

### 5. `public/locales/en/doctorPage.json`

- `pain.painPoints.slowBilling.description` (and any sibling keys still referencing manual claims/payment collection) → reframe around "manual invoicing and superbill paperwork".
- Mirror to all locales.

### 6. `src/components/home/TrustIndicators.tsx`

- `"Insurance Supported"` / `"Works with major insurance providers"` → **"Superbill-Ready Billing"** / **"Itemized superbills generated for every visit, ready to submit to any insurer."**

### 7. `src/components/InsuranceSection.tsx` (legacy hardcoded section)

Quick check: confirm whether it's still mounted anywhere. If still rendered, rewrite headline/CTA:
- Heading → "Superbills accepted by every major insurer"
- Sub → "Add your insurer so it appears on your superbill"
- CTA → "Add your insurer details"

If it isn't mounted on any live route, leave it untouched (out of scope for a copy sweep) and note it in the closing message.

### 8. Out of scope (intentionally untouched)

- `accepts_insurance` boolean fields on `labs`/`pharmacies` data and the `"Insurance" / "No insurance"` chips in `TopLabs.tsx` / `NearbyPharmacies.tsx` — these reflect whether the facility accepts insurance for direct billing in their own systems, which is factual provider metadata, not a claim about Docito processing payments. Confirm with user before changing if desired.
- Search filter input labelled "Insurance" in `SmartSearch.tsx` / `ProminentSearchBar.tsx` — this is a search facet for finding in-network providers; it does not imply Docito processes insurance.
- `pharmacy.json`, `legal.json`, `dashboard.json` operational copy — already covered in earlier pass; spot-check only.
- Patient-side stored insurance metadata, blog posts, DB tables, edge functions.

## Verification

After edits:
1. `rg -n -i "collect payment|payment link|claim|insurance verification|coverage check|direct billing|eligibility check" public/locales/ src/components/home src/pages/Index.tsx src/pages/PremiumHome.tsx` → must return no UI hits.
2. Reload `/` in preview, scroll through every section (hero → platform pillars → workflows → automation → insurance → global → FAQ → footer) and confirm the new copy renders cleanly and the section formerly titled "Insurance & Coverage" now reads as superbill-focused.
3. Spot-check one non-English locale (e.g. `es`) on the same page to confirm translations updated.
