

## Plan: Build Full Analytics Section with 6-Tab Navigation

**Single file:** `src/pages/AdminDashboard.tsx`

### 1. Add 1 new state variable (after line ~256)
```tsx
const [analyticsTab, setAnalyticsTab] = useState<'overview' | 'appointments' | 'providers' | 'patients' | 'financial' | 'services'>('overview');
```

### 2. Replace `case "analytics":` block (lines 4073–4194)
Replace entirely with a tabbed layout inside SectionWrapper.

**Header (always visible):** Exact same as current — title with `t("adminAnalytics.title")`, BranchSelector, 7D/30D/90D range buttons, Refresh button. All preserved verbatim.

**Tab bar:** 6 tabs (Overview, Appointments, Providers, Patients, Financial, Services) controlled by `analyticsTab`.

**Tab: Overview**
- 4 KPI cards: Appointments, Unique Patients, Providers Active, Locations — from `analytics.data` with fallbacks to array lengths
- Existing Daily Trend AreaChart (lg:col-span-8) — preserved verbatim with all t() keys and loading/error/empty states
- Existing Summary card (lg:col-span-4) — preserved verbatim
- AdvancedFinancialMetrics component below main grid

**Tab: Appointments**
- 4 KPI cards: Total, Completed, Cancelled, No-show — derived from `appointments` array
- Appointments over time AreaChart (uses `analytics.data?.trend` or groups appointments by month)
- Booking source card (group by `a.source || 'Unknown'`, progress bars)
- Status breakdown card (colored progress bars per status)
- Peak hours heatmap (24 hour-cells grid, colored by appointment density, parse `start_time`)
- Cancellation rate over time AreaChart (monthly cancellation %)

**Tab: Providers**
- Provider performance table: for each doctor, derive stats from `appointments` (total, completed, cancelled, completion rate, unique patients, rating)
- Utilization rate card (lg:col-span-6): progress bars color-coded by utilization level
- Top providers card (lg:col-span-6): ranked list with avatar circles
- Provider comparison card: two dropdowns to select and compare providers side-by-side

**Tab: Patients**
- 4 KPI cards: Total, Active (visited <90d), Inactive (90d+), Avg Visits per Patient
- Patient growth AreaChart (cumulative by month from `patients.created_at`)
- Gender breakdown card (lg:col-span-6) with progress bars
- Age distribution card (lg:col-span-6) from DOB with buckets
- Inactive patients table (90+ days, max 10 rows, "Re-engage" buttons)
- Top patients by visits table (rank from appointments)

**Tab: Financial**
- 4 KPI cards from `billing.data`: Total Revenue, Pending, Refunds, Transactions
- Revenue trend AreaChart (group billing transactions by month)
- Revenue by Provider card (lg:col-span-6)
- Payment Method Breakdown card (lg:col-span-6)
- Avg revenue per appointment stat card

**Tab: Services**
- 4 KPI cards: Total Services, Most Booked, Categories, Zero Bookings
- Top services by bookings table (join services with appointments, rank by count)
- Services by category BarChart (lg:col-span-6)
- Zero-booking services card (lg:col-span-6)

### Technical notes
- Only 1 new state variable: `analyticsTab`
- All existing t("adminAnalytics.*") keys preserved exactly in Overview tab
- Overview tab's Daily Trend chart and Summary card copied verbatim
- AdvancedFinancialMetrics stays in Overview tab
- All recharts components already imported (Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis)
- `billing` hook already available — no re-declaration
- All date parsing wrapped in try/catch
- guard() and disabled={!allowModals} on all action buttons
- No new files or packages
- Comparison dropdowns use local state inside the case block

