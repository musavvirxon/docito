

## Plan: Make All Admin Dashboard Functions Operational

This is a large-scale effort across all 8 sections of the Admin Dashboard, replacing ~73 "coming soon" placeholder toasts with real Supabase-backed operations.

### Approach

The dashboard already has substantial backend infrastructure: `entity_settings` table with RPCs, `finance_entries`, `finance_categories`, `finance_recurring_rules`, `staff_compensation_profiles`, `billing_transactions`, `appointments`, `doctors`, `procedures`, `practices`, and hooks like `useEntitySettings`, `useFinanceEntries`, `useFinanceCategories`. The primary work is **wiring the UI to these existing backends** rather than creating new tables.

### Phase 1: Settings Section (save/load via entity_settings)

**File:** `src/pages/AdminDashboard.tsx`

- Import and use `useEntitySettings('practice', practice?.id)` hook
- **Clinic Profile tab**: Load/save clinic info (name, phone, email, website, address, tax_id, description) to `entity_settings.payload` via `saveSettings()`
- **Social Links**: Save instagram/facebook/linkedin/twitter URLs to `entity_settings.payload.social`
- **Booking tab**: Save all booking rules (onlineBookingEnabled, bookingWindowDays, etc.) to `entity_settings.payload.booking`
- **Notifications tab**: Save all notifSettings to `entity_settings.payload.notification_prefs`
- **Branding tab**: Save selectedBrandColor to `entity_settings.payload.branding`
- **Security tab**: Save session timeout, 2FA preference to `entity_settings.payload.security`
- **Data tab**: Wire export buttons to generate real CSVs from `patients`, `appointments`, `financeEntries` data (client-side CSV download)
- Initialize all local state from loaded `settings.payload` on mount

### Phase 2: Finance Section (CRUD via Supabase direct queries)

**File:** `src/pages/AdminDashboard.tsx`

- Import and use `useFinanceEntries` and `useFinanceCategories` hooks with entity_type='practice', entity_id=practice.id
- **Ledger tab**: 
  - Load real entries from `useFinanceEntries` instead of local `financeEntries` state
  - "Add Entry" form: insert into `finance_entries` via `supabase.from('finance_entries').insert()`
  - Delete entry button: delete from `finance_entries`
- **Categories tab**: 
  - Load from `useFinanceCategories` 
  - Add category: insert into `finance_categories`
  - Delete category: delete from `finance_categories`
- **Compensation tab**: 
  - Fetch from `staff_compensation_profiles` where entity_type='practice' and entity_id=practice.id
  - Add/edit compensation profiles via insert/update
  - "Run Payout" → insert payout record into `compensation_payouts`
- **Recurring tab**: 
  - Fetch from `finance_recurring_rules` 
  - Add/edit/pause/delete rules
- **Export tab**: Generate real CSVs from fetched data

### Phase 3: Services Section (CRUD via procedures table)

**File:** `src/pages/AdminDashboard.tsx`

- **Catalog tab**: 
  - "Edit service" → inline editing or modal that updates `procedures` table
  - "Archive service" → set `is_active = false` on the procedure
- **Pricing tab**: 
  - "Add pricing rule" → update procedure price/duration
  - "Edit price" → inline update to `procedures.price`
- **Categories tab**: 
  - "Save category" → insert/update service categories (using `finance_categories` with kind='service' or a dedicated approach based on existing procedure categories)
  - "Rename"/"Delete" categories
- **Analytics tab**: Already functional (derived from `appointments` + `services`)

### Phase 4: Providers Section (read/update via doctors + appointments)

**File:** `src/pages/AdminDashboard.tsx`

- "Edit provider" → inline form updating `doctors` table (specialty, bio, consultation_fee, etc.)
- "Suspend" → set doctor status/verified to false
- "Message" → navigate to messaging or open conversation
- "Edit Info" in profile → update `doctors` row
- "Block Time" → insert into `blocked_times` table  
- "Upload Document" → use Supabase storage upload
- "Full patient profile" link → navigate to patient detail or set `selectedPatient`
- "Save fee" on custom procedure fee → update `procedures` table

### Phase 5: Patients Section (read/update via profiles + appointments)

**File:** `src/pages/AdminDashboard.tsx`

- "Edit patient" → inline form updating patient profile fields
- "New Appointment" → navigate to appointment booking or open modal
- "Block patient" → add to a blocklist or flag
- "Edit medical info" / "Edit insurance" → update relevant patient data
- "Add Appointment" → open appointment creation flow
- "View appointment" → navigate or expand detail
- "Create invoice" → insert into `billing_invoices`
- "Upload" documents → Supabase storage
- "Save note" → insert into `patient_notes` table
- "Export patients" → CSV generation from `patients` array

### Phase 6: Billing Section

**File:** `src/pages/AdminDashboard.tsx`

- "Create invoice" → insert into `billing_invoices` with line items
- "View invoice" → expand/modal showing invoice details
- "Send invoice" → toast or edge function call
- "Export" → CSV download of transactions
- "Submit claim" → insert insurance claim record
- "Add insurer" → insert into insurance provider tables
- "Edit tax" / "Edit terms" / "Change logo" → save to `entity_settings.payload.billing_prefs`
- "Save payment methods" → save to `entity_settings.payload.billing_prefs.payment_methods`

### Phase 7: Overview + Analytics (mostly already functional)

- "View all" on recent appointments → `setActiveSection('analytics')` and switch to appointments tab
- Analytics tabs already derive from real data hooks — they're functional as-is

### Technical Details

**New imports needed in AdminDashboard.tsx:**
- `useEntitySettings` hook
- `useFinanceEntries`, `useFinanceCategories` hooks
- `supabase` client (for direct inserts/updates/deletes)

**Pattern for all mutations:**
```tsx
guard(async () => {
  const { error } = await supabase.from('table').insert/update/delete(...);
  if (error) throw error;
  toast.success('Action completed');
  refreshData(); // re-fetch
})
```

**CSV export pattern (client-side):**
```tsx
const csv = [headers, ...rows.map(r => values)].map(r => r.join(',')).join('\n');
const blob = new Blob([csv], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a'); a.href = url; a.download = 'export.csv'; a.click();
```

**No new DB tables needed** — all existing tables cover the required operations.

**No new edge functions needed** — `entity-settings` edge function already handles settings CRUD; direct Supabase client handles other tables.

**Estimated scope:** ~7 phases, all within `AdminDashboard.tsx`. Each phase replaces placeholder toasts with real Supabase operations. Due to the file's 5000+ line size, changes will be surgical replacements of specific toast handlers.

### Order of implementation
1. Settings (highest impact — persists configuration)
2. Finance (CRUD for ledger, categories, compensation)
3. Services (CRUD for procedures)
4. Providers (edit, suspend, documents)
5. Patients (edit, notes, invoices, exports)
6. Billing (invoices, claims, exports)
7. Overview + Analytics (navigation wiring)

