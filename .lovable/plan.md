## Root Cause Analysis

### Bug 1: `runBootstrap` deduplication swallows auth state changes

The `bootstrapPromiseRef` pattern in `AuthContext.tsx` (line 310) causes critical failures:

```
When bootstrapPromiseRef.current is set, ALL subsequent calls return the same promise
```

This means:

- If the user signs out WHILE the initial bootstrap is still running, the SIGNED_OUT event's bootstrap is skipped entirely -- the old session's profile gets loaded, and the user appears still logged in.
- If `onAuthStateChange` fires TOKEN_REFRESHED while bootstrap is running, it's also swallowed.
- On reload, if `getSession()` resolves AFTER `onAuthStateChange` fires, one of them is skipped -- but they might have different session states.

### Bug 2: `ProfileMenu.signOut` bypasses `AuthContext.signOut`

`ProfileMenu.tsx` (line 56) calls `supabase.auth.signOut()` directly instead of `useAuth().signOut()`. This means:

- `clearAuthState()` is NOT called immediately -- it only runs when `onAuthStateChange(SIGNED_OUT)` fires and triggers `runBootstrap(null)`.
- But if a bootstrap is already running (from INITIAL_SESSION), the SIGNED_OUT `runBootstrap` is RETURNED as the existing promise (Bug 1), so `clearAuthState()` never runs for the sign-out event.
- The session IS cleared from localStorage by `supabase.auth.signOut()`, but the React state retains the old user/profile. On page reload, `getSession()` returns null, but the user briefly sees the old state.

### Bug 3: Missing INSERT policy on `user_roles`

The `user_roles` table has no INSERT policy for regular authenticated users. Only `super_admin` can insert via the ALL policy. When `ensureSelfBootstrap` tries to upsert a role for a new user, it fails silently. This means `allRoles` is always empty for new users, so the role switcher never appears.

---

## Fix Plan

### 1. Replace bootstrap deduplication with a version counter (AuthContext.tsx)

Replace `bootstrapPromiseRef` with a simple version counter (`bootstrapVersionRef`). Each call to `runBootstrap` increments the counter. After async work completes, the result is only applied if the version hasn't changed (meaning no newer call has started).

```text
Before: if (bootstrapPromiseRef.current) return bootstrapPromiseRef.current;
After:  const version = ++bootstrapVersionRef.current;
        // ... do async work ...
        if (bootstrapVersionRef.current !== version) return; // stale, discard
        // ... apply state ...
```

This ensures:

- The latest auth event always wins
- Stale bootstrap results are discarded
- No more swallowed sign-out events
- `setLoading(false)` always runs via `finally`

### 2. Fix ProfileMenu to use AuthContext's signOut (ProfileMenu.tsx)

Replace the direct `supabase.auth.signOut()` call with the `signOut` function from `useAuth()`. This ensures `clearAuthState()` runs immediately (before the async API call), providing instant UI feedback.

### 3. Add a safety timeout (AuthContext.tsx)

Add a 10-second fallback timer in the `init` useEffect. If `loading` is still `true` after 10 seconds, force it to `false`. This prevents the UI from being permanently stuck if something unexpected happens during bootstrap.

### 4. Add INSERT policy on `user_roles` for self-registration (Database migration)

Add an RLS policy allowing authenticated users to insert their own role row:

```sql
CREATE POLICY "Users can insert their own roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
```

This allows `ensureSelfBootstrap` to create the initial role row for new users.

### 5. Skip full bootstrap on TOKEN_REFRESHED (AuthContext.tsx)

In the `onAuthStateChange` callback, check the event type. For `TOKEN_REFRESHED`, only update the session/user state without re-running the full profile load. This prevents unnecessary loading flicker.

---

## Technical Details

### Files to modify:

`**src/contexts/AuthContext.tsx**` -- Core fixes:

- Replace `bootstrapPromiseRef` with `bootstrapVersionRef` counter pattern
- Add safety timeout (10 seconds) in init useEffect
- In `onAuthStateChange`, differentiate TOKEN_REFRESHED from other events
- Ensure `setLoading(false)` is always called, even for discarded stale bootstraps

`**src/components/profile/ProfileMenu.tsx**` -- Sign-out fix:

- Import and use `signOut` from `useAuth()` instead of calling `supabase.auth.signOut()` directly
- Remove the direct supabase import (it's only used for signOut)

**Database migration** -- RLS policy:

- Add INSERT policy on `user_roles` for authenticated users on their own rows

&nbsp;

At the end test it with console logs. Try signing in with [docito@gmail.com](mailto:docito@gmail.com) password: 123456  