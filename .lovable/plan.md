## Goal

Add an FDI tooth chart to the treatment plan view, visible only for dental doctors/clinics. Non-dental specialties see today's UI unchanged.

## What already exists (verified)

- `src/lib/clinicalSpecialties.ts` → `isDentalSpecialty(specialty)`, already used in `EnhancedCreateTreatmentPlanModal`, `AppointmentSession`, `VisitPage`, etc. Reuse it — no new field needed.
- `treatment_plan_procedures.tooth_numbers` is already `number[] | null` in the database — the line-item field the request asks for already exists.
- FDI numbering already defined in `src/components/dental/types.ts` (`PERMANENT_TEETH`, `PRIMARY_TEETH`) and matches the tables in the request exactly.
- `treatment_plans` has **no** `dentition_type` column — this must be added.
- Doctor view: `src/components/treatment/EnhancedTreatmentPlanDetailModal.tsx` (procedures tab, table of line items). Patient view: `src/components/patient/PatientTreatmentPlanModal.tsx`.
- Existing status badge colors in the plan use gray / blue / orange / green / yellow / red (`getStatusColor`), so the legend must avoid those hues.

## Plan

**1. Database (one migration)**
- Add `dentition_type text` to `public.treatment_plans`, default `'permanent'`, with a validation trigger or `CHECK` limiting values to `permanent` / `primary` (nullable-friendly, back-compatible).
- No change needed to `tooth_numbers`; keep the existing array field as the per-line-item tooth assignment.

**2. New component `src/components/dental/TreatmentPlanToothChart.tsx`**
- Rounded/oval framed container; two rows of number-only chips (upper / lower), midline gap splitting quadrants, chips arranged along a gentle arch via a per-chip vertical offset (pure CSS translate, no SVG paths) — degrades to a clean two-row grid on narrow screens.
- Renders **only** the dentition selected on the plan; never both.
- Chip states: neutral (unassigned) vs filled with a category color when one or more plan line items include that tooth number. Multi-assignment shows a small count badge.
- Clicking a chip opens a `Popover` listing that plan's procedure line items with checkboxes to assign/unassign the tooth, plus a status `Select` reusing the existing procedure status values (`planned` / `in_progress` / `completed`, same set used in the plan today).
- Read-only mode prop for the patient view.

**3. Dentition selector**
- Segmented control (Permanent / Primary) above the chart, written back to `treatment_plans.dentition_type`.
- Default derived from patient DOB: under ~6 → primary, 13+ → permanent, in between → whatever is stored or permanent; always manually overridable.

**4. Legend + synced table**
- 6 categories mapped from `procedures.category` (restorative / extraction / endodontic / prosthetic / preventive / orthodontic) with a fallback "other".
- Colors added as new semantic tokens in `src/index.css` (teal, violet, cyan, fuchsia, lime, sky-deep family) so they don't collide with the existing status green/orange/red/blue/gray.
- Below the chart: a `Tooth # | Procedure(s) | Status` table sorted by tooth number, derived from the same `procedures` state so it updates instantly with the chart.
- Empty state: all neutral + hint "Click a tooth to assign a procedure."

**5. Wire into the views**
- In `EnhancedTreatmentPlanDetailModal.tsx`: render the chart block at the top of the Procedures tab, gated by `isDentalSpecialty(profile?.specialty)` (same call pattern as `EnhancedCreateTreatmentPlanModal`). Assignments write `tooth_numbers` / `status` on `treatment_plan_procedures` and refresh local state so the existing cost table (`unit × teeth count`) stays correct.
- In `PatientTreatmentPlanModal.tsx`: same chart, read-only, gated by the plan's doctor specialty.

**6. i18n**
- New keys under the existing `dashboard` namespace (`treatment.toothChart.*`) in `public/locales/en|ru|uz/dashboard.json`: dentition labels, legend category names, popover labels, statuses, empty-state hint, table headers. No hardcoded strings.

**7. PDF**
- Extend `supabase/functions/treatment-plan-generate-pdf` to render the synced tooth table (Tooth # / Procedure / Status) when the plan is dental and has tooth assignments. Table form, not an image snapshot — reliable and printable. (The separate PDF download fix is not part of this plan.)

## Notes

- Mixed dentition explicitly out of scope.
- Tooth number sets come from the existing `PERMANENT_TEETH` / `PRIMARY_TEETH` constants, so numbering matches the request tables exactly and stays consistent with the rest of the app.
