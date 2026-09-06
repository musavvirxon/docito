# Connect the procedure form to real inventory, with live status

The "Instruments & Tools" picker in Add Procedure shows "No inventory available" even when the clinic has stock, and once open it never reflects what has changed in the stock room. This plan fixes both.

## What's wrong today (verified)

- The picker only looks at two places: the clinic recorded on the doctor's own record, and the doctor's personal stock. A doctor who belongs to a clinic as staff (rather than having the clinic set on their doctor record) sees nothing. In the current data, the only stock that exists belongs to the clinic "ifjfe", and it is only reachable through the clinic membership path.
- Personal (doctor-owned) stock can never be read back: the database access rule for stock only accepts clinic, lab, imaging or pharmacy identifiers, so anything saved against a doctor is invisible afterwards.
- The list is loaded once when the dialog opens. Quantities, sterilization state and use counts are a frozen snapshot — nothing updates while the dialog is open, and picking items doesn't reduce what's shown as remaining.

## What will change

1. **Find stock the way the rest of the app does.** The picker will resolve every place the signed-in user has access to (clinic set on the doctor record, clinics where they are admin, clinics where they are active staff) plus their personal stock, and load stock from all of them, grouped by source name in the dropdown.
2. **Personal stock becomes readable.** A database change lets a user read and manage stock rows whose owner is their own doctor record, alongside the existing clinic rule.
3. **Live status.** A realtime subscription on the stock table (and its log table) refreshes the list while the dialog is open, so a quantity change, a sterilization completion or a use-count increment made elsewhere is reflected within a second. The list also refreshes when the dialog regains focus.
4. **Real-time computation inside the dialog.** Availability is recomputed on every change, not just at load:
   - Remaining = stock on hand minus the quantity already picked in this dialog for the same item.
   - Single-use items: quantity capped at remaining; item disabled when remaining is 0 ("Out of stock").
   - Reusable items: shows `used x of max`; disabled when max uses reached; flagged amber when sterilization is pending.
   - Stock chip (ok / low / critical / out) and expiry warning recomputed live.
   - A running summary line shows how many units this procedure will consume and, per item, the projected stock after one use.
5. **Empty state that explains itself.** Instead of a bare "No inventory available", show whether the user has no stock locations at all, or has one but with no active items, with a link to the Inventory section.

## Technical notes

- New hook `src/hooks/useInventoryScopes.ts`: resolves accessible entity ids via `get_my_entity_scopes()` (clinic rows), `doctors.practice_id`, and `doctors.id` for personal stock.
- `useMergedInventory` in `src/hooks/useClinicInventory.ts` gains an array-of-entities signature (keeping the current two-argument form working), a `realtime` option subscribing to `clinic_inventory` and `clinic_inventory_logs` filtered per entity, and returns `refresh` for manual refetch. Channel names include entity id + timestamp + random suffix per project convention.
- Add pure helpers `getEffectiveAvailability(item, pendingQty)` and `getItemBlockReason(item, pendingQty)` next to the existing `getStockStatus` / `getUseStatus`, and use them in `AddProcedureModal.tsx` for both the dropdown rows and the linked-item rows.
- `AddProcedureModal.tsx` consumes the scope hook instead of `useMergedInventory(practiceId, dentistId)`; saving to `procedure_inventory_requirements` uses the resolved entity of the chosen item (unchanged table).
- Migration: replace the single `clinic_inventory` policy with clinic-entity access **or** ownership of the matching doctor record (`owner_type = 'doctor'` and `entity_id` in the caller's `doctors.id`), via a `SECURITY DEFINER` helper to avoid recursion. Same rule extended to `clinic_inventory_logs`. No table creation, so no new grants needed beyond the existing ones.
- Deduction on procedure completion already exists in `useAppointmentProcedures.ts`; it is left as-is.

## Translations

Add to `public/locales/{en,ru,uz}/procedures.json` under `add`: `noInventoryScope`, `noInventoryItems`, `openInventory`, `remaining`, `afterUse`, `expiringSoon`, `expired`, `willConsume`, `source`.
