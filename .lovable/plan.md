

# Fix Authentication: Multi-Role Support, Redirections, and Profile Menu

## What Will Change

1. **Every account automatically gets the "patient" role** in addition to whatever role they sign up with
2. **One email can have multiple roles** - signing up again with same email but different role adds that role (handled via sign-in + role addition flow)
3. **Sign-in uses the most recently active role** for dashboard routing
4. **Profile menu shows all available roles** with ability to switch between them
5. **Redirections work reliably** by waiting for role resolution to complete before navigating

## User-Facing Changes

- After sign-in, you land on the dashboard for your most recent role
- The profile menu dropdown shows all your roles (e.g., "Doctor", "Patient") so you can switch
- Empty dashboards show zero/empty states gracefully (no errors)
- Sign-up with a role you already have is prevented with a clear message

---

## Technical Details

### 1. Database Migration: Auto-assign patient role on signup

Update `handle_new_user()` trigger to always insert a `patient` role row alongside the chosen signup role:

```sql
-- After inserting the signup role, also ensure patient role exists
INSERT INTO public.user_roles (user_id, role)
VALUES (new.id, 'patient'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;
```

Also backfill existing users who are missing the patient role:

```sql
INSERT INTO user_roles (user_id, role)
SELECT DISTINCT user_id, 'patient'::app_role
FROM user_roles
WHERE user_id NOT IN (
  SELECT user_id FROM user_roles WHERE role = 'patient'
)
ON CONFLICT (user_id, role) DO NOTHING;
```

### 2. AuthContext.tsx - Add `bootstrapped` flag and role switching

- Add `bootstrapped` state (default `false`), set to `true` only after `runBootstrap` completes
- On sign-in, set `activeRole` to the most recently assigned non-patient role (latest `assigned_at`)
- Re-enable `switchRole` to actually update `activeRole` state (for profile menu switching)
- Expose `bootstrapped` in context

Key logic change in `getPrimaryRole`: for sign-in, use the **latest** assigned non-patient role instead of earliest.

### 3. src/lib/rbac.ts - Add `getLatestRole` function

New function that sorts by `assigned_at` descending and picks the most recent non-patient role. This is used on sign-in to determine the active dashboard.

### 4. Auth.tsx - Gate redirect on `bootstrapped`

Change the redirect useEffect:
```typescript
const { bootstrapped } = useAuth();
// ...
if (!bootstrapped) return;  // instead of: if (authLoading) return;
```

### 5. Dashboard.tsx - Gate redirect on `bootstrapped`

Same pattern - wait for `bootstrapped` before dispatching to role dashboard.

### 6. PostAuthRedirect.tsx - Gate redirect on `bootstrapped`

Same pattern.

### 7. ProfileMenu.tsx - Show all roles with switch option

- Read `allRoles` from `useAuth()`
- Display all role labels in the dropdown
- Highlight the current `activeRole`
- Clicking a different role calls `switchRole()` and navigates to that role's dashboard
- Each role shows its icon and label

### 8. ensureSelfBootstrap - Also ensure patient role

When the client-side safety net runs, it should also upsert the `patient` role alongside the intended signup role:

```typescript
// Upsert the signup role
await supabase.from("user_roles").upsert(
  { user_id: uid, role: metaRole },
  { onConflict: "user_id,role" }
);
// Also ensure patient role exists
if (metaRole !== "patient") {
  await supabase.from("user_roles").upsert(
    { user_id: uid, role: "patient" },
    { onConflict: "user_id,role" }
  );
}
```

### Files Modified

| File | Change |
|------|--------|
| Database migration (new) | Update `handle_new_user()` + backfill patient roles |
| `src/contexts/AuthContext.tsx` | Add `bootstrapped`, fix role switching, ensure patient role |
| `src/lib/rbac.ts` | Add `getLatestRole()` function |
| `src/pages/Auth.tsx` | Gate redirect on `bootstrapped` |
| `src/pages/Dashboard.tsx` | Gate redirect on `bootstrapped` |
| `src/components/PostAuthRedirect.tsx` | Gate redirect on `bootstrapped` |
| `src/components/profile/ProfileMenu.tsx` | Show all roles, enable switching |

