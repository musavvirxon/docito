

## Problem
The **Providers**, **Services**, **Locations**, and **Patients** sections use single-column stacked layouts, leaving the right half of the screen visually empty. The **Overview**, **Finance**, **Billing**, and **Analytics** sections use multi-column grids that fill the full width.

## Plan

Restructure the four narrow sections in `src/pages/AdminDashboard.tsx` to use multi-column grid layouts matching the overview pattern:

### 1. Providers section (lines ~691-779)
- Place the **Join Requests** card and the **Doctors List** card side by side in a `lg:grid-cols-2` grid below the stat cards
- If no join requests exist, the doctors list spans full width (`lg:col-span-2`)

### 2. Services section (lines ~781-864)
- Split into a `lg:grid-cols-2` layout: **Services List** on the left spanning more space, and a new **Category Breakdown** summary card on the right showing service counts per category

### 3. Locations section (lines ~880-978)
- Use a `lg:grid-cols-2` grid: **Locations List** on the left, and a **Map/Status Overview** card on the right showing active vs inactive counts and location details

### 4. Patients section (lines ~980-1042)
- Use a `lg:grid-cols-2` grid: **Patients List** on the left, and a **Patient Stats** card on the right (active vs inactive breakdown, recent patients)

### Technical details
- All changes are in one file: `src/pages/AdminDashboard.tsx`
- Each section's stat cards row stays as `sm:grid-cols-3` (already full-width)
- Below the stats, content Cards are arranged in `lg:grid-cols-2` grids instead of single-column stacks
- Matches the visual density pattern used by overview and billing sections

