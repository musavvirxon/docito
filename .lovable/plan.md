

# Fix Plan: Diagnoses UI, PDF, Dental Chart, Calendar, Messages, and Referrals

## Issues Identified

1. **Diagnoses not visible after adding** — `fetchDiagnoses` maps all diagnoses with hardcoded `type: 'primary'`. The `appointment_diagnoses` table has no `diagnosis_type` column, so the user-selected type (primary/secondary) is lost on re-fetch. Also, the `ALL` RLS policy for doctors has no `WITH CHECK`, which should default to `USING` but may cause INSERT to succeed while SELECT fails in some edge cases.

2. **PDF download fails** — Edge function logs show `WinAnsi cannot encode "→" (0x2192)`. The `→` character is used in medication date ranges (`startDate → endDate`). Standard PDF fonts (Helvetica) can't encode Unicode arrows.

3. **No dental chart in treatment plan modal** — `EnhancedCreateTreatmentPlanModal` uses a simple `ToothSelector` grid component, not the `EnhancedDentalChart`. User wants the richer dental chart.

4. **Patient-booked appointments not in doctor calendar** — The calendar query joins `profiles:patient_id(full_name, avatar_url, phone, email)`. The `profiles` RLS only allows viewing own profile, doctor-patient pairs, or staff-patient pairs. If the patient booked but hasn't had a recent appointment with this doctor (checked by `doctor_can_view_patient_profile`), the join fails and may cause the entire row to be excluded or return null patient data. The `!inner`-style join isn't used, so it should still return rows with null profiles. However, the issue might be that the query error cascades. Need to add a fallback using `doctor_profiles_view` pattern or fix the profiles RLS to allow doctors to see profiles of patients who have appointments with them.

5. **"Failed to load messages"** — The `useMessaging` hook joins `conversation_participants!inner` with `profiles:user_id`. The `conversation_participants` SELECT policy only allows `user_id = auth.uid()`, so the inner join only returns the current user's participant row, hiding other participants. The subsequent `profiles` lookup for sender IDs may also fail if RLS blocks viewing other users' profiles.

6. **Referral "Create Referral" button fails on first click** — The runtime error shows an unhandled `ZodError` from the form resolver for `reason` (min 10 chars). With Zod v4 (`^4.1.5`), `@hookform/resolvers` may have compatibility issues. The `superRefine` combined with standard validations may cause the resolver to throw instead of returning errors gracefully on the first submission attempt.

7. **Create Referral button not working** — Same root cause as #6. The Zod validation error is unhandled.

---

## Changes

### 1. Fix diagnoses visibility

**File**: `src/pages/AppointmentSession.tsx`

- Add `diagnosis_type` to the insert payload in `handleAddDiagnosis` (store `diag.type` as a text field)
- In `fetchDiagnoses` mapping, read the type from the DB record instead of hardcoding `'primary'`

**SQL Migration**: Add `diagnosis_type` column to `appointment_diagnoses`:
```sql
ALTER TABLE public.appointment_diagnoses 
ADD COLUMN IF NOT EXISTS diagnosis_type text DEFAULT 'primary';
```

### 2. Fix PDF `→` character encoding

**File**: `supabase/functions/treatment-plan-generate-pdf/index.ts` (line 1679)

Replace `→` with `->` (ASCII-safe) in the date range string:
```ts
const dateStr = `${m.startDate || "?"} -> ${m.endDate || "?"}`;
```

Also add a global text sanitizer function that strips/replaces non-WinAnsi characters before any `drawText` call, to prevent similar crashes with other Unicode characters.

### 3. Add EnhancedDentalChart to treatment plan modal

**File**: `src/components/treatment/EnhancedCreateTreatmentPlanModal.tsx`

- Import `EnhancedDentalChart` from `@/components/dental/EnhancedDentalChart`
- Above the "Add Procedures" section (before line 963), render the dental chart when `isDentist` is true
- Wire `onToothSelect` to update `selectedTeeth` state
- Keep the existing `ToothSelector` as a compact alternative below, or replace it entirely with the dental chart

### 4. Fix calendar not showing patient-booked appointments

The calendar query joins `profiles:patient_id(...)` which fails due to profiles RLS. The doctor can't read the patient's profile if `doctor_can_view_patient_profile` returns false (e.g., the function checks for existing appointments but the appointment is the one being fetched — circular dependency).

