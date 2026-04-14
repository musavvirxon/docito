

## Plan: Build Full Services Section with 4-Tab Navigation

**Single file:** `src/pages/AdminDashboard.tsx`

### 1. Add recharts imports
Add `Bar, BarChart` to the existing recharts import on line 53 (needed for Analytics tab's category chart).

### 2. Add 4 new state variables (after line 222)
```tsx
const [serviceTab, setServiceTab] = useState<'catalog' | 'pricing' | 'categories' | 'analytics'>('catalog');
const [serviceSearch, setServiceSearch] = useState('');
const [serviceCategoryFilter, setServiceCategoryFilter] = useState('all');
const [selectedServiceId, setSelectedServiceId] = useState<any>(null);
```

### 3. Replace `case "services":` block (lines 1325–1550)
Replace entirely with a tabbed layout inside SectionWrapper.

**Header + KPI cards:** Kept as-is (title, add button with guard/allowModals, 4 stat cards).

**Tab bar:** 4 tabs (Catalog, Pricing Rules, Categories, Analytics) controlled by `serviceTab`.

**Tab: Catalog**
- NEW filters row: search input + category dropdown (derived from services)
- Service list card (lg:col-span-8) with filtered rows — each row shows name, category badge, duration, price, online/offline badge, Edit + Archive buttons with guard()
- Existing Category Breakdown sidebar card (lg:col-span-4) — preserved
- Existing 3 insight cards (Pricing Overview, Top Categories, Service Summary) — preserved
- Existing empty state with t() keys preserved

**Tab: Pricing Rules**
- 3 info cards (Fixed Pricing, Variable/Provider Pricing, Deposit Rules) — placeholder with toast actions
- Service Price List table: all services with columns for Name, Category, Duration, Price, Type badge, Deposit badge, Edit button
- Note linking to Providers → Procedures tab

**Tab: Categories**
- Create Category inline form: name input + 5 color preset circles + Add button
- Current categories card: derived from `services`, showing dot + name + count + rename/delete buttons
- Uncategorized services card with count and bulk-assign button

**Tab: Analytics**
- 4 KPI cards (Total, Active/Online, Categories, Avg Price)
- BarChart (recharts) for services-by-category distribution
- Price Distribution card with horizontal progress bars ($0-50, $51-100, $101-200, $200+)
- Most Booked Services card: join services with appointments, rank top 10 by booking count
- Zero-Booking Services card: services with no matching appointments, with Archive button

### Technical notes
- Only new import: `Bar, BarChart` from recharts (line 53)
- All existing t("admin.services.*") keys preserved
- guard() and disabled={!allowModals} on all action buttons
- Uses sectionShellClass, sectionMainGridClass, sectionInsightGridClass
- No new files or packages

