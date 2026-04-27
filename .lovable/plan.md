## Problem analysis

Two issues to fix:

### 1. Summary PDF download fails

Network logs show the **bold** Noto Sans TTF returns **404** from `fonts.gstatic.com`:

```
GET …/o-0NIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjA-BFlVfE5Mh8nqKn7BqHe.ttf  →  404
```

`ensureUnicodeFont()` in `src/utils/pdfUnicodeFont.ts` throws on the failed fetch, the outer `try/catch` shows `toast.error('Failed to generate PDF')`, and no PDF is produced. The regular weight URL also returns truncated/garbled bytes that won't always parse cleanly.

The gstatic URLs are not stable — Google rotates the hashed paths. We need a versioned, reliable mirror.

### 2. Dental tab needs procedure selection alongside the chart

Right now `TabsContent value="dental"` shows:
- A read-only "Dental Procedures (This Appointment)" list (legacy)
- The editable `EnhancedDentalChart`

But it does **not** include the new `AppointmentProceduresPanel` (with "Add Procedure" modal that has tooth selection). The user wants procedure selection paired with the chart inside the dental tab.

There is also a noisy console warning: `ProcedureModal` (from `EnhancedDentalChart`) is a function component being given a `ref`. Easy fix.

---

## Fix plan

### Fix A — Reliable Unicode font URLs
In `src/utils/pdfUnicodeFont.ts`:
- Replace the two `gstatic.com` URLs with the **notofonts.github.io** TTFs hosted on jsDelivr (verified 200 OK + CORS + full Latin/Cyrillic/Cyrillic-ext coverage including `ў` and `'`).
- Keep a `raw.githubusercontent.com` fallback for the rare jsDelivr outage.
- `loadFonts()` tries each URL in order; first success wins.
- If both fail, log a clear error and proceed with jsPDF's built-in `helvetica` so the PDF still downloads (Latin only, but better than no file).

### Fix B — Add procedure selection to the dental tab
In `src/pages/AppointmentSession.tsx`, inside the `dental` tab:
- Mount `<AppointmentProceduresPanel ... isDentist />` above the `EnhancedDentalChart`. This brings in the "Add Procedure" button + modal that already supports tooth selection (FDI picker) and persists to `tooth_procedure_history`.
- Keep the existing read-only "Dental Procedures (This Appointment)" card below the chart for the historical feed.
- Reorder so the new panel is the **primary** action area at the top.

### Fix C — Silence the ProcedureModal ref warning
`src/components/dental/ProcedureModal.tsx` is wrapped by Radix Dialog which forwards a ref. Wrap the component declaration in `React.forwardRef<HTMLDivElement, Props>(...)` (or, simpler, ensure the modal does not accept a `ref` prop by name — typically just removing whatever forwarder is calling it). Quick fix: convert the function component to `forwardRef` and forward the ref to the outer wrapper.

### QA
- Click "043/у RU" and "043/u UZ" in the appointment session header → both download a PDF.
- Inspect first page: Cyrillic and Uzbek text legible, no black squares.
- Dental tab → "Add Procedure" → tooth selector appears → pick teeth → save → row appears in both the panel and the read-only list and is shaded on the chart.
- React DevTools console: no more `ProcedureModal` ref warning.

## Files

**Edited**
- `src/utils/pdfUnicodeFont.ts` — switch font URLs to jsDelivr `notofonts.github.io` TTFs with retry + graceful fallback
- `src/pages/AppointmentSession.tsx` — add `AppointmentProceduresPanel` to the dental tab, above the chart
- `src/components/dental/ProcedureModal.tsx` — `forwardRef` to silence Radix warning

No DB migrations, no new packages.
