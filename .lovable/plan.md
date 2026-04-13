

## Problem
The practice admin dashboard sections appear "small" despite previous layout fixes. Two root causes:

1. **Header uses `container mx-auto` with `max-width: 1400px`** (from Tailwind config) -- this caps the header at 1400px on wider screens, making the whole dashboard feel constrained even though the content area below is full-width.

2. **The `<main>` padding is conservative** (`px-4 sm:px-6 lg:px-8`) and some sections' card content is sparse, creating visual emptiness.

## Plan

### 1. Remove `container mx-auto` from the dashboard header
**File:** `src/pages/AdminDashboard.tsx` (line 1840)

Change the header inner div from `container mx-auto` to `w-full` so the header stretches edge-to-edge, matching the full-width content area below.

### 2. Reduce main content padding for wider feel
**File:** `src/pages/AdminDashboard.tsx` (line 1931)

Change the main area from `px-4 sm:px-6 lg:px-8` to `px-4 sm:px-6` to give more room to the cards on large screens.

### 3. Make stat cards use 4-column grid on large screens
All sections currently use `sm:grid-cols-3` for their top stat cards. Add a fourth stat card to each section and switch to `sm:grid-cols-2 lg:grid-cols-4` to fill more horizontal space:
- **Providers**: Add "Specialties" count stat
- **Services**: Add "Total Revenue Potential" stat
- **Locations**: Add "Providers per Location" stat
- **Patients**: Add "Avg. Patients per Provider" stat

### 4. Also fix early-return screens (loading, error, no-practice)
Lines 296-406 also use `container mx-auto` in their headers. Change these to `w-full` for consistency.

### Technical details
- Single file change: `src/pages/AdminDashboard.tsx`
- ~10 targeted edits: header classes, stat grid classes, adding one stat card per section
- No new components or dependencies

