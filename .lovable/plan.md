

## Goal

1. Add a **patient import** feature on the **Clinic Admin Patients section** (matches the existing doctor-side `ExcelPatientImport`).
2. Build a reusable `<ImportPatientsDialog>` that any future patient-list (staff, hospital admin) can drop in.
3. Make sure **all dialogs I build are in-app** (shadcn `Dialog`/`AlertDialog`) — never `window.prompt`/`window.confirm`/`window.alert`.

## Findings

- **Doctor side already has it**: `src/components/doctor/patients/ExcelPatientImport.tsx` (xlsx + CSV, validation preview, downloadable template, structure shown in dialog). It inserts into `doctor_patients` with `doctor_id`.
- **Clinic admin side missing**: `AdminDashboard.tsx` `case "patients"` toolbar (line ~2988) only has Export, no Add/Import.
- **DB constraint**: `doctor_patients.doctor_id` is `NOT NULL` and references `doctors(id)`. So an admin import must select **which doctor** the rows are assigned to (each row, or one for the whole batch). Simplest UX: a "Default provider" picker in the dialog, with optional per-row `doctor_email` override.
- **Browser popups in scope I built recently**: I haven't shipped any `prompt`/`confirm` in my recent features. The new import will use only shadcn dialogs. (The 50+ legacy `prompt()`/`confirm()` calls in `AdminDashboard.tsx` are pre-existing — I'll flag but not refactor unless asked, since that's a separate large sweep.)

## Plan

### 1. Create `src/components/admin/patients/AdminImportPatientsDialog.tsx`
Adapted from `ExcelPatientImport` with these changes:
- Accepts `practiceId` and `doctors` (list) as props.
- Adds a **Default Provider select** (required) — assigns all imported rows to that doctor.
- Supports an optional `doctor_email` column in the file to override per-row (matched to the doctors list; falls back to default if blank/unknown).
- Template download includes `doctor_email` as an optional column with a comment row explaining usage.
- Insert payload includes `doctor_id` resolved per row, plus `practice_id` if present on the row schema (we'll set it best-effort via `(supabase as any)`).
- Localized via `useTranslation('patients')` namespace; English keys with sensible fallbacks.

Dialog sections (all in-app, no browser popups):
1. **Upload step** — Required/Optional column legend, "Download Template" button, file dropzone.
2. **Preview step** — Row-level validation table (valid/invalid badge + errors).
3. **Complete step** — Success summary + Close.

### 2. Wire into `AdminDashboard.tsx` patients toolbar
- Add state `[importPatientsOpen, setImportPatientsOpen]`.
- Add **Import Patients** button next to Export (line ~2988 region), gated by `allowModals` and `practice?.id`.
- Render `<AdminImportPatientsDialog>` near other modals (around line 6307), pass `practiceId={practice?.id}`, `doctors={doctors}`, `onSuccess={refreshData}`.

### 3. i18n keys
Add to `public/locales/{en,es,ar,de,ja,ko,pt,ru,tr,uz,zh}/patients.json` under a new `import.*` group:
- `import.title`, `import.description`, `import.requiredColumns`, `import.optionalColumns`, `import.downloadTemplate`, `import.uploadHint`, `import.defaultProvider`, `import.preview.valid/invalid`, `import.actions.back/import/close`, `import.errors.*`, `import.success`.

### 4. Confirm "no browser popups" rule for new dialogs
- Use only `Dialog`, `AlertDialog`, `Sheet` from `@/components/ui/*`.
- No `window.prompt`, `window.confirm`, `window.alert` in the new component.

## Files

- **New**: `src/components/admin/patients/AdminImportPatientsDialog.tsx`
- **Edit**: `src/pages/AdminDashboard.tsx` (toolbar + modal mount)
- **Edit**: 11 × `public/locales/<lang>/patients.json` (add `import` block; English source, others with fallbacks)

## One question

The legacy AdminDashboard has ~50 `prompt()`/`confirm()` calls (provider edits, finance rules, blocking patients, archiving services, etc.). Refactoring all of them to in-app dialogs is a large, separate effort. Should I:
- **(a)** Only ensure new code uses in-app dialogs (this plan), or
- **(b)** Also refactor the legacy `prompt`/`confirm` in the patients section specifically (Edit phone / Edit email / Block / Insurance / Edit medical info), or
- **(c)** Sweep the entire AdminDashboard? (much larger change)

I'll proceed with **(a)** unless you pick (b) or (c).
