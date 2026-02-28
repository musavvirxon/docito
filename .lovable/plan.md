
Goal: stop preview/build failures, remove dashboard loading loops after reload, and restore complete multi-role visibility in profile menus without weakening security.

1) Stabilize preview/build pipeline first (blocking)
- Fix optional dependency installation issue causing Vite startup failure:
  - File: `.npmrc`
  - Remove `omit=optional` (or set it so optional deps are installed), because Rollup’s platform binary (`@rollup/rollup-linux-x64-gnu`) is optional and currently skipped.
- Repair accidental secret leakage in CI config:
  - File: `.github/workflows/cloudflare-pages-deploy.yml`
  - Replace hardcoded values with:
    - `${{ secrets.CLOUDFLARE_API_TOKEN }}`
    - `${{ secrets.CLOUDFLARE_ACCOUNT_ID }}`
- Expected result:
  - Preview and CI builds boot consistently.
  - No plaintext credentials in repository config.

2) Eliminate dashboard loading-loop conditions in UI routes
- Normalize loading guards so unauthenticated users don’t get trapped in spinner states:
  - File: `src/pages/pharmacy/PharmacyDashboardPage.tsx`
  - Current bug: `isLoading = authLoading || loading || !user` keeps spinner forever when `!user`.
  - Change to only auth/data loading in `isLoading`, then let `!user` render sign-in empty state.
- Apply the same guard pattern audit across dashboard routes:
  - `src/pages/lab/LabDashboardPage.tsx`
  - `src/pages/imaging/ImagingDashboardPage.tsx`
  - `src/pages/DoctorDashboard.tsx`
  - `src/pages/AdminDashboard.tsx`
  - `src/pages/FinanceDashboard.tsx`
- Standardize this sequence in each dashboard:
  1. If auth still resolving (`authLoading` or equivalent), show spinner.
  2. Else if no `user`, show “Sign in required” state.
  3. Else load entity/data and show “no entity” state when applicable.
- Expected result:
  - Reload no longer causes permanent loading screens.
  - Users always land in spinner → content or spinner → explicit empty/error state.

3) Harden auth bootstrap + role hydration so role data is complete after reload/tab return
- Improve role resolution resilience in `AuthContext`:
  - File: `src/contexts/AuthContext.tsx`
  - Keep existing role source merge strategy, but ensure DB roles are normalized and filtered to valid application roles before setting `allRoles`.
  - If DB role read fails, preserve cached roles + metadata role but schedule explicit refetch retry (without blocking UI indefinitely).
  - Add targeted debug logs around:
    - profile query result
    - user_roles query result
    - final `allRoles`/`activeRole` chosen
- Ensure profile menus use unified resolved roles source:
  - File: `src/components/dashboard/ProfileMenu.tsx`
  - File: `src/components/profile/ProfileMenu.tsx`
  - Merge `allRoles + activeRole + metadata role`, dedupe, and normalize.
  - Keep fallback label behavior for unknown labels, but don’t drop valid roles.
- Expected result:
  - All assigned roles appear consistently in profile menu after refresh.
  - Active role remains stable after token refresh and tab switching.

4) Verify backend role and scope dependencies (read-first, then patch if needed)
- Validate current Supabase policies and role table behavior:
  - Confirm `public.user_roles` SELECT policy allows own-role reads.
  - Confirm no policy regression blocks `user_roles` fetch during bootstrap.
- Validate staff/entity scope function path:
  - `get_my_entity_scopes` is present; keep access-scope function bound to authenticated user client context.
- If any policy gap is found, create migration to minimally patch RLS (no broad `USING (true)`).
- Security constraints to keep:
  - Roles remain in `user_roles` table only.
  - No role trust from localStorage/sessionStorage alone.
  - Access checks remain server-backed and RLS-enforced.

5) Patient dashboard data visibility follow-up (empty state vs true loading)
- Ensure patient data hooks resolve loading even when tables return empty:
  - `src/hooks/useAppointments.ts`
  - `src/hooks/usePatientDashboard.ts`
- Confirm patient queries stay on `patient_all_appointments` with explicit `patient_id = user.id` filters.
- Distinguish “no data yet” from “still loading” in UI to avoid perceived loading loops.
- Expected result:
  - Patient dashboard renders empty-state cards when no records exist, not indefinite loaders.

6) Validation checklist after implementation
- Build/preview:
  - Dev server starts without Rollup optional module error.
  - CI workflow references secrets only.
- Auth/reload:
  - Sign in with each role type and reload on dashboard route.
  - Switch browser tab away/back; no stuck loading.
- Role UX:
  - Profile menu shows all assigned roles.
  - Role switch routes correctly to corresponding dashboard.
- Dashboard coverage:
  - Practice, doctor, patient, lab, pharmacy, imaging, finance dashboards all exit loading state.
- Security:
  - RLS policies still restrict PHI/facility data to appropriate users.
  - No privilege checks moved to unsafe client-only storage.

Technical implementation order (for fastest risk reduction)
1. `.npmrc` + workflow secret fix (restore reliable preview/build + security).
2. Pharmacy loading-loop guard fix (known deterministic bug).
3. Shared dashboard loading-guard pass (all role dashboards).
4. AuthContext role hydration hardening + profile menu role merge alignment.
5. Patient data empty/loading clarity.
6. End-to-end regression pass across role dashboards and reload scenarios.

Definition of done
- No build crash in preview.
- No dashboard remains in infinite loading after reload.
- Profile menu displays complete role set for multi-role users.
- Patient dashboard shows either real data or explicit empty state (not spinner lock).
- Security posture preserved (roles table + RLS + server-side authorization).
