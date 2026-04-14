

## Plan: Build Full Billing Section with 5-Tab Navigation

**Single file:** `src/pages/AdminDashboard.tsx`

### 1. Add 3 new state variables (after line 217)
```tsx
// Billing section state
const [billingTab, setBillingTab] = useState<'overview' | 'invoices' | 'transactions' | 'insurance' | 'settings'>('overview');
const [invoiceSearch, setInvoiceSearch] = useState('');
const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
```

### 2. Replace `case "billing":` block (lines 2379–2508)
Replace with a tabbed layout. The header row and SectionWrapper stay identical.

**Header (always visible):** Same as existing — title, BranchSelector, 7D/30D/90D buttons, Refresh button. All t() keys and guard() preserved exactly.

**Tab bar:** 5 tabs (Overview, Invoices, Transactions, Insurance, Settings) using ghost buttons with active border styling, controlled by `billingTab`.

**Tab: Overview**
- 4 KPI cards row: Total Revenue, Pending (yellow), Refunds (red), Transaction Count
- Existing Payment Summary card (lg:col-span-5) — kept verbatim from current code
- Existing Recent Transactions card (lg:col-span-7) — kept verbatim from current code
- NEW: 3 insight cards below (sectionInsightGridClass):
  - By Payment Method: group transactions by `payment_method`
  - By Status: colored progress bars per status
  - Period Summary: avg value, highest tx, completion rate

**Tab: Invoices**
- Search + status filter buttons (All/Paid/Pending/Overdue/Refunded)
- Table from `billing.data?.transactions` with Invoice #, Patient, Date, Amount, Status badge, View/Send buttons
- 3 summary stat cards below

**Tab: Transactions**
- 3 summary cards (Income, Refunds, Net Revenue)
- Full transaction log table: Date, Patient, Amount, Payment Method, Status, Reference
- Loading/error/empty states

**Tab: Insurance**
- 3 placeholder summary cards (Submitted/Approved/Rejected = 0)
- Empty claims table with column headers
- Accepted Insurers card with "Add Insurer" button

**Tab: Settings**
- Billing Settings card: Currency, Tax, Auto-receipt toggle, Invoice Logo, Payment Terms
- Invoice Template card: placeholder preview box
- Accepted Payment Methods card: visual toggles for Cash, Credit Card, etc.

### Technical notes
- No new files, packages, or imports needed (Shield icon from lucide already available, or use a suitable existing icon)
- All existing t("adminBilling.*") keys preserved exactly
- Existing Payment Summary and Recent Transactions cards copied verbatim into Overview tab
- All action buttons wrapped in guard() with disabled={!allowModals}
- All billing.data access uses null-safe chaining
- All date formatting in try/catch
- Currency formatting reuses existing `fmt` helper pattern

