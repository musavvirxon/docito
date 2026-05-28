# Finance, Services & Staff Invite Fixes

Scope is exactly the six items below — nothing more.

## 1. Staff invite crash

**Migration**
- `clinic_staff_status_check`: drop and re-create to include `active, inactive, on_leave, terminated, invited, pending, cancelled, removed`.

**Code**
- `src/components/clinic/ClinicStaffManager.tsx` → `handleInviteSubmit`: remove the `clinic_staff` fallback insert entirely. Keep only the `staff_invitations` insert path.

## 2. Services RLS for clinic admins

**Migration** on `public.procedures`:
```sql
CREATE POLICY "Practice admins manage procedures"
ON public.procedures FOR ALL
USING (EXISTS (SELECT 1 FROM public.practices p
               WHERE p.id = procedures.practice_id
                 AND p.admin_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.practices p
                    WHERE p.id = procedures.practice_id
                      AND p.admin_id = auth.uid()));
```
(Confirm column names — verify `practice_id` exists on `procedures`, otherwise use the actual FK.)

## 3. Provider pricing & deposit fields

**Migration**: add to `procedures`:
- `deposit_required boolean NOT NULL DEFAULT false`
- `deposit_amount numeric`
- `provider_override_price numeric`

**UI**: Services → Pricing Rules tab. Render a table with one row per service:
- Service name (read-only)
- Override price input (numeric)
- Deposit required toggle
- Deposit amount input (disabled when toggle off)

Save on `onBlur` / toggle change via direct `supabase.from('procedures').update(...).eq('id', ...)`. Optimistic local state, toast on error.

## 4. Doctor payments → finance analytics

**`src/hooks/useRecordPayment.ts`**: after the `payments` insert succeeds, invoke `finance-post-entry`:
```ts
await supabase.functions.invoke('finance-post-entry', {
  body: {
    entityType: practiceId ? 'practice' : 'doctor',
    entityId: practiceId ?? doctorId,
    entryType: 'income',
    amountCents,
    currency,
    source: { table: 'payments', id: data.id },
    occurredAt: paidAt,
  },
});
```
Non-blocking — log on failure, don't fail the user's payment flow.

## 5. Finance sub-tabs in AdminDashboard

`src/pages/AdminDashboard.tsx` — replace the inline prototype blocks:
- Ledger sub-tab → `<FinanceLedgerPanel entityType="practice" entityId={practice.id} />`
- Compensation sub-tab → `<CompensationProfilesPanel entityType="practice" entityId={practice.id} />`
- Recurring sub-tab → `<RecurringRulesPanel entityType="practice" entityId={practice.id} />`

Remove the `window.prompt()` scaffolding. Add the imports from `@/components/financial/...`. (Verify component filenames during build; fall back to existing exports like `FinanceLedgerManager` if the `Panel` variant doesn't exist.)

## 6. Billing invoices + Superbills wiring

**Invoices tab (clinic admin)**: query `billing_invoices` directly where `entity_id = practice.id`. Columns:
- Patient, Issued date, Due (total), Paid, Remaining, Status, Actions

Rendering:
- Remaining in destructive color when `> 0`
- Progress bar = `paid / due`
- Status badge: `Paid` (remaining = 0), `Partial` (paid > 0), `Pending` (paid = 0)

**Doctor side**:
- `src/hooks/useSuperbills.ts`: accept optional `doctorId` filter; when provided, scope query to that doctor.
- `src/components/.../DoctorFinancialStatsSection.tsx`: add a "Superbills" tab rendering `<SuperbillsManager doctorId={doctorId} />`.

## Files touched
- 3 migrations (staff status, procedures RLS, procedures columns)
- `src/components/clinic/ClinicStaffManager.tsx`
- `src/components/.../ClinicServicesManager.tsx` (or new PricingRulesTable component within Services UI)
- `src/hooks/useRecordPayment.ts`
- `src/pages/AdminDashboard.tsx` (finance sub-tabs + invoices tab query)
- `src/hooks/useSuperbills.ts`
- `src/components/.../DoctorFinancialStatsSection.tsx`

## Out of scope
- Webhook changes, new edge functions, design overhauls, i18n string updates beyond labels for new fields.
