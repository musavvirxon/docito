# Plan: Wire Room & Bed Management

Apply surgical edits to 5 existing files. No other changes.

## 1. `tailwind.config.ts`
Add to `extend.animation`:
- `'spin-slow': 'spin 3s linear infinite'`
- `'pulse-soft': 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite'`

## 2. `src/pages/AdminDashboard.tsx`
- Import `RoomBedManager` from `@/components/rooms/RoomBedManager`
- Add `BedDouble` to lucide-react import
- Add `"rooms"` to `AdminSection` union (before `"analytics"`)
- Add menu item `{ id: "rooms", label: "Rooms & Beds", icon: BedDouble }` after inventory
- Add `case "rooms":` in switch rendering `<RoomBedManager>` wrapped in `SectionWrapper`

## 3. `src/pages/DoctorDashboard.tsx`
- Import `RoomBedManager`
- Add `BedDouble` to lucide import
- In the **clinic-member** sidebarItems array only, insert rooms entry between inventory and performance
- Add `case "rooms":` in `renderContent()` switch, passing `doctorId={doctorProfile.id}`

## 4. `src/pages/StaffDashboardPage.tsx`
- Import `RoomBedManager`
- Add `"rooms"` to `SectionId` union (after inventory)
- Add entry in `availableSections` useMemo (after billing) gated by `isAdminLike || permissions?.can_manage_patients`
- Add `<TabsContent value="rooms">` after inventory tab with `RoomBedManager` or "No practice linked" fallback

## 5. `src/components/staff/StaffSidebar.tsx`
- Add `BedDouble` to lucide import
- In the **clinic** menu array, after `intake`, add rooms entry visible if `perms.can_manage_patients || perms.can_view_schedule`

## Notes
- Files `useRoomBed.ts`, room components, and migration `20240701000000_rooms_and_beds.sql` already exist — no changes to those.
- Pre-edit file reads required for AdminDashboard, DoctorDashboard, StaffDashboardPage, StaffSidebar to locate exact insertion points (lucide import line, switch positions, sidebar arrays).
- No styling, logic, or unrelated component changes.
