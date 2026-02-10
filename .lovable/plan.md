

# Homepage Redesign, Auth Fix, and Security Hardening

This is a comprehensive plan covering the homepage improvements, authentication fixes, and security hardening you requested.

---

## Part 1: Premium Top Nav Fixes

**Logo too small**: Increase the logo height from `h-7` (28px) to `h-9` (36px) in `PremiumTopNav.tsx`.

**Account text not visible**: The `ProfileMenu` button shows `profile?.full_name || "Account"` -- ensure the text uses `text-foreground` for visibility in both themes. Increase font size from `text-xs` to `text-sm`.

**Cannot sign out**: The sign out functionality exists in `ProfileMenu.tsx` (line 137). The issue is likely that the `ProfileMenu` dropdown trigger button text is invisible. Fixing the text color/contrast will make the menu accessible, allowing sign out.

---

## Part 2: Hero Section Adjustments

**Remove excess space above hero text**: Reduce `pt-20` and `py-16 lg:py-20` padding in `PremiumHero.tsx` to `pt-4` and `py-8 lg:py-10` to tighten the gap between nav and hero content.

**Move 3D globe slightly higher**: Adjust the globe container's vertical positioning by adding negative top margin or reducing top padding.

**Add "For Imaging", "For Pharmacy", "For Lab" cards**: Expand the 2-column grid (currently "For patients" and "For clinics & teams") to include 3 more cards: "For imaging centers", "For pharmacies", and "For laboratories". Use a responsive grid layout (e.g., `grid-cols-2 lg:grid-cols-3` with 5 cards).

**Make 3D globe more beautiful**: Enhance `HeroOrb3D.tsx`:
- Increase atmosphere glow intensity (opacity from 0.1 to 0.2)
- Add a subtle animated star field behind the globe
- Improve continent colors with richer gradients
- Add city light dots on the dark side of the globe
- Increase particle count from 100 to 200 for a denser holographic effect

---

## Part 3: Search Fixes

**Search not working / trending buttons not working**: The search calls the `homepage_unified_search` RPC. The trending button handler `handleTrendingClick` calls `search(term, ...)`. The issue is likely:
1. The RPC may not exist or may return errors -- need to verify
2. The `onKeyPress` is deprecated; switch to `onKeyDown`
3. Add error boundary around search results

Will verify the RPC exists and add proper error handling with user feedback.

---

## Part 4: Specialties Page

**Not all specialties visible**: The `SpecialtiesCarousel.tsx` has 18 specialties in a horizontally scrolling carousel. The auto-scroll may hide some. Add a "View All" button linking to `/specialties` and ensure the carousel is wide enough. Also add more specialties: Nephrology, Gynecology, Obstetrics, Allergy/Immunology, Anesthesiology, and Radiology.

---

## Part 5: Diagnostics & Pharmacy Section Alignment

**Align sections, buttons, and texts**: In `DiagnosticsSection.tsx`, the 3 cards (Laboratory Testing, Medical Imaging, Pharmacy Services) need consistent alignment:
- Set fixed height for description area using `min-h-[80px]`
- Ensure buttons are pushed to the bottom using `flex flex-col h-full` and `mt-auto`
- Standardize icon container sizes
- Align feature list heights with `min-h-[120px]`

---

## Part 6: Section Reordering

**Remove "Healthcare in 4 Simple Steps"**: Remove the `BookingSteps` lazy import and its `<LazySection>` from `PremiumHome.tsx`.

**Move FAQ to bottom**: Reorder sections in `PremiumHome.tsx` so FAQ appears just before `FinalCTA`.

**Move Mobile App section above FAQ**: Place `MobileAppShowcase` just before FAQ at the bottom.

New section order in `PremiumHome.tsx`:
1. PremiumHero
2. SmartSearch
3. ProviderCards
4. SpecialtiesCarousel
5. DiagnosticsSection
6. CapabilitiesGrid (For CTOs)
7. PlatformPillars
8. FacilityAutomationSection
9. TeamCollaboration
10. InsuranceProviders
11. GlobalTrust
12. MobileAppShowcase
13. FAQ
14. FinalCTA
15. ScrollToTop

