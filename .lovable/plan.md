
Goal: make the non-overview/non-finance practice admin sections feel as wide and dense as Overview and Finances by adding more full-width content blocks, not just changing item rows.

What I found:
- The page shell is already full width. The problem is inside `src/pages/AdminDashboard.tsx`: `providers`, `services`, `locations`, and `patients` each stop after one `lg:grid-cols-2` row.
- Overview/Finances feel wider because they have multiple dashboard rows and more substantial cards.
- In Providers, `JoinRequestsSection` can still render a small sparse card, so one side stays visually empty.
- Staff is handled by `ClinicStaffManager`, which is denser already, but I should still verify it does not need an additional summary row/header treatment for consistency.

Implementation plan:
1. Normalize the narrow sections to the same dashboard rhythm as Overview
- Keep the top header/actions
- Keep the 3 stat cards row
- Add a second full-width content row after the current two-column row
- Use `grid grid-cols-1 lg:grid-cols-3 gap-6` and `lg:grid-cols-2` patterns already used in Overview

2. Expand Providers beyond the current two cards
- Keep Join Requests + Doctors List as the first row
- Add a second row with:
  - Provider status distribution card
  - Specialty breakdown card
  - Recent/active provider activity card
- If join requests are empty, replace that space with a richer provider insights card instead of leaving a thin empty card

3. Expand Services with more operational cards
- Keep Services List + Category Breakdown
- Add another row with:
  - Price range / average pricing card
  - Most common categories card
  - Recently added or top service summary card
- Make the services list the dominant card when data exists

4. Expand Locations with richer right-side and lower-row content
- Keep Locations List + Location Status Overview
- Add another row with:
  - Coverage/branch summary card
  - Address / branch quick reference card
  - Operational health card (active vs inactive, branch count, latest updated-style summary)

5. Expand Patients with more cards
- Keep Patients List + Patient Statistics
- Add another row with:
  - Provider assignment breakdown
  - Recent visits / last-visit summary
  - Status segmentation card
- Make sure patient cards fill the row even when the patient list is short

6. Audit remaining practice admin sections for consistency
- Review `staff` rendering via `ClinicStaffManager`
- If it still feels visually lighter than Overview/Finances, add a lightweight dashboard header/summary wrapper in `AdminDashboard.tsx` before the manager component rather than rewriting the manager itself
- Verify `settings` does not introduce a narrow inner container; only adjust if needed

Technical details:
- Main file: `src/pages/AdminDashboard.tsx`
- Possible minor follow-up only if needed: `src/components/dashboard/JoinRequestsSection.tsx`
- No shell-width issue is visible in the current code; this is a content-density/layout composition issue
- Best fix is to add more cards and rows per section, using the same grid patterns as Overview and Finances, rather than only widening existing list items
