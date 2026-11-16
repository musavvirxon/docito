# Free trial, reminders and subscription lock

Applies to doctors and facilities (clinics, labs, imaging, pharmacies) and their admins. Patients are never affected. Super admins are never locked.

## Rules
- Trial starts at sign-up. Current users who signed up more than a month ago get a 14-day grace period starting today.
- Day 14 to day 30 of the trial: a reminder banner on every dashboard ("X days left - choose a plan"), plus one in-app notification and email at day 14.
- After day 30 with no active subscription: any dashboard visit redirects to the Pricing page with a "Your free trial has ended" message.
- Paid monthly subscribers whose payment is due (past due or expired): any dashboard visit redirects to the Billing/payment page to pay.
- Staff who joined a clinic use the clinic's subscription status, not their own.
- Pricing, Billing, profile/sign-out and public pages always stay reachable.

## Technical details
- Migration: add `trial_ends_at` to the account record (default sign-up + 30 days; backfill old users to now + 14 days). Add a SECURITY DEFINER RPC `get_my_access_status()` returning `active | trial | trial_reminder | trial_expired | payment_due` and days left, reading `user_subscriptions`/`billing_subscriptions` and the clinic owner's subscription for staff.
- `useAccessStatus` hook + `SubscriptionGate` wrapper around dashboard routes (redirect to `/pricing` or `/billing`), and `TrialReminderBanner` in the dashboard shell.
- Daily scheduled job creates the day-14 notification once per user.
- EN/RU/UZ translations for all new text.
- Tests for the status rules (day 13, 14, 30, 31, past due, patient, staff).