---

## Part 7: "For CTOs and Operators" Section

**Better illustration and animation**: Enhance `CapabilitiesGrid.tsx`:
- Add a subtle animated SVG illustration (workflow diagram with animated data flow lines)
- Add staggered card entrance animations with hover 3D tilt effects
- Add gradient borders on hover
- Include an animated "system architecture" diagram as a visual centerpiece

---

## Part 8: Insurance Partners Section

**More beautiful, understandable, clear, organized**: Redesign `InsuranceProviders.tsx`:
- Replace colored initial squares with a clean, professional card layout
- Add a 3-step flow: "1. Select provider -> 2. Instant verification -> 3. Direct billing"
- Organize into a clear grid with proper labels
- Add a "Works with 100+ insurance providers worldwide" headline
- Include a "How Insurance Works on Docito" visual flow
- Replace hardcoded US-only providers with a global message: "Compatible with insurance providers worldwide"

---

## Part 9: Global Trust / Launching Worldwide Section

**Replace flags/continents with global persuasion**: Redesign `GlobalTrust.tsx`:
- Remove country flags and continent names
- Replace with persuasive global messaging: "One platform. Every country. Any language."
- Add key global features: Multi-language support, Multi-currency, Regional compliance, Any timezone
- Include a clean world map SVG illustration (no flags)
- Add trust metrics: "Available in X languages", "Supports X currencies"

---

## Part 10: Auth Page Fix

**Auth page not working**: The Auth page component exists and is routed correctly. Issues to investigate and fix:
- Verify `AuthProvider` wraps the auth route (it does via `PublicLayout`)
- Check that `signIn` and `signUp` functions in `AuthContext` work properly
- Ensure the `emailRedirectTo` is set correctly in signUp
- Add proper error display (toast messages) for auth failures
- Test that the redirect after login works correctly

---

## Part 11: Security Hardening

Based on the security scan, fix these critical issues:

1. **profiles table public exposure** (CRITICAL): Add RLS policies so users can only read/update their own profile, with exceptions for doctors viewing patient profiles in their care.

2. **doctor_patients table exposure** (CRITICAL): Add strict RLS so only the assigned doctor and patient can access records.

3. **test_orders table exposure** (CRITICAL): Ensure only ordering doctor, assigned lab staff, and patient can view.

4. **prescriptions table exposure** (CRITICAL): Restrict to prescribing doctor, assigned pharmacy staff, and patient.

5. **notification content exposure** (WARN): Ensure notification RLS restricts to recipients only.

---

## Technical Details

### Files to modify:
- `src/components/home/premium/PremiumTopNav.tsx` -- logo size, text visibility
- `src/components/home/premium/PremiumHero.tsx` -- spacing, audience cards, globe position
- `src/components/home/premium/HeroOrb3D.tsx` -- visual enhancements
- `src/components/home/premium/SmartSearch.tsx` -- search fix (onKeyDown)
- `src/components/home/premium/SpecialtiesCarousel.tsx` -- more specialties, View All
- `src/components/home/premium/DiagnosticsSection.tsx` -- alignment fixes
- `src/components/home/premium/CapabilitiesGrid.tsx` -- better animations/illustration
- `src/components/home/premium/InsuranceProviders.tsx` -- full redesign
- `src/components/home/premium/GlobalTrust.tsx` -- replace flags with global messaging
- `src/pages/PremiumHome.tsx` -- section reordering, remove BookingSteps
- `src/components/dashboard/ProfileMenu.tsx` -- text visibility fix
- `src/pages/Auth.tsx` -- error handling, redirect fix
- `src/contexts/AuthContext.tsx` -- auth flow verification
- New SQL migration for RLS policies on profiles, doctor_patients, test_orders, prescriptions, and notifications

### Dependencies:
- No new dependencies required
- All changes use existing libraries (framer-motion, lucide-react, Three.js)

