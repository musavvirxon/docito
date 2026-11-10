# Fix clinic staff invitations + notify invitee + role in switcher

## Cause of the error
The clinic invite form saves the invitation as type "clinic", but the security rule only lets admins create invitations of type "practice". So every clinic invite is blocked. The pharmacy, lab and imaging forms will be checked for the same mismatch.

## What will change
1. **Invites save correctly** — clinic invites use the type the rule expects, and the rule also accepts "clinic" so older data keeps working. Chosen permissions are saved with the invite.
2. **Email to invitee** — after the invite is saved, the existing invitation email is sent with an "Accept invitation" link (role, clinic name, expiry). If email fails, the invite still exists and the admin sees a "Resend" option.
3. **In-app notification** — if the email belongs to an existing user, they get a notification in the bell: "<Clinic> invited you as <role>" with Accept / Decline.
4. **Accepting grants the role** — accepting adds the user to clinic staff with the chosen role and permissions and records the role, so it immediately appears in the role switch dropdown in the profile menu and opens the matching dashboard.
5. Texts translated in EN / RU / UZ.

## Technical details
- Migration: replace INSERT/UPDATE/DELETE/SELECT policies on `staff_invitations` to treat `entity_type IN ('practice','clinic')` via `practices.admin_id = auth.uid()` OR active clinic_admin in `clinic_staff`; set `invited_by = auth.uid()` default; add `permissions jsonb` if missing.
- Trigger (SECURITY DEFINER, pinned search_path) on insert: look up profile by email, set `invited_user_id`, insert row into `notifications` with link `/accept-invite?token=...`.
- `ClinicStaffManager.tsx` (+ pharmacy/lab/imaging managers): correct entity_type, pass permissions, then invoke `send-invitation-email`.
- `accept_staff_invitation` RPC: verify it upserts `clinic_staff` and inserts into `user_roles`; extend if not.
- `ProfileMenu.tsx`: refresh roles after acceptance (listen to user_roles change / refetch on notification accept).
- Verify by inviting a test email from a clinic admin session.