**Fix**: In `useCalendarData.ts`, after fetching appointments, hydrate patient names from `doctor_profiles_view` or use a separate query that bypasses profiles RLS. Alternatively, add an RLS-safe function.

**Simpler approach**: Add a profiles SELECT policy that allows doctors to view profiles of patients who have appointments with them:

**SQL Migration**:
```sql
CREATE OR REPLACE FUNCTION public.doctor_can_view_patient_profile(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM doctors d
    JOIN appointments a ON a.doctor_id = d.id
    WHERE d.user_id = auth.uid()
      AND a.patient_id = p_user_id
  )
$$;
```

If this function already exists, verify it includes all appointment statuses (not just completed ones).

### 5. Fix messaging — "Failed to load messages"

**File**: `src/hooks/useMessaging.ts`

The `conversation_participants` RLS only allows `user_id = auth.uid()`. The `!inner` join means conversations are only returned if the current user is a participant (correct behavior), but other participants' profile data is hidden.

**Fix**: 
- Change the conversation fetch to not join profiles through `conversation_participants`. Instead, fetch participant user_ids separately, then hydrate names from `doctor_profiles_view` (which bypasses profiles RLS for doctors) and a separate profiles query for the current user.
- For sender profiles in `useMessages`, use `doctor_profiles_view` as a fallback when `profiles` query returns no results.

**File**: `src/hooks/useMessaging.ts` (lines 271-276)

Replace the sender profiles query:
```ts
// Try profiles first, fallback to doctor_profiles_view
const { data: senderProfiles } = await supabase
  .from('profiles')
  .select('user_id, full_name, avatar_url')
  .in('user_id', senderIds);

// Hydrate missing profiles from doctor_profiles_view
const foundIds = new Set((senderProfiles || []).map(p => p.user_id));
const missingIds = senderIds.filter(id => !foundIds.has(id));
if (missingIds.length > 0) {
  const { data: doctorProfiles } = await supabase
    .from('doctor_profiles_view')
    .select('user_id, full_name, avatar_url')
    .in('user_id', missingIds);
  senderProfiles?.push(...(doctorProfiles || []));
}
```

Also need to fix `fetchConversations` similarly — the join through `conversation_participants` with `profiles:user_id` will fail for other participants.

### 6. Fix referral form — Create Referral button fails on first click

**Root cause**: Zod v4 + `@hookform/resolvers` compatibility issue. The `superRefine` throws an unhandled ZodError.

**File**: `src/components/referrals/CreateReferralDialog.tsx`

Wrap the form submit handler to catch validation errors gracefully:
```ts
const onFormSubmit = form.handleSubmit(handleSubmit, (errors) => {
  // Validation errors are handled by react-hook-form
  console.log('Validation errors:', errors);
});
```

And use `onFormSubmit` in the form's `onSubmit` prop. Also ensure the `reason` field has a proper `FormMessage` component to display the validation error.

Additionally, check if `form.handleSubmit` properly catches the ZodError. The unhandled promise rejection suggests the resolver throws instead of returning structured errors. Fix by wrapping the zodResolver call or using `mode: 'onBlur'` to validate fields as the user types.

### 7. Redeploy PDF edge function

After fixing the `→` character, redeploy `treatment-plan-generate-pdf`.

---

## Summary

| File | Change |
|------|--------|
| SQL migration | Add `diagnosis_type` to `appointment_diagnoses`; fix `doctor_can_view_patient_profile` function |
| `supabase/functions/treatment-plan-generate-pdf/index.ts` | Replace `→` with `->`, add text sanitizer |
| `src/pages/AppointmentSession.tsx` | Store/read `diagnosis_type` in diagnoses |
| `src/components/treatment/EnhancedCreateTreatmentPlanModal.tsx` | Add `EnhancedDentalChart` above procedure section for dentists |
| `src/hooks/useMessaging.ts` | Fix sender profile hydration with fallback to `doctor_profiles_view` |
| `src/components/referrals/CreateReferralDialog.tsx` | Fix form validation error handling, add `mode: 'onChange'` |
| `src/components/doctor/calendar/useCalendarData.ts` | Add fallback patient name hydration |

