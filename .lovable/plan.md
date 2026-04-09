

# Unused Edge Functions: Analysis & Recommendation

## Summary

After cross-referencing all 100 edge functions against the frontend codebase (`supabase.functions.invoke(...)` calls), **21 functions have zero frontend references** and are not webhook/cron targets.

## Functions Safe to Delete (21)

| # | Function | What it does | Why it's not needed |
|---|----------|-------------|-------------------|
| 1 | `account-analytics` | User-level analytics snapshot | Replaced by `practice-analytics` and dashboard-level queries |
| 2 | `admin-bulk-actions` | Bulk approve/reject entities | Never wired to any UI; superadmin does this individually |
| 3 | `app-analytics` | App-wide analytics | Replaced by `practice-analytics` + `facility-analytics` |
| 4 | `appointment-actions` | Generic appointment CRUD | Replaced by `book-appointment`, `confirm-appointment`, `request-start-appointment` |
| 5 | `clinic-analytics` | Clinic-specific analytics | Replaced by `practice-analytics` (location-centric) |
| 6 | `confirm-appointment-request` | Confirm appointment requests | Replaced by `confirm-appointment` |
| 7 | `finance-recurring-cron` | Scheduled recurring finance | Duplicate of `finance-recurring-run` (manual trigger) |
| 8 | `generate-referral-pdf` | Generate referral PDF | Duplicate of `referral-generate-pdf` (which IS used) |
| 9 | `get_verification_checklist` | Fetch verification steps | Replaced by `verification-submit` (get_draft action) |
| 10 | `imaging-analytics` | Imaging center analytics | Replaced by `facility-analytics` |
| 11 | `imaging-dashboard` | Imaging dashboard data | Replaced by `entity-dashboard` |
| 12 | `invite-staff` | Send staff invitations | Replaced by `send-invitation-email` |
| 13 | `lab-analytics` | Lab center analytics | Replaced by `facility-analytics` |
| 14 | `lab-create-order` | Create lab orders | Replaced by direct DB inserts + `imaging-create-order` pattern |
| 15 | `payroll-run-generate` | Generate payroll runs | Never connected; payroll uses `finance-payroll-pay` |
| 16 | `pharmacy-analytics` | Pharmacy analytics | Replaced by `facility-analytics` |
| 17 | `referral-verify` | Verify referral codes | Never called; `document-verify` handles verification |
| 18 | `timezone-mapping-admin` | Admin timezone mappings | Never called; `timezone-detect` + `timezone-update` handle this |
| 19 | `verify-entity` | Verify an entity | Never called; `verification-admin` handles admin verification |
| 20 | `supabase` | Empty/scaffold folder | Not a real function |
| 21 | `_shared` | Shared utilities folder | Not a function (keep this - it's imported by other functions) |

**Correction**: `_shared` is a shared code directory, not a function. **20 functions** to delete.

## Functions That ARE Used (Keep)

All other ~80 functions are actively invoked from the frontend or serve as webhook/cron/infra endpoints (e.g., `billing-webhook`, `stripe-webhook`, `blog-sitemap`, `notify`, `send-sms`, `update-ratings`).

`prescription-generate-pdf` and `treatment-plan-generate-pdf` — both are called from `src/lib/api/` and should be kept.

## Implementation Plan

**Single step**: Delete the 20 unused edge function directories and use the Supabase delete tool to remove them from the deployed project.

Directories to remove:
```text
supabase/functions/account-analytics/
supabase/functions/admin-bulk-actions/
supabase/functions/app-analytics/
supabase/functions/appointment-actions/
supabase/functions/clinic-analytics/
supabase/functions/confirm-appointment-request/
supabase/functions/finance-recurring-cron/
supabase/functions/generate-referral-pdf/
supabase/functions/get_verification_checklist/
supabase/functions/imaging-analytics/
supabase/functions/imaging-dashboard/
supabase/functions/invite-staff/
supabase/functions/lab-analytics/
supabase/functions/lab-create-order/
supabase/functions/payroll-run-generate/
supabase/functions/pharmacy-analytics/
supabase/functions/referral-verify/
supabase/functions/supabase/
supabase/functions/timezone-mapping-admin/
supabase/functions/verify-entity/
```

This reduces the function count from ~100 to ~80, cutting deployment surface area and maintenance burden.

