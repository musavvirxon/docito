

## Plan: Add Custom Reports Tab to Analytics Section

**File:** `src/pages/AdminDashboard.tsx`

### 1. Update analyticsTab type (line 269)
Add `'reports'` to the union type.

### 2. Add 8 new state variables (after line ~271)
`reportMetrics`, `reportFrom`, `reportTo`, `reportProvider`, `reportService`, `reportBranch`, `reportGenerated`, `reportLoading` as specified.

### 3. Add "Reports" to analyticsTabs array (line 4621, after services)
```tsx
{ key: 'reports' as const, label: 'Reports' },
```

### 4. Add Reports tab content (after line 5009, before `</div></SectionWrapper>`)
Insert the full Reports tab block containing:

- **Header**: "Custom Reports" title + "Schedule Report" button (coming soon toast)
- **Report Builder card**: 
  - Step 1: 12 metric toggle buttons with Select All / Clear
  - Step 2: 5 filter controls (from date, to date, provider select, service select, branch select)
  - Generate button with 800ms simulated loading, builds report rows from filtered `appointments` data
- **Generated Report card** (conditional on `reportGenerated !== null`):
  - Period label, Export CSV button, Clear button
  - Active filter pills with X to clear
  - Results table: Metric / Value / Unit with zebra striping
  - Summary bar: total metrics count, filters applied, generation timestamp
- **Scheduled Reports card**: Empty state with calendar icon and coming-soon button

### Technical notes
- All data local state — no Supabase calls
- `guard()` + `disabled={!allowModals}` on all actions
- Uses existing `Card`, `Badge`, `Button`, `Input`, `Textarea` components
- `billing` cast as `any` for summary access
- No new files or packages
- No changes to other analytics tabs

