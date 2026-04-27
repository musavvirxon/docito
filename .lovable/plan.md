## Problem analysis

There are **two** 043/u PDF generators in the project:

1. `src/utils/generateMedicalCard043u.ts` — used by **MedicalCardDownloadButton** in AdminDashboard. This one already loads a Unicode TTF (Noto Sans) and renders Cyrillic/Uzbek correctly, but the dental chart is **always blank** (no diagnoses/teeth filled in).
2. `src/utils/generateAppointmentPdf.ts` — used by the **"Summary PDF" button** in `AppointmentSession.tsx` (line 806). This is the one the user is downloading.

### Why the appointment Summary PDF shows "unreadable signs"

`generateAppointmentPdf.ts` calls `doc.setFont('helvetica', …)` everywhere and writes Russian + Uzbek labels (`Министерство…`, `O'zbekiston…`, `Ҳҳ`, `ёЁ`, `'`). jsPDF's built-in Helvetica is **WinAnsi/Latin-1 only** — every Cyrillic character and every smart-quote/apostrophe is replaced by a placeholder rectangle ("ununderstandable signs"). That's the entire root cause of the gibberish.

### Why the dental chart is empty

Both generators draw an **empty** 32-cell tooth grid. None of them pull diagnoses from `tooth_procedure_history` / `appointment_procedures`, so even when the doctor has marked teeth in the session, nothing shows up on the printed chart.

Additionally, the AppointmentSession button passes mostly empty strings (`clinicName: ''`, `doctorName: ''`, `diagnosis: ''`) — it doesn't fetch the real clinic/doctor/diagnosis/finance data before generating.

---

## Fix plan

### 1. Add Unicode font support to `generateAppointmentPdf.ts`
Reuse the same Noto Sans TTF loader pattern that already works in `generateMedicalCard043u.ts`:
- Extract the font-loading code into a shared helper `src/utils/pdfUnicodeFont.ts` (export `ensureUnicodeFont(doc)`, cache the base64 across calls).
- Update `generateMedicalCard043u.ts` to import from the shared helper.
- In `generateAppointmentPdf.ts`: convert the function to `async`, call `await ensureUnicodeFont(doc)` once, and replace every `doc.setFont('helvetica', …)` with `doc.setFont('NotoSans', …)`.

### 2. Render the actual dental chart with diagnoses
Add a new param `toothFindings?: Array<{ tooth: number; code: string; label?: string }>` to both generators.

In the `drawToothChart` routines:
- Map FDI tooth numbers (11–18, 21–28, 31–38, 41–48) to the correct cell on the chart.
- Inside each cell, stamp the short condition code (С, П, К, Pt, Имп, etc.) using the legend already printed above the chart.
- Draw a small dot/diagonal stroke for "missing" (О / Y).
- Tooltip the long diagnosis as a numbered footnote under the chart so dentists see the full text.

### 3. Wire real data into the AppointmentSession Summary button
In `src/pages/AppointmentSession.tsx`:
- Pull the existing `useAppointmentProcedures({ appointmentId })` data (already loaded for the Procedures tab).
- Pull `practice` info via existing context (clinicName, clinicAddress).
- Pull doctor name/specialty from the session's doctor profile.
- Pull diagnosis text from the appointment record (`appointment.diagnosis` / chief complaint).
- Pull finance totals from `useAppointmentFinance` (already imported elsewhere).
- Map procedures → `toothFindings` using a tiny dictionary:
  - `caries` → `С` / `K`
  - `filling` → `П` / `Pl`
  - `crown` → `К` / `T`
  - `extraction` → `О` / `Y`
  - `implant` → `Имп`
  - `root_canal` → `Р` / `P`
  - default → first letter of procedure name.

### 4. Language picker
Replace the hard-coded `'ru'` argument in the Summary button with a small dropdown (RU / UZ) — same pattern as `MedicalCardDownloadButton`.

### 5. QA checklist
- Generate RU and UZ PDFs from a real appointment with at least 3 marked teeth.
- Convert pages to images and inspect: no black squares, all Cyrillic/Uzbek text legible, tooth codes appear in the correct cells, finance totals filled in, doctor + clinic + diagnosis present.

## Files

**Created**
- `src/utils/pdfUnicodeFont.ts` — shared Noto Sans loader

**Edited**
- `src/utils/generateAppointmentPdf.ts` — async + Unicode font + chart rendering + new `toothFindings` param
- `src/utils/generateMedicalCard043u.ts` — use shared loader + render `toothFindings`
- `src/pages/AppointmentSession.tsx` — pass real clinic/doctor/diagnosis/finance/procedures data; add RU/UZ picker

No DB migrations, no new packages.
