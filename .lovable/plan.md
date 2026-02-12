
# Fix Authentication Flow: Role Resolution, Redirection, and Profile Menu

## Problem Analysis

The root cause is a **state ambiguity** in `AuthContext`. The `activeRole` state initializes to `"patient"` as a default, and there is no way for redirect logic to distinguish between:
- "activeRole is `patient` because bootstrap hasn't completed yet" (the default)
- "activeRole is `patient` because the user IS a patient"

This causes all three reported issues:
1. **Redirect fires too early** -- Auth.tsx and Dashboard.tsx see `loading=false` + `user` exists, and redirect using the default `"patient"` role before `runBootstrap` has resolved the actual role from the database.
2. **Dashboard dispatcher redirects wrong** -- Same ambiguity causes `/dashboard` to route to `/patient-dashboard`.
3. **Profile menu shows "Patient"** -- `activeRole` remains `"patient"` in the context if the bootstrap result was swallowed by a stale version check.

## Solution

Add a `bootstrapped` boolean flag to `AuthContext` that is `false` on init and only set to `true` after `runBootstrap` has fully resolved roles for a real session (or confirmed no session exists). All redirect logic will gate on `bootstrapped` instead of just `!loading`.

### Changes

#### 1. `src/contexts/AuthContext.tsx`
- Add `bootstrapped` state (default `false`) to the context type and provider.
- In `runBootstrap`: set `bootstrapped = true` in the `finally` block alongside `setLoading(false)`.
- In `clearAuthState`: reset `bootstrapped = false`.
- Expose `bootstrapped` in the context value.

#### 2. `src/pages/Auth.tsx`
- Destructure `bootstrapped` from `useAuth()`.
- Change the redirect `useEffect` guard from `if (authLoading) return;` to `if (!bootstrapped) return;`.
- This ensures redirection only happens after the role is fully resolved from the database.

#### 3. `src/pages/Dashboard.tsx`
- Destructure `bootstrapped` from `useAuth()`.
- Change the redirect guard from `if (loading) return;` to `if (!bootstrapped) return;`.

#### 4. `src/components/PostAuthRedirect.tsx`
- Destructure `bootstrapped` from `useAuth()`.
- Change the guard from `if (loading) return;` to `if (!bootstrapped) return;`.

#### 5. `src/components/profile/ProfileMenu.tsx`
- No changes needed -- it already reads `activeRole` from context, which will now be correct once the bootstrap race is fixed.

## Technical Detail

```text
BEFORE (broken):
  signIn() -> onAuthStateChange -> runBootstrap starts (loading=true)
  -> React renders: user exists, loading=true -> no redirect yet (good)
  -> runBootstrap sets activeRole="doctor", loading=false (batched)
  -> useEffect fires -> redirect works
  
  BUT sometimes:
  -> initial INITIAL_SESSION(null) -> loading=false, activeRole="patient"
  -> signIn() -> SIGNED_IN fires -> runBootstrap starts
  -> brief window where loading was false from initial event
  -> hasAutoRedirected fires with wrong role

AFTER (fixed):
  bootstrapped starts FALSE
  -> INITIAL_SESSION(null) -> clearAuthState -> loading=false, bootstrapped=true
  -> signIn() -> SIGNED_IN -> runBootstrap -> bootstrapped=false, loading=true
  -> bootstrap completes -> activeRole="doctor", bootstrapped=true, loading=false
  -> useEffect checks bootstrapped=true -> redirects correctly
```

No database changes required. No new dependencies.
