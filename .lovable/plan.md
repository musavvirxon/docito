## Plan to fix referral creation

1. **Fix the broken referral list query**
   - Remove the invalid `patient:patient_id(...)` embed from `useReferrals` because the live database has no foreign key from `referrals.patient_id` to the patient/profile table.
   - Keep fetching real referral rows and let the UI use the existing referral fields (`patient_name`, `patient_id`, etc.) instead of crashing the section query with `PGRST200`.

2. **Fix manual provider referral submission**
   - Update `createReferral` so a manually entered provider name is accepted for a specific referral.
   - Store manual-provider referrals with `receiver_entity_id = null`, `receiver_name = <typed name>`, and `referral_scope = 'specific'`.
   - Do not require `receiver_entity_id` when `receiver_name` is present.

3. **Improve submit feedback**
   - In `CreateReferralDialog`, show a toast when form validation blocks submission, especially when the reason is shorter than 10 characters.
   - Keep the existing scroll-to-first-error behavior so hidden lower fields become visible.

4. **Prevent false success after send failure**
   - In `ReferralsSection`, only refresh after both create and send succeed, and keep the dialog open if creation fails.
   - Avoid closing the dialog when the parent submit action returns an error.

## Technical notes

- The main confirmed runtime issue is the Supabase request failing with: `Could not find a relationship between 'referrals' and 'patient_id' in the schema cache`.
- A second blocking issue is frontend business logic still requiring `receiver_entity_id` even though the dialog now supports manual provider names.
- No new database table is needed for this fix; this is a frontend/query-flow correction.