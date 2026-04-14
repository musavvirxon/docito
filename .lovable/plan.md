

## Plan: Build Full Finance Section with 6-Tab Navigation

**Single file:** `src/pages/AdminDashboard.tsx`

### 1. Add 12 new state variables (after line 228)
```tsx
// Finance section state
const [financeTab, setFinanceTab] = useState<'overview' | 'ledger' | 'compensation' | 'recurring' | 'categories' | 'export'>('overview');
const [ledgerSearch, setLedgerSearch] = useState('');
const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'all' | 'income' | 'expense' | 'payroll'>('all');
const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState('all');
const [ledgerFrom, setLedgerFrom] = useState('');
const [ledgerTo, setLedgerTo] = useState('');
const [financeEntries, setFinanceEntries] = useState<any[]>([]);
const [financeCategories, setFinanceCategories] = useState<string[]>([]);
const [compensationProfiles, setCompensationProfiles] = useState<any[]>([]);
const [recurringRules, setRecurringRules] = useState<any[]>([]);
const [newCategoryName, setNewCategoryName] = useState('');
const [newCategoryColor, setNewCategoryColor] = useState('blue');
```

### 2. Replace `case "finances":` block (lines 3509–3516)
Remove `<FinanceManagementSection>` render. Replace with full 6-tab layout inside the existing SectionWrapper.

**Header:** "Finance" title + "Export CSV" button with guard/allowModals.

**Tab bar:** 6 tabs (Overview, Ledger, Compensation, Recurring, Categories, Export) controlled by `financeTab`.

**Tab: Overview**
- 4 KPI cards: Income, Expenses (red), Net (green/red), Entries count
- Income vs Expenses AreaChart (recharts) — group entries by month, two Area lines
- Two-column row: Expense Breakdown by Category (dots + progress bars) + Recent Entries (last 8, sorted desc)

**Tab: Ledger**
- Filters row: From/To date inputs, type buttons (All/Income/Expense/Payroll), category dropdown, search input
- 4 summary stat cards (Entries, Income, Expenses, Net)
- Collapsible "Add Entry" form with date, type, currency, amount, category, reference, description fields — adds to local `financeEntries` state
- Full entries table with type badges, delete button via guard()
- Empty/filter states

**Tab: Compensation**
- 3 pay type info cards (Salary/Hourly/Percentage)
- Compensation profiles list from `compensationProfiles` with Run Payout / Edit buttons
- "Run Payroll" card with date range inputs
- All actions → toast.info placeholders

**Tab: Recurring**
- Status summary cards (Due Rules, Active Rules)
- Recurring rules table from `recurringRules` with schedule badges, status, Edit/Pause/Delete
- "Run Due Rules" card with date input
- "Recent Runs" card — placeholder empty state

**Tab: Categories**
- Create category inline form: name input + 5 color circle buttons + Add button (adds to local state)
- Your Categories card: list derived from `financeCategories` with entry counts and conditional delete
- Empty states

**Tab: Export**
- 3 export cards: Ledger Export (with date/type/category filters), Recurring Runs Export, Payroll Export
- All export buttons → toast.info placeholders

### Technical notes
- AreaChart, Area already imported from recharts (line 53)
- Icons needed: Lock, Clock, Percent, TrendingUp, DollarSign, Users — most already imported; Lock/Percent may need adding to lucide import
- All data is local state — no Supabase calls
- guard() and disabled={!allowModals} on all mutation buttons
- Date operations wrapped in try/catch
- Uses sectionShellClass, sectionMainGridClass, sectionInsightGridClass
- No new files or packages

