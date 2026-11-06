# One account, any sign-in method

Goal: the same email works with password, Google, Discord and Facebook, whichever way the user first signed up.

## What changes for users

1. **Set a password after social sign-up** — Profile and Settings show "Set password" (no current password asked) when the account has no password yet; otherwise the normal "Change password" form (with current password).
2. **Forgot password on the sign-in page** — a "Forgot password?" link sends a reset email. This also lets social-only users create a password without signing in first.
3. **New reset page** (`/reset-password`, public) — user enters a new password from the email link, then lands in their dashboard.
4. **Connected sign-in methods** — Profile shows which methods are linked (Email, Google, Discord, Facebook) with "Connect" buttons, so an email user can attach Google etc.
5. **Clear message on wrong method** — if someone tries a password on a social-only account, the error suggests "Sign in with Google" or "Forgot password?" instead of a generic failure.

## Technical details

- Detect password presence via `user.identities` (has `provider === 'email'`) / `app_metadata.providers`.
- Social-only set-password: `supabase.auth.updateUser({ password })`; signed-in change: `updateUser({ password, current_password })`. Shared helper in `src/lib/authPassword.ts` with unit test (social-only => no current password required).
- `resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })`; route added outside auth guards, handles `type=recovery`.
- Linking: `supabase.auth.linkIdentity({ provider })` for Connect buttons.
- Supabase auto-links same verified email across providers. Your Supabase project is self-managed, so in its dashboard you must keep: email confirmations ON, "Manual linking" enabled (Auth > Providers) for Connect buttons, and `/reset-password` on the redirect URL allow-list for docito.app. I can't change those from here.
- All new text via i18n in EN/RU/UZ.
