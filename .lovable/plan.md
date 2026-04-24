## Goal

Add a client-side generator for the official Uzbekistan stomatology medical card (Form 043/u) in both Russian and Uzbek as downloadable `.pdf` files, exposed via a download button that only appears for Uzbekistan-based clinics.

## 1. Dependency

- Add `docx` (`^9.0.0`) to `package.json`. Pure client-side — no edge function, no DB, no server calls.

## 2. New file: `src/utils/generateMedicalCard043u.ts`

Exports:

- `MedicalCardData` interface (patient, appointment, clinic fields).
- `generateMedicalCard043uRussian(data) → Promise<Blob>`
- `generateMedicalCard043uUzbek(data) → Promise<Blob>`

Internal helpers (Times New Roman, A4, 0.5″ margins):

- `t()`, `p()`, `centerP()` text/paragraph builders.
- `linesTable(n)` — bordered fill-in lines.
- `toothChart()` — 4-row, 17-column dental chart (Yuqori/Quyi rows with thick midline border between teeth 1-1).
- `visitTable()` — treatment diary table (Date / Tooth / Diagnosis / Signature).

Document layout (3 pages, identical structure RU and UZ, only labels differ):

1. Page 1: Ministry header → clinic name/address → title → patient info box → diagnosis → complaints → past illnesses → development → external exam → oral exam legend → tooth chart → bite → mucosa → x-ray.
2. Page 2: Treatment plan + visit diary table.
3. Page 3: Continuation diary + epicrisis + treating doctor signature + footer.

Use the exact templates from the user spec. Cast `height.rule: 'exact'/'atLeast'` as `any` (known docx-js typing issue).

## 3. New file: `src/components/MedicalCardDownloadButton.tsx`

Props: `{ data: MedicalCardData, practice, locations }`.

Logic:

- `isUzbekistanClinic(practice, locations)` checks `practice.country`, `practice.address`, `practice.phone` (`+998` prefix), and every `locations[*].address/country/city` against an Uzbek keyword list (uzbekistan, o'zbekiston, tashkent, samarkand, bukhara, namangan, andijan, fergana, nukus, qarshi, termiz, etc.).
- Returns `null` when not Uzbekistan — no UI for non-UZ clinics.
- Renders a primary button with a chevron that toggles a custom dropdown (no Popover dep) with two options: 🇺🇿 O'zbek tilida and 🇷🇺 На русском языке.
- On click: calls the matching generator, creates an object URL, downloads as `043u_{patientName}_{RU|UZ}.docx`, shows a localized sonner toast, revokes URL.
- Backdrop overlay closes the dropdown on outside click.
- Uses existing `Button`, `lucide-react` icons (`FileText`, `Loader2`, `ChevronDown`), and `sonner` toast — all already in the project.

## 4. Wire into `src/pages/AdminDashboard.tsx`

Import `MedicalCardDownloadButton` once at the top.

Mount in three places (button hidden automatically for non-UZ clinics):

a. **Providers → Provider Profile → Calendar tab**, end of each upcoming appointment row. Data uses `appt.patient_name`, `appt.appointment_date`, `appt.diagnosis || appt.service_name`, `selectedProvider?.name`, `practice?.name`, `practice?.address || locations[0]?.address`.

b. **Patients → Patient Profile → Appointments tab**, end of each appointment row. Data pulls richer patient fields from `selectedPatient` (`gender`, `age`, `date_of_birth`, `phone`, `profession`, `address`).

c. **Billing → Invoices tab** action column, alongside View/Send. Data pulls from `tx.metadata` (`patient_name`, `service_name`, `doctor_name`) and `tx.created_at`.

I will locate each exact insertion point in `AdminDashboard.tsx` by searching for the existing render blocks (calendar appointment row, patient appointments tab, invoices action column) and append the button without altering surrounding structure.

## 5. No changes to

- Hooks, contexts, Supabase schema, edge functions, RLS, i18n namespaces (button labels are bilingual literals — Russian/Uzbek — by design).
- `useAdminDashboard` already exposes `practice`, `locations`, `appointments`, `patients`, `doctors`.

## Files

**Created**

- `src/utils/generateMedicalCard043u.ts`
- `src/components/MedicalCardDownloadButton.tsx`

**Edited**

- `package.json` (+ `docx` dep)
- `src/pages/AdminDashboard.tsx` (import + 3 button mounts)

## Notes / Risks

- `docx` v9 adds ~200KB gzip to the bundle. Acceptable since AdminDashboard is already a heavy admin route; can be code-split later if needed.
- The Uzbekistan keyword check is intentionally permissive (substring match, case-insensitive). False positives (e.g., a clinic literally named "Tashkent" abroad) are highly unlikely; the +998 phone prefix is the strongest signal.
- Generator is fully synchronous in build; `Packer.toBlob` is async. Loading state shown on the button during generation.
- No translations added: the dropdown items, button label "043/u Tibbiy karta", and toasts are bilingual fixed strings — appropriate because the feature is Uzbekistan-only and serves staff who read RU/UZ.