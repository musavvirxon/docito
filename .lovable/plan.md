

# Fix Plan: PDF Build Error, Diagnoses, Freezing, Messages, Verification, and Referrals

This plan addresses 9 distinct issues across the platform.

---

## 1. Fix Build Error in `treatment-plan-generate-pdf` Edge Function

**Root cause**: `bidi-js` v1.0.2 from esm.sh does not export `getReorderedString` as expected. The `bidiFactory()` call returns an object without that method.

**Fix**: Wrap the bidi call in a try-catch with a no-op fallback. If the library method doesn't exist, return the reshaped string as-is (graceful degradation for RTL text).

**File**: `supabase/functions/treatment-plan-generate-pdf/index.ts` (lines 794-804)

```ts
function formatForLocale(locale: Locale, input: string): string {
  const s = String(input || "");
  if (!s) return s;
  if (!isRtlLocale(locale)) return s;

  try {
    const reshaped = reshaper.reshape(s);
    const bidi = bidiFactory();
    if (typeof bidi?.getReorderedString === "function") {
      return bidi.getReorderedString(reshaped);
    }
    return reshaped;
  } catch {
    return s;
  }
}
```

---

## 2. Add Diagnoses Tab to Appointment Session

**Root cause**: `AppointmentSession.tsx` has no diagnoses section at all. The `DiagnosisTab` component exists at `src/components/visit/tabs/DiagnosisTab.tsx` but is not used.

**Fix**:
- Add a "Diagnoses" tab to the `TabsList` (between Session and Dental/Prescriptions)
- Import `DiagnosisTab` from the existing visit component
- Add state for diagnoses array + fetch from `appointment_diagnoses` table
- For dentists, show the `EnhancedDentalChart` (imported from existing `@/components/dental`) above the diagnosis form, allowing tooth selection before adding a diagnosis
- Wire `onAddDiagnosis` to insert into `appointment_diagnoses` and `onRemoveDiagnosis` to delete
- After adding a diagnosis with tooth selection, reset the dental chart selection

**File**: `src/pages/AppointmentSession.tsx`
- Add `'diagnoses'` to `SessionTab` type and `VALID_TABS`
- Add diagnoses state, fetch, and CRUD handlers
- Add `TabsTrigger` and `TabsContent` for diagnoses
- Inside the diagnoses tab content: conditionally render `EnhancedDentalChart` for dentists (with `onToothSelect` callback), then render `DiagnosisTab`

---

## 3. Fix Dental Chart in Treatment Plan Creation

**Root cause**: The treatment planning section needs the dental chart above the "add procedure" section, and selected teeth should reset after adding a procedure.

**Fix**: In the treatment plan creation dialog (inside `TreatmentPlanningSection` or the procedure-adding modal), import `EnhancedDentalChart` from `@/components/dental` and render it above the procedure form. After a procedure is added, call a reset handler to clear `selectedTeeth`.

**File**: `src/components/doctor/TreatmentPlanningSection.tsx` (or whichever component renders the treatment plan procedure creation modal)

---

## 4. Fix Platform Freezing on Tab Switch / Minimize

**Root cause**: `HeroOrb3D.tsx` uses multiple `useFrame` loops in the Three.js Canvas that keep running even when the tab is hidden. The `useTabVisibility` hook exists but the Canvas doesn't pause when `isVisible` is false -- it just stops calling `invalidate()` via `FrameInvalidator`, but the `useFrame` callbacks in child components (`GlobeWithPoints`, `PulseRings`, `FloatingParticles`, etc.) still execute every frame.

**Fix**: Pass `isVisible` (from `useTabVisibility`) down to the `Canvas`'s `frameloop` prop:
- When `isVisible && !isMobile`: `frameloop="always"`
- When `!isVisible`: `frameloop="never"` (stops all rendering)

This stops Three.js from ticking when the tab is hidden.

**File**: `src/components/home/premium/HeroOrb3D.tsx`

```tsx
<Canvas frameloop={isVisible ? "always" : "never"} ...>
```

---

## 5. Fix Diagnoses Not Visible in UI

