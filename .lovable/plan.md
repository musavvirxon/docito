

## Problem Analysis

There are multiple interacting bugs causing the auth page to show constant loading and dashboard redirection to fail:

### Root Cause 1: Non-existent database columns
The `profiles` table does NOT have `timezone_source`, `timezone_updated_at`, or `timezone_detected_at` columns. But two places try to write them:
- **AuthContext.tsx** `ensureSelfBootstrap` (line 228-229) -- causes the profile upsert to fail
- **`me` edge function** (lines 122-124) -- causes the first insert attempt to fail (has a fallback, but adds latency)

When `ensureSelfBootstrap` fails, no profile gets created, so `loadProfileAndRoles` can't find a profile, and the auth state never fully resolves.

### Root Cause 2: Missing `role_verifications` table
`fetchRoleStatus` queries a table called `role_verifications` which doesn't exist. The error is caught silently but adds unnecessary async work during bootstrap.

### Root Cause 3: Double bootstrap race condition
When `signIn` is called, it sets `loading = true`, calls `loadProfileAndRoles`, then sets `loading = false`. But `onAuthStateChange` also fires and calls `runBootstrap` which sets `loading = true` again. This creates a race where `loading` flickers or stays `true`, keeping the auth page button disabled and preventing navigation.

### Root Cause 4: `runBootstrap` deduplication blocks second call
The `bootstrapPromiseRef` check means if `onAuthStateChange` fires while `signIn`'s manual bootstrap is running, one of them gets skipped. But since `signIn` already handles its own profile loading, the `onAuthStateChange` listener running `runBootstrap` again is redundant and can cause the `loading` state to stay `true`.

---

## Fix Plan

### 1. Fix `ensureSelfBootstrap` in AuthContext.tsx
Remove `timezone_source` and `timezone_updated_at` from the upsert payload (lines 228-229). Only write columns that actually exist in the `profiles` table.

### 2. Fix `me` edge function
Remove `timezone_source`, `timezone_updated_at`, and `timezone_detected_at` from the initial insert attempt (lines 122-124). This eliminates the need for the fallback path entirely, making bootstrap faster and more reliable.

### 3. Remove `fetchRoleStatus` call or make it safe
Since the `role_verifications` table doesn't exist, wrap the call or skip it entirely to prevent unnecessary errors.

### 4. Fix the double-bootstrap race in `signIn`/`signUp`
After `signIn`/`signUp` manually loads profile and roles, prevent `onAuthStateChange` from re-triggering a full bootstrap. The simplest approach: don't set `loading = true` in `signIn`/`signUp` at the context level -- use only the local `loading` state in Auth.tsx (which already exists). Or, skip `runBootstrap` in `onAuthStateChange` if profile is already loaded.

---

## Technical Details

### Files to modify:

**`src/contexts/AuthContext.tsx`**:
- Line 228-229: Remove `timezone_source: ...` and `timezone_updated_at: ...` from the upsert object
- Line 307-320: Guard `fetchRoleStatus` to not query non-existent table, or remove the call
- Lines 410, 435: Remove `setLoading(true)` / `setLoading(false)` from `signIn` and `signUp` to avoid fighting with `onAuthStateChange`'s bootstrap. The Auth.tsx page already has its own local `loading` state for button disable.

**`supabase/functions/me/index.ts`**:
- Lines 98-100, 122-124: Remove references to `timezone_source`, `timezone_updated_at`, `timezone_detected_at`. Simplify to only write `timezone` alongside the core profile fields.

**`src/pages/Dashboard.tsx`** -- no changes needed, logic is correct.

**`src/pages/Auth.tsx`** -- no changes needed, the local loading + `goAfterAuth` logic is sound once the context stops getting stuck.

**`src/lib/rbac.ts`** -- no changes needed.

**`src/components/profile/ProfileMenu.tsx`** -- no changes needed, works correctly once roles load.

### Deployment:
- Redeploy the `me` edge function after changes.

