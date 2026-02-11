## Simplify to Single-Role Authentication

The current multi-role system has complex merging logic, role switching, and stored role preferences that contribute to the loading and redirection issues. This plan simplifies everything to: **one user = one role**.

### What Changes

**1. Simplify AuthContext.tsx -- Remove multi-role machinery**

- Remove `allRoles` merging (currently combines `allRolesState` + profile roles via `getUserRolesFromProfile`)
- Remove `switchRole`, `setActiveRoleSilently`, `readStoredRole`, `writeStoredRole`, `clearStoredRole`, `applyActiveRoleFrom`
- Remove `ACTIVE_ROLE_KEY` localStorage usage
- The single role comes from: first role in `user_roles` table (using `getPrimaryRole` if multiple exist), falling back to `profile.role`
- `activeRole` becomes a simple derived value, not switchable state
- `allRoles` stays in the interface but always returns a single-element array (avoids breaking consumers)
- Loading and bootstrap logic stays as-is (the version counter pattern is correct)

**2. Simplify Dashboard.tsx -- Use activeRole directly**

- Remove the `allRoles` dependency; just use `activeRole` to compute the dashboard route
- Keep the `hasRedirected` guard

**3. Simplify ProfileMenu.tsx -- Remove role switcher UI**

- Remove the "Switch Role" submenu entirely (lines 126-148)
- Keep showing the current role label in the header

**4. No database changes needed**

- Users with multiple rows in `user_roles` will use their highest-priority role (via `getPrimaryRole`)
- The existing INSERT policy from the previous migration is fine

### Technical Details

**AuthContext.tsx changes:**

- Remove state: `allRolesState`, replace with computed single role
- Remove functions: `switchRole`, `setActiveRoleSilently`, `readStoredRole`, `writeStoredRole`, `clearStoredRole`, `applyActiveRoleFrom`
- Remove localStorage key `ACTIVE_ROLE_KEY`
- In `runBootstrap`: after loading profile and roles, compute `activeRole = getPrimaryRole(roles)` and set it directly
- In `clearAuthState`: just reset `activeRole` to `"patient"`
- Context interface: keep `allRoles` (returns `[activeRole]`), keep `activeRole`, remove `switchRole` and `setActiveRoleSilently` from the interface (or make them no-ops to avoid breaking other consumers)

**Dashboard.tsx changes:**

- Line 25-28: Replace `allRoles` logic with just `[activeRole || "patient"]`
- Remove `allRoles` from the `useAuth()` destructure and useEffect deps

**ProfileMenu.tsx changes:**

- Remove `allRoles`, `switchRole` from `useAuth()` destructure
- Remove lines 126-148 (role switcher submenu)
- Remove `handleRoleSwitch` function
- Remove unused imports (`Check`, `ChevronRight`)

**Auth.tsx -- no changes needed**, redirection already uses `goAfterAuth()` which goes to `/dashboard`

Remove anything related to time zone.