**Root cause**: The `DiagnosisTab` component receives `diagnoses` as a prop but the appointment session page doesn't fetch them from the database. The component itself just renders what it receives.

**Fix**: Covered by item #2 above -- fetch from `appointment_diagnoses` table on load and pass to `DiagnosisTab`.

---

## 6. Fix Verification Button Not Visible After Sign-Up

**Root cause**: The `DoctorVerificationStatusCard` shows "Complete Verification in Profile" only when `verificationStatus` is null. For new patient sign-ups, the card is only shown on the Doctor Dashboard. For patients, there's no verification concept. If the user means doctor sign-up: after `DoctorSignUp.tsx` completes, it navigates to `/doctor-dashboard` where `DoctorVerificationStatusCard` should appear. The issue may be that `useDoctorVerificationStatus` can't find the doctor record yet (race condition).

**Fix**: In `DoctorVerificationStatusCard`, when `!verificationStatus && !loading`, ensure the "Complete Verification in Profile" card renders with a visible button. Currently it navigates to `/profile` -- verify this path is correct for doctors (should be `/doctor/verification` or `/profile`). Also ensure the hook doesn't fail silently when the doctor record hasn't been created yet.

**File**: `src/components/doctor/DoctorVerificationStatusCard.tsx` -- the component already handles this case (lines 39-57). Need to check `useDoctorVerificationStatus` hook for silent failures.

---

## 7. Fix "Failed to Load Messages" and Patients Not Visible in New Chat

**Root cause**: The `search_chat_users` RPC queries `profiles` table, but profiles RLS may block reading other users' profiles. The function is `security definer` so it should bypass RLS. The issue is likely that the `messages_with_attachments` view grants (from our previous migration) haven't been applied yet, or the messaging component's direct message query fails.

**Fix**:
- Verify the migration from earlier was applied (messages_with_attachments view with security_invoker + grants)
- In `NewChatDialog.tsx`, add a fallback: if `search_chat_users` returns no results or errors, try a direct query to `doctor_profiles_view` for doctors and `profiles` for accessible users
- For "patients of doctor not visible": the RPC searches all profiles, but doctor's patients may not have profiles with `full_name` set. Add a secondary lookup to `doctor_patients` table for the current doctor.

**File**: `src/components/messaging/NewChatDialog.tsx` -- add patient tab/filter using doctor's patient list

---

## 8. Fix Referral Selection Tick Mark

**Root cause**: In `CreateReferralDialog.tsx` (line 468-480), when a receiver is selected, the row gets `bg-primary/10` but there's no checkmark icon.

**Fix**: Add a `CheckCircle2` icon when `field.value === receiver.id`.

**File**: `src/components/referrals/CreateReferralDialog.tsx` (lines 466-480)

```tsx
<div
  key={receiver.id}
  className={cn(
    'p-3 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between',
    field.value === receiver.id && 'bg-primary/10 border-l-2 border-primary',
  )}
  onClick={() => field.onChange(receiver.id)}
>
  <div>
    <p className="font-medium text-sm">{getReceiverDisplayName(receiver)}</p>
    <p className="text-xs text-muted-foreground">{getReceiverSubtext(receiver)}</p>
  </div>
  {field.value === receiver.id && (
    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
  )}
</div>
```

---

## Summary of File Changes

| File | Change |
|------|--------|
| `supabase/functions/treatment-plan-generate-pdf/index.ts` | Fix bidi call with try-catch fallback |
| `src/pages/AppointmentSession.tsx` | Add Diagnoses tab with dental chart for dentists, fetch/save diagnoses |
| `src/components/doctor/TreatmentPlanningSection.tsx` | Add dental chart above procedure form, reset teeth after add |
| `src/components/home/premium/HeroOrb3D.tsx` | Set `frameloop="never"` when tab hidden |
| `src/components/doctor/DoctorVerificationStatusCard.tsx` | Ensure verification button visibility |
| `src/components/messaging/NewChatDialog.tsx` | Add doctor's patients fallback lookup |
| `src/components/referrals/CreateReferralDialog.tsx` | Add checkmark icon on selected receiver |

