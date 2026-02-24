# Fix Plan: Dashboard Reload, Facility Dashboards, Translations, Public Pages, and Lemon Squeezy

## Issue Summary

Five issues to address:

1. Dashboard page fails to reload when signed in (shows "profile could not be loaded")
2. Facility dashboards (labs, clinics, imaging, pharmacies) don't load analytics
3. Translation keys missing for dashboard, top nav, and footer
4. Public pages error on first load (works after reload)
5. Connect Lemon Squeezy subscription checkout for patient plus monthly plan

---

## 1. Fix Dashboard Reload Failure

**Root cause**: On page reload, `AuthContext.runBootstrap` marks `bootstrapped=true` and `loading=false` immediately (for instant redirects), but the `profile` object is still `null` at that point. `useDoctorIntegration` starts its doctor ID resolution but depends on `activeRole === "doctor"` being set. During the race window between bootstrap completing and profile loading, the hook can resolve with no `doctor_id`, causing the "unable to load" error screen.

**Fix in `src/hooks/useDoctorIntegration.ts**`:

- Don't immediately show the error state when `doctorProfile` is null. Instead, wait for the profile to arrive from AuthContext.
- Add `profile` to the resolution dependencies so when the profile loads in the background, doctor ID resolution re-triggers.
- In `DoctorDashboard.tsx`, check both `loading` from the hook AND `authLoading` from `useAuth()` before showing the error card. If either is still in progress, keep showing the spinner.

**Fix in `src/pages/DoctorDashboard.tsx**`:

- Import `loading as authLoading` from `useAuth()`.
- Before rendering the "no doctor profile" error card, also check if `authLoading` is true and show the loading spinner instead.

## 2. Fix Facility Dashboard Loading

**Root cause**: Same auth timing issue. Facility dashboards gate on `authLoading` from `useAuth()`, but `authLoading` becomes `false` before `profile` and `user` are fully resolved on reload. The `user` object arrives slightly later from `onAuthStateChange`.

**Fix in `src/contexts/AuthContext.tsx**`:

- Ensure `loading` doesn't become `false` until the initial `onAuthStateChange` event has been processed. Currently the safety timeout forces it to false after 5s, but the issue is that `runBootstrap` sets `loading=false` and `bootstrapped=true` immediately when a session exists. This is good for redirect speed but means downstream dashboards think auth is done when `user` may not be set yet in their render cycle.
- The actual fix: ensure the `user` state is set BEFORE `loading` becomes `false`. In `runBootstrap`, move `setUser(nextSession.user)` and `setSession(nextSession)` before the early `setLoading(false)` call -- this is already the case. The real issue is that facility dashboards check `user` which is set, but they start fetching immediately and the Supabase client may not have the session token ready yet.
- Add a small guard: in facility dashboard pages, also check `!user` during the loading state to prevent premature "no entity found" rendering.

**Fix in facility dashboard pages** (`LabDashboardPage.tsx`, `PharmacyDashboardPage.tsx`, `ImagingDashboardPage.tsx`):

- Change the loading condition from `authLoading || loadingCenter` to `authLoading || loadingCenter || !user` so we don't prematurely render the "no entity found" state while auth is still resolving.

## 3. Fix All Translation Issues

**Missing translations in `common.json**`: The `PremiumTopNav` uses `t("topNav.links.doctors")`, `t("topNav.actions.signIn")`, etc. from the `common` namespace, but `common.json` has no `topNav` section. The component already has `defaultValue` fallbacks so it shows text, but the translations aren't properly structured.

**Add to `public/locales/en/common.json**`:

```json
"topNav": {
  "links": {
    "doctors": "Doctors",
    "clinics": "Clinics",
    "labs": "Labs",
    "pharmacies": "Pharmacies",
    "imaging": "Imaging",
    "hospitals": "Hospitals",
    "pricing": "Pricing"
  },
  "actions": {
    "signIn": "Sign In",
    "register": "Register"
  },
  "a11y": {
    "closeMenu": "Close menu",
    "openMenu": "Open menu"
  }
}
```

**Dashboard translations**: Review `dashboard.json` for any remaining missing keys. The main translation file already has comprehensive entries. Add any missing footer-related keys in `home.json` (the footer section `home:footer.links.*` needs `findDoctors`, `searchDoctors`, `specialties`, `howItWorks`, `helpCenter`, `hipaa` keys).

**Add missing footer link keys to `public/locales/en/home.json**` under `footer.links`:

```json
"findDoctors": "Find Doctors",
"searchDoctors": "Search Doctors",
"specialties": "Specialties",
"howItWorks": "How It Works",
"helpCenter": "Help Center",
"contact": "Contact",
"faqs": "FAQs",
"support": "Support",
"hipaa": "HIPAA"
```

## 4. Fix Public Pages First-Load Error

**Root cause**: Public pages are lazy-loaded with `React.lazy()`. On first load, the `Suspense` boundary shows `PageLoader` while the chunk downloads. `PremiumTopNav` (also lazy-loaded in `PublicLayout`) calls `useAuth()`. If the `AuthProvider` is still in its initial state (before `onAuthStateChange` fires), the `user` is null which is fine -- but the error likely comes from a race condition where the lazy-loaded page component throws during its initial render because i18n namespaces haven't loaded yet.

**Fix in `src/layouts/PublicLayout.tsx**`:

- Wrap the `<Outlet />` in its own error boundary so that if a lazy-loaded page throws on first render, it's caught gracefully and the user can retry (which works because the chunk is now cached).

**Fix in `src/App.tsx**`:

- Ensure the `Suspense` fallback is robust. The current `PageLoader` is fine. The issue may be that the `RouteErrorBoundary` is a class component that wraps `Routes` but doesn't reset on navigation. Add a `key` based on location to force error boundary reset on route change.

## 5. Connect Lemon Squeezy Subscription

**Approach**: Update the pricing matrix so the "Patient Plus Monthly" plan's CTA button links to the Lemon Squeezy checkout URL instead of `/auth`.

**Changes in `src/components/pricing/PricingMatrix.tsx**`:

- Define a checkout URL map for plans that have Lemon Squeezy links.
- For the patient + plus + monthly combination, use the Lemon Squeezy checkout URL: `https://artsydevelopers.lemonsqueezy.com/checkout/buy/4b62b538-2154-48e9-b97e-d5e9aefd13c5`
- For other plans, keep linking to `/auth` (sign up first).
- Also load the Lemon Squeezy JS script for the overlay embed experience.

&nbsp;

6. Fix all dashboard.json files related to all languages.

---

## Technical Details: Files to Modify


| File                                           | Change                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| `src/hooks/useDoctorIntegration.ts`            | Add profile to resolution deps; prevent premature "no doctor" state |
| `src/pages/DoctorDashboard.tsx`                | Gate error card on both hook loading AND authLoading                |
| `src/pages/lab/LabDashboardPage.tsx`           | Add `!user` to loading guard                                        |
| `src/pages/pharmacy/PharmacyDashboardPage.tsx` | Add `!user` to loading guard                                        |
| `src/pages/imaging/ImagingDashboardPage.tsx`   | Check imaging page loading guard similarly                          |
| `public/locales/en/common.json`                | Add `topNav` section                                                |
| `public/locales/en/home.json`                  | Add missing `footer.links.*` keys                                   |
| `src/layouts/PublicLayout.tsx`                 | Add error boundary around Outlet                                    |
| `src/components/pricing/PricingMatrix.tsx`     | Connect Lemon Squeezy checkout for patient plus monthly             |
