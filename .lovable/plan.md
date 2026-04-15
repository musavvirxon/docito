

## Plan: Enhance Insurance Tab in Billing Section

**File:** `src/pages/AdminDashboard.tsx`

### 1. Add 7 new state variables (after line ~261, alongside other billing state)

```tsx
const [insurers, setInsurers] = useState<string[]>([]);
const [newInsurerName, setNewInsurerName] = useState('');
const [claims, setClaims] = useState<any[]>([]);
const [claimStatusFilter, setClaimStatusFilter] = useState('all');
const [claimSearch, setClaimSearch] = useState('');
const [addClaimOpen, setAddClaimOpen] = useState(false);
const [claimForm, setClaimForm] = useState({
  patient_name: '', insurer: '', service: '', amount: '', submitted_date: '', notes: '',
});
```

### 2. Replace insurance tab content (lines 3631–3706)

Replace the entire `billingTab === 'insurance'` block with the full implementation containing:

- **Header**: Title + "Submit Claim" button opening inline form
- **Inline Add Claim card**: 2-col form with patient autocomplete (datalist), insurer select from `insurers`, service select from `services`, amount, date, notes. Submit adds to local `claims` state.
- **4 KPI cards**: Submitted / Approved (green) / Pending (yellow) / Rejected (red) — derived from `claims`
- **Filters row**: Search input + status filter buttons (All/Submitted/Approved/Pending/Rejected)
- **Claims table**: Filtered by search + status. Columns: Patient, Insurer badge, Service, Amount, Date (try/catch formatted), Status badge (color-coded), Actions (Approve/Reject/Delete)
- **Empty state**: Shield icon + "Submit Claim" button
- **Two-column analytics row**: Claims by Status (colored bars with percentages) + Claims by Insurer (grouped counts and totals)
- **Accepted Insurers card**: Inline add form + list with remove buttons + preset quick-add row (SOGAZ, Alfa Insurance, etc.)

### Technical notes
- All data is local state only — no Supabase calls
- `guard()` + `disabled={!allowModals}` on all actions
- Date formatting wrapped in try/catch
- Uses existing `Card`, `Badge`, `Button`, `Input`, `Textarea` components
- No new files or packages

