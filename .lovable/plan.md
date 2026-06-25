## Inventory Feature Wiring Plan

Apply the user-provided prompts in order across 5 files. No new components or DB changes — assumes `ClinicInventoryManager`, `ProcedureInventoryItems`, `useClinicInventory`, `useActiveEntityScope`, and `public/locales/en/inventory.json` already exist (or are added separately).

### 1. `src/App.tsx`
- Add lazy import: `const InventoryPage = lazy(() => import("@/pages/InventoryPage"));`
- Add protected route `/inventory` rendering `<InventoryPage />` inside the same protected-routes wrapper used by `/practices/dashboard`, `/doctor/dashboard`, `/staff-dashboard`.

### 2. `src/pages/AdminDashboard.tsx`
- Add `Package` to the lucide-react import.
- Add `import { ClinicInventoryManager } from "@/components/inventory/ClinicInventoryManager";`
- Insert sidebar tab `{ id: "inventory", label: t("admin.tabs.inventory", { defaultValue: "Inventory" }), icon: Package }` between `services` and `staff`.
- Add a render branch after the `services` section:
  ```
  {activeSection === 'inventory' && <ClinicInventoryManager entityId={entityId} />}
  ```
  using existing `useAccessScope` / `useActiveEntityScope` to derive `entityId`.

### 3. `src/components/appointments/AddProcedureModal.tsx`
- Add imports: `ProcedureInventoryItems`, `useAccessScope`, `useActiveEntityScope`.
- Inside component, derive `entityId = activeEntityId || primary?.entity_id`.
- Render `<ProcedureInventoryItems entityId={entityId} procedureId={procedureId} />` at end of form when both exist, with i18n title/hint.

### 4. `public/locales/en/appointments.json`
- Add to `addProcedure`:
  - `"inventoryTitle": "Required Inventory"`
  - `"inventoryHint": "Items deducted automatically when this procedure is completed"`

### 5. `src/hooks/useAppointmentProcedures.ts`
- Add imports: `useAccessScope`, `useActiveEntityScope`, `useClinicInventory`.
- Inside hook, derive `entityId` and `const { deductForProcedure } = useClinicInventory(entityId);`
- In `updateStatus`, after the supabase update call in BOTH the `dental` branch and the `else` branch, when `status === 'completed'`:
  ```
  await deductForProcedure(item.procedureId, item.name, appointmentId || '');
  ```
  before `await refresh()`.

### 6. `src/i18n/config.ts`
- If a static `ns: [...]` array exists, add `'inventory'`. If using `i18next-http-backend` dynamic loading, leave as-is.

### Verification
- Read each target file first to confirm exact insertion points and existing imports (especially the lucide import line, sidebar nav array, `updateStatus` branches, and i18n config style) before editing.
- Confirm `InventoryPage`, `ClinicInventoryManager`, `ProcedureInventoryItems`, `useClinicInventory`, `useActiveEntityScope` paths resolve; if any are missing, stop and report rather than create them (out of scope).

### Out of scope
- No DB migrations, edge functions, RLS, or new components.
- No changes to other locale files (en only per instructions).
