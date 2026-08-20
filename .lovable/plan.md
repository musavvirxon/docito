# Uzbekistan-only pricing on /pricing

Visitors detected in Uzbekistan see a simple two-card pricing block instead of the role/plan matrix. Everyone else keeps the current matrix, unchanged.

## What the UZ visitor sees

Two cards, side by side:

1. **Subscription** — 100,000 UZS per user / month
2. **One-time purchase** — $1,200 (single payment, lifetime licence)

Each card keeps the existing Apple-style card styling (border, blur, badge, feature checkmarks, CTA button). The "Included in all plans" core list stays above them. The role toggle and monthly/yearly toggle are hidden for UZ visitors, since neither applies.

## Detection

New hook `useGeoCountry`:
- Calls a free IP geolocation endpoint (ipapi.co / ipwho.is) once, caches the result in `localStorage` for 24h.
- Fallbacks if the lookup fails or is blocked: browser timezone `Asia/Tashkent`, then UI language `uz`.
- Returns `{ country, isUzbekistan, loading }`. While loading, the default (global) matrix renders — no layout flash of the wrong prices.
- Optional manual override via `?country=UZ` in the URL for testing.

## Technical notes

- New file `src/hooks/useGeoCountry.ts`.
- New file `src/components/pricing/UzbekistanPricing.tsx` — the two-card block, styled to match `PricingMatrix`.
- `src/pages/Pricing.tsx` renders `UzbekistanPricing` when `isUzbekistan`, else the existing `PricingMatrix`. No changes to `PricingMatrix` itself.
- Prices are constants in the new component (placeholders like the current matrix; no Stripe wiring in this change).
- Strings go through i18n in the `pricing_matrix` namespace under a new `uz` section, with keys added for en / ru / uz locale files (other locales fall back to English).
- UZS amount formatted with `Intl.NumberFormat('uz-UZ')` → "100 000 UZS".
