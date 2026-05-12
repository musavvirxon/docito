## Problem

In `src/components/referrals/CreateReferralDialog.tsx`:

1. **"Create Referral" button looks broken.** The runtime error log shows a Zod validation failure (`Reason must be at least 10 characters`). The button works, but when validation fails the error message renders inside the inner `ScrollArea` and the dialog doesn't auto-scroll to it, so the user doesn't see why nothing happens.
2. **Lower fields feel hidden.** Same root cause — the form is wrapped in a Radix `ScrollArea` with `flex-1 min-h-0`, and inside the "specific" scope branch there is also a nested scrollable receiver list (`max-h-48 overflow-y-auto`). On many viewports the outer area doesn't scroll predictably, hiding Reason / Notes / Dates below the fold.
3. **No way to enter a doctor / entity name manually** when search returns no result (e.g. external provider not on the platform).

## Changes (UI / presentation only)

### 1. Make submit failures visible
- After `form.handleSubmit(handleSubmit)`, pass an `onInvalid` handler that:
  - Finds the first field with an error via `form.formState.errors`.
  - Scrolls its `FormItem` into view (`scrollIntoView({ block: 'center', behavior: 'smooth' })`) inside the ScrollArea viewport.
  - Calls `form.setFocus(firstErrorName)`.
- Also surface a single inline alert above the submit row when `formState.isSubmitted && !formState.isValid` saying "Please fix the highlighted fields below."

### 2. Fix scrolling so all fields are reachable
- Replace the Radix `ScrollArea` wrapper with a plain `<div className="flex-1 min-h-0 overflow-y-auto pr-2">`. Radix ScrollArea inside a flex column dialog frequently fails to size; native overflow is reliable here and keeps the sticky submit row.
- Keep `DialogContent` at `max-w-2xl max-h-[90vh] flex flex-col` and the submit row outside the scroll container (already correct).

### 3. Add manual receiver name entry (specific scope)
- Add a new optional schema field `receiver_manual_name: z.string().trim().max(120).optional()`.
- Update the `superRefine` for `specific` scope: pass validation if **either** `receiver_entity_id` is set **or** `receiver_manual_name` is non-empty (≥ 2 chars). Error message: "Select a provider from the list or type a name below."
- Under the receiver search/list, render a new `FormField` for `receiver_manual_name`:
  - Label: "Can't find them? Enter name manually"
  - Input placeholder per receiver type (e.g. "Dr. Jane Smith", "City Imaging Center").
  - FormDescription: "Use this for external providers not on Docito."
  - Typing into it clears `receiver_entity_id` (and vice versa) so only one path is active.
- In `handleSubmit`, when scope is `specific`:
  - If `receiver_entity_id` is set, send it as today.
  - Else send `receiver_entity_id: undefined` and `receiver_name: data.receiver_manual_name?.trim()` (the field already exists on `CreateReferralInput` in `src/hooks/useReferrals.ts`, no backend change needed).

### 4. Minor polish
- Reset `receiver_manual_name` together with `receiver_entity_id` whenever scope or receiver_type changes.
- Make the Reason field's `FormDescription` show the live character count (`{value.length}/10 min`) so users see why the form blocks them before submit.

## Out of scope
- No changes to `useReferrals` hook, `referral-api`, schema, or DB. `receiver_name` is already supported on `CreateReferralInput`.
- No copy changes outside this dialog.
- No translation changes (dialog currently uses hardcoded English strings; matching the existing style).

## Files touched
- `src/components/referrals/CreateReferralDialog.tsx` (only)
