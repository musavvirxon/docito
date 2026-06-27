# Inventory in Procedures + Doctor/Staff Dashboards

## 1. Database — add reusability + sterilization columns

The `clinic_inventory` table currently has 18 columns but is missing the fields the frontend hook already references (`is_reusable`, `max_uses_per_unit`, `requires_sterilization`, `current_use_count`). One migration:

- Add `is_reusable boolean NOT NULL DEFAULT false`
- Add `max_uses_per_unit integer NULL`
- Add `requires_sterilization boolean NOT NULL DEFAULT false`
- Add `current_use_count integer NOT NULL DEFAULT 0`
- Add an `owner_type text NOT NULL DEFAULT 'clinic'` (`'clinic' | 'doctor'`) so the same table holds doctor-personal inventory (lets `useMergedInventory` query both with one schema).
- Add index on `(entity_id, owner_type)`.

No RLS changes — existing policy already scopes by `entity_id`.

## 2. `AddProcedureModal.tsx` — inventory picker

Add a new section above the Cancel/Submit row inside the existing dialog:

- Pull clinic entity via `useActiveEntityScope('clinic')` + `useAccessScope` (fallback to `primary?.entity_id`).
- Use `useMergedInventory(clinicEntityId, doctorEntityId)` to get a unified list (clinic 🏥 + doctor 👤).
- Local state: `selectedInventory[]`, `inventoryWarnings[]`, picker open/qty.
- UI: header with "Instruments & Medications" + "Add Item" button; collapsible picker row (Select + qty input + Add); list of chosen items showing source icon, qty editor, reuse counter (`current_use_count / max_uses_per_unit`), warning icon when status ≠ ok, remove button; inline `Alert` listing warnings.
- `checkInventory()` flags: out-of-stock, insufficient qty, critical/low, `needs_sterilization`, `exhausted`.
- In `handleSubmit`: run `checkInventory()` first; if hard-fail (out/insufficient) show `window.confirm` to proceed anyway.
- Reset all inventory state in the existing `open` reset effect.
- Pass selections back via `onSubmit` payload (`inventory: [{inventoryId, quantity}]`) so they can be persisted to `procedure_inventory_requirements` (already exists) by the parent's create-procedure flow.

## 3. `useAppointmentProcedures.ts` — auto-deduct on completion

- Import `useClinicInventory`, resolve `entityId` via `useAccessScope` + `useActiveEntityScope('clinic')`.
- In `updateStatus` (both dental and general branches), after the supabase `.update()` succeeds and before `refresh()`, when `status === 'completed' && entityId`:
  ```ts
  await deductForProcedure(item.procedureId ?? null, item.name, appointmentId ?? '');
  ```
  `deductForProcedure` already handles: subtract `quantity_in_stock`, increment `current_use_count` for reusables, auto-dispose at `max_uses_per_unit`, log to `clinic_inventory_logs`, and toast on warnings.

## 4. `DoctorDashboard.tsx` — Inventory section

- Import `Package`, `ClinicInventoryManager`.
- Derive `clinicEntityId = doctorProfile?.practice_id`, `doctorEntityId = doctorProfile?.id`, `inventoryEntityId = clinicEntityId ?? doctorEntityId`.
- Add `{ id: 'inventory', label: t('doctor.tabs.inventory', {defaultValue:'Inventory'}), icon: Package }` to the sidebar nav array (both clinic-joined and independent variants if both exist).
- Render `<ClinicInventoryManager entityId={inventoryEntityId} canCreate canDelete />` when `activeSection === 'inventory'`, with a subtitle that switches text depending on whether the doctor is clinic-joined. Doctor sees their personal inventory when independent; sees clinic inventory when joined (merged view is available in the procedure picker).

## 5. `StaffDashboardPage.tsx` — Inventory section

- Import `Package`, `ClinicInventoryManager`.
- Extend the `SectionId` union with `'inventory'`.
- Add nav entry after `billing`, visible only when `practiceId ?? practice?.id` exists.
- Render `<ClinicInventoryManager entityId={practiceId ?? practice?.id} canCreate canDelete={false} />` in the section renderer. Receptionists can adjust stock but not delete items.

## 6. `App.tsx` — route

Add lazy import + protected route `/practices/inventory → InventoryPage` (already exists).

## 7. Settings (reuse + sterilization controls)

These live inside the existing inventory item form (`ClinicInventoryManager` → `AddItem`/`EditItem`). Add three controls to that form:

- Toggle: "Reusable instrument" → `is_reusable`
- Number input (shown when reusable): "Max uses before sterilization/disposal" → `max_uses_per_unit`
- Toggle (shown when reusable): "Requires sterilization between uses" → `requires_sterilization`

Doctor-personal inventory uses the same form, with `owner_type='doctor'` and `entity_id = doctor.id`.

## Technical notes

- Files touched: 1 migration; `src/App.tsx`, `src/pages/AdminDashboard.tsx` (already has tab from prior turn — verify only), `src/pages/DoctorDashboard.tsx`, `src/pages/StaffDashboardPage.tsx`, `src/components/appointments/AddProcedureModal.tsx`, `src/components/inventory/ClinicInventoryManager.tsx` (form fields), `src/hooks/useAppointmentProcedures.ts`.
- `useMergedInventory`, `getStockStatus`, `getUseStatus`, `deductForProcedure` already exist and are unchanged.
- `procedure_inventory_requirements` already exists — used to persist per-procedure inventory links so `deductForProcedure` can resolve them at completion time.
- No changes to RLS; doctor-owned rows are protected by the same `entity_id`-scoped policy because `entity_id` is set to the doctor's id when `owner_type='doctor'`.

Approve and I'll implement in one pass.
