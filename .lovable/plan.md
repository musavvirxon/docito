

## Plan: Build Full Providers Section with Directory + Profile Views

### What changes
**Single file:** `src/pages/AdminDashboard.tsx`

### 1. Add new state variables (lines ~197, after existing useState block)
Add 5 new state variables:
- `selectedProvider` (any | null) — toggles between directory and profile view
- `providerTab` — active tab in profile view (7 tabs)
- `providerSearch` — search filter string
- `providerStatusFilter` — status filter (all/active/pending/inactive)
- `providerSpecialtyFilter` — specialty dropdown filter

### 2. Add missing icon imports
Add `ArrowLeft`, `FileText`, `Phone`, `Clock`, `Filter` to the lucide-react import block for the profile view's back button, documents tab, and filter UI.

### 3. Replace `case "providers":` block (lines 694–881)
Replace the entire providers case with two views:

**View 1 — Provider Directory** (`selectedProvider === null`):
- Same header row with title + invite button (preserving guard/allowModals)
- Same 4 KPI stat cards
- NEW filters row: search input + status filter buttons + specialty dropdown
- NEW provider card grid (1/2/3 cols responsive) replacing the flat list — each card has avatar initials, name, specialty, email, status badge, rating, "View Profile" button
- Empty state preserved with existing t() keys
- Existing JoinRequestsSection and PendingInvitationsSection kept below the grid

**View 2 — Provider Profile** (`selectedProvider !== null`):
- Back button to return to directory
- Profile header card with avatar, name, specialty, status, email, action buttons
- 7-tab navigation bar (Overview, Calendar, Patients, Analytics, Procedures, Reviews, Documents)
- Each tab renders inline content using existing data from `doctors`, `appointments`, `services`
- Analytics tab uses existing recharts imports (AreaChart, ResponsiveContainer, etc.)
- All action buttons use toast.info for "coming soon" features

### Technical notes
- No new files or packages — everything inline in the case block
- All existing t() keys preserved exactly
- guard() and allowModals checks maintained on all action buttons
- Uses existing sectionShellClass, sectionMainGridClass variables
- Data derived from already-destructured `doctors`, `appointments`, `services`, `patients`
- Avatar colors cycled from a small palette array by index

