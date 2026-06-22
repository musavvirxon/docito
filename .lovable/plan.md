## Goal

Fix two PDF errors, display the full doctor profile URL, and let doctors save prescription templates and reuse them for any patient.

---

## 1. Treatment plan & referral PDF errors

**Diagnosis**
- Both edge functions (`treatment-plan-generate-pdf` 2.3k LOC, `referral-generate-pdf` 1.5k LOC) import `pdf-lib`, `@pdf-lib/fontkit`, `qrcode`, `arabic-reshaper`, `bidi-js` from `esm.sh`, then `embedFont(...{subset:true})` against a base64 TTF re-exported from another function's `assets.ts`.
- Logs are empty — the function is crashing during boot or before `console.log`, which matches an `esm.sh` resolution / fontkit subset failure (the same class of issue called out in the edge-function-deploy-errors and lovable-stack-overflow context).
- Treatment plan still returns "Failed to download PDF" (generic) and referral now returns `500 {"error":"Failed to generate PDF"}` — both consistent with the outer `try/catch` swallowing the real error.

**Fix**
1. In both functions:
   - Replace floating `esm.sh` specifiers with `npm:` specifiers (`npm:pdf-lib@1.17.1`, `npm:@pdf-lib/fontkit@1.1.1`, `npm:qrcode@1.5.3`). Drop optional `arabic-reshaper` / `bidi-js` dynamic imports — Arabic falls back to transliteration through the existing `sanitizeForPdf` path.
   - Stop embedding the custom TTF. Use `StandardFonts.Helvetica` / `HelveticaBold` only and rely on `sanitizeForPdf` (already present in treatment-plan; port the same helper into referral) to transliterate Turkish/Polish/Cyrillic etc. and replace remaining non-WinAnsi codepoints with `?`. This removes the fontkit subset crash and shrinks cold-start.
   - Wrap the handler body so the catch logs `err?.stack ?? String(err)` to `console.error` and returns the message in the JSON body (only the message, not the stack) so future failures are visible in logs.
2. Delete any `supabase/functions/*/deno.lock` for these two functions if present (per edge-function-deploy-errors guidance).
3. Keep `verify_jwt = false` entries already in `supabase/config.toml`.

This is a targeted reliability fix — no change to the request/response contract, so the existing client `downloadTreatmentPlanPdf` / `downloadReferralPdf` continue to work.

---

## 2. Profile section — full profile URL

In `src/components/doctor/DoctorProfileSection.tsx` `publicUrl` is `/doctor/${slug}` (path only). Change it to an absolute URL using the canonical origin:

```ts
const ORIGIN = typeof window !== "undefined"
  ? window.location.origin
  : "https://docito.live";
const publicUrl = publicSlug ? `${ORIGIN}/doctor/${publicSlug}` : "";
```

This updates the three render sites (lines 426, 451, 464) and the existing copy-link affordance so users see and copy a full `https://…/doctor/<slug>` URL. Booking link already uses `getBookingUrl` (absolute) — no change.

---

## 3. Reusable prescription templates

**Schema** (migration)

```sql
CREATE TABLE public.prescription_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  notes text,
  refills integer NOT NULL DEFAULT 0,
  medications jsonb NOT NULL DEFAULT '[]'::jsonb,  -- array of {name, code, dosage, frequency, quantity, unit, instructions, allow_substitutions}
  is_shared boolean NOT NULL DEFAULT false,         -- shareable to other doctors in same practice
  practice_id uuid REFERENCES public.practices(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescription_templates TO authenticated;
GRANT ALL ON public.prescription_templates TO service_role;

ALTER TABLE public.prescription_templates ENABLE ROW LEVEL SECURITY;

-- Owner full access
CREATE POLICY "doctor_owns_template" ON public.prescription_templates
  FOR ALL TO authenticated
  USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()))
  WITH CHECK (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

-- Shared templates readable by other doctors in same practice
CREATE POLICY "shared_template_practice_read" ON public.prescription_templates
  FOR SELECT TO authenticated
  USING (
    is_shared
    AND practice_id IS NOT NULL
    AND practice_id IN (SELECT practice_id FROM public.doctors WHERE user_id = auth.uid())
  );
```

(The "given to other patients" requirement is naturally satisfied: templates are not bound to a patient — the doctor picks a template and applies it to whichever patient they are prescribing for. The `is_shared` flag also enables sharing across colleagues in the same practice.)

**UI changes in `src/components/prescriptions/PrescriptionCreator.tsx`**
- Add a "Templates" row at the top of the creator with two controls:
  - `Select` listing the doctor's templates (own + shared in practice) → fills medications/refills/notes when chosen.
  - `Save as template…` button → opens a small dialog with `name`, optional `description`, and an `is_shared` toggle, then inserts a row from the current creator state.
- Add a delete (trash) icon next to each template in the select dropdown's expanded list view (owner-only).

**Hook** `src/hooks/usePrescriptionTemplates.ts`
- `listTemplates(doctorId, practiceId)` — `select * where doctor_id = me or (is_shared and practice_id = mine)`.
- `saveTemplate(input)` — insert.
- `deleteTemplate(id)` — delete (RLS enforces ownership).
- `applyTemplate(template)` — pure helper returning the creator's state shape.

**i18n**
Add `creator.templates.*` keys (label, save, saved, apply, shared, delete, deleteConfirm) to `public/locales/en/prescriptions.json`. Other locales fall back to English via i18next.

---

## Files touched

- `supabase/functions/treatment-plan-generate-pdf/index.ts` — switch to `npm:` imports, drop custom font, add error logging.
- `supabase/functions/referral-generate-pdf/index.ts` — same as above + port `sanitizeForPdf`.
- `src/components/doctor/DoctorProfileSection.tsx` — absolute `publicUrl`.
- New migration for `prescription_templates`.
- New `src/hooks/usePrescriptionTemplates.ts`.
- `src/components/prescriptions/PrescriptionCreator.tsx` — templates UI.
- `public/locales/en/prescriptions.json` — new keys.

## Out of scope

- No changes to patient lookup, signup, feedback routing, or other previously-fixed areas.
- No new shared-across-the-platform template marketplace — sharing is limited to the doctor's own practice via `is_shared`.
