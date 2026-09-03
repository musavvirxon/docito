# Opt-in "Instruments & Tools" section in Add Procedure

Today the "Instruments & Medications" block is always shown in the Add Procedure dialog. Make it opt-in and make item selection aware of single-use vs. reusable items and their sterilization state.

## Behaviour

1. New switch "Uses instruments / materials", default **off**, in the same card style as the existing Follow-up and Consent toggles.
   - Off: the whole picker and linked-items list are hidden, and nothing is saved to inventory requirements (any previously picked items are cleared on toggle-off).
   - On: the current picker (item + quantity + add) and the linked-item list appear.

2. Item picker becomes usage-aware. Each item in the dropdown and in the linked list shows:
   - Type chip: **Single-use** (consumed, quantity deducted per procedure) or **Reusable** (`x of max uses`).
   - Status chip derived from existing helpers:
     - stock status (`ok` / `low` / `critical` / `out`) from `getStockStatus`
     - use status (`ok` / `needs_sterilization` / `exhausted`) from `getUseStatus`
   - Rules:
     - Single-use item with `quantity_in_stock < quantity` -> warning row, blocked from being added with that quantity (quantity capped, warning shown).
     - Out-of-stock single-use item -> shown greyed with "Out of stock" and not selectable.
     - Reusable item in `needs_sterilization` -> selectable but flagged "In sterilization — must be sterilized before use", with an amber warning on the row.
     - Reusable item that is `exhausted` -> not selectable, labelled "Max uses reached".
   - For reusable items the quantity field means "units needed" and defaults to 1.

3. On save, inventory requirement rows are written only when the toggle is on (unchanged table `procedure_inventory_requirements`). Rows blocked by the rules above are never in the list, so nothing invalid gets attached.

4. Reset: closing the dialog or a successful create resets the toggle back to off along with the selected items.

## Technical notes

- File: `src/components/procedure/AddProcedureModal.tsx`.
  - Add `usesInventory` state (default `false`), wrap the existing emerald inventory `Card` content in it, and clear `selectedInventory` when switched off.
  - Reuse `getStockStatus` / `getUseStatus` from `useClinicInventory`; no schema or hook changes needed — `is_reusable`, `max_uses_per_unit`, `current_use_count`, `requires_sterilization`, `quantity_in_stock` already exist on `MergedInventoryItem`.
  - Add the reset to `handleClose` and the post-create reset block.
- No database migration required.

## Translations

Add to `public/locales/{en,ru,uz}/procedures.json` under `add`:
`useInventoryToggle`, `useInventoryToggleHint`, `singleUse`, `reusable`, `usesOf`, `outOfStock`, `inSterilization`, `inSterilizationHint`, `maxUsesReachedHint`, `insufficientStockHint`.
