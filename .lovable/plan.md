## Inventory: owner display, reuse/sterilization details, qty input fix

Three small, scoped changes to `src/components/inventory/ClinicInventoryManager.tsx` plus one tiny hook addition. No DB migration required — every field already exists (`created_by`, `is_reusable`, `max_uses_per_unit`, `requires_sterilization`, `current_use_count`, `quantity_in_stock`).

### 1. Show "Added by" (owner) on each item

- Extend `ClinicInventoryItem` type in `src/hooks/useClinicInventory.ts` with `created_by: string | null` (already selected via `*` — just expose in type).
- Add a lightweight `useInventoryOwners(items)` helper inside `ClinicInventoryManager.tsx` that collects distinct `created_by` UUIDs and fetches `profiles` rows (`id, full_name, avatar_url, role`) in one `in()` query, returns a `Map<uuid, {name, role}>`.
- In the item card row (around line 340), render a small muted line: `Added by {name} · {role}` with a `User` icon. Falls back to `Unknown` when profile missing.

### 2. Reusable / sterilization usage breakdown

Reinterpret the existing single-row counters as a clear per-item summary. For each item where `is_reusable === true`:

- `totalUnits   = quantity_in_stock`
- `maxUses      = max_uses_per_unit ?? ∞`
- `usedOnActive = current_use_count` (uses spent on the unit currently in service)
- `remainingOnActive = max(0, maxUses - usedOnActive)`
- `needsSterilization = requires_sterilization && usedOnActive > 0 ? 1 : 0`
- `readyToUse  = totalUnits - needsSterilization` (units immediately usable)

Render below the name (replacing today's terse `5/10 uses` chip) a 2-line summary inside the existing card:

```text
♻️ Reusable · {readyToUse}/{totalUnits} ready · {remainingOnActive} uses left on active unit
🧼 {needsSterilization} awaiting sterilization     (only when > 0 and requires_sterilization)
```

Use existing translations under `inventory.stockStatus.*` and add 4 new keys to `public/locales/en/inventory.json` (mirrored across locales by existing pattern):
- `reuse.ready` — "{{ready}}/{{total}} ready"
- `reuse.remainingActive` — "{{n}} uses left on active unit"
- `reuse.awaitingSterilization` — "{{n}} awaiting sterilization"
- `reuse.unlimited` — "unlimited uses"

Keep the existing `InventoryStockBadge` untouched.

### 3. Quantity input: stop the "0 won't go away" problem

Today (line 467-468):
```tsx
value={form.quantity_in_stock}                    // numeric 0 always renders "0"
onChange={(e) => setForm(f => ({...f, quantity_in_stock: parseFloat(e.target.value) || 0}))}
```

Fix:
- Track the field as a **string draft** in form state: `quantity_in_stock_input: string` defaulting to `''`.
- Render `value={form.quantity_in_stock_input}` with `placeholder="0"` — the 0 is the placeholder (background) and disappears the moment the user types.
- On change, store the raw string; on blur and on submit, coerce via `Number(input) || 0`.
- Apply the same pattern to the **Adjust Stock** quantity input (line 599) and to `reorder_level` / `avg_daily_usage` / `unit_cost` / `max_uses_per_unit` inputs (line 529) so every numeric field behaves consistently — placeholder, not pre-filled 0.

### Files touched
- `src/components/inventory/ClinicInventoryManager.tsx` — owner row, reuse summary, string-draft inputs.
- `src/hooks/useClinicInventory.ts` — expose `created_by` on the item type.
- `public/locales/en/inventory.json` (+ mirror via existing locales using same keys) — 4 new `reuse.*` keys + `addedBy`.

No DB migration, no RLS changes, no behavior change to `deductForProcedure` or the adjust flow's math.
