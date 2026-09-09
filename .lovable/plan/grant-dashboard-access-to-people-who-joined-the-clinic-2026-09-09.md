# Grant dashboard access to people who joined the clinic

Add a "Grant access to a clinic member" block at the bottom of the Invite Staff card in the clinic admin Staff section. It lets an admin pick an existing person who already joined the clinic, choose their role, and give them access so they get the matching dashboard on next sign-in.

## What the admin will see

At the lowest part of the invite section:

- A dropdown listing people already attached to this clinic who don't yet have staff access: doctors whose profile points to this clinic, doctors with an approved join request, and existing practice staff records. Each option shows name, email, and how they joined (e.g. "Doctor - approved join request").
- A role dropdown (admin, manager, doctor, nurse, receptionist, billing, viewer), pre-filled from the person's existing role when known.
- A "Give access" button.
- After granting: success message, the person appears in Active Staff, and they disappear from the dropdown.
- Empty state text when everyone who joined already has access.

## What happens on grant

1. A staff record is created (or reactivated) for that person in this clinic with the chosen role and the permission checkboxes shown above.
2. The matching account role is recorded so the person lands on the right dashboard when they log in (clinic admin, staff, nurse, receptionist, billing, or doctor).
3. The action is written to the activity trail shown at the bottom of the section.

## Technical notes

- New security-definer function `public.grant_clinic_member_access(_practice_id uuid, _user_id uuid, _staff_role text)`, `search_path = public`, granted to `authenticated`. It first verifies the caller is an admin of `_practice_id` (via `get_admin_practice_ids`) and raises otherwise. It upserts `public.clinic_staff` (unique on practice_id + user_id, status `active`, boolean permission columns derived from the role) and inserts the mapped `app_role` into `public.user_roles` with `ON CONFLICT DO NOTHING`. Required because `user_roles` is writable only by super admins under current RLS.
- Role mapping: admin/manager -> `clinic_admin`, doctor -> `doctor`, nurse -> `nurse`, receptionist -> `receptionist`, billing -> `billing_manager`, viewer -> `clinic_staff`.
- `ClinicStaffManager.tsx`: new loader for candidates from `doctors` (practice_id / practice_location_id), `practice_join_requests` (status approved), and `practice_staff`, resolved against `profiles`, minus user_ids already present in `clinic_staff`. New state for selected member/role, submit handler calling the RPC, then `loadData(false)`.
- New i18n keys under `clinic:staffManager.grantAccess.*` for EN, RU and UZ.
