
## Move MCP consent redirect URLs to docito.app and remove all `.lovable` links

The redirect allow-list lives in **Supabase Auth → URL Configuration → Redirect URLs**, not in the codebase. This change is a dashboard edit on your side.

### What to change in Supabase (once, ~1 minute)

Open Supabase dashboard → **Authentication → URL Configuration → Redirect URLs**.

**Remove every entry that contains `.lovable` or `docito.lovable.app`:**
- `https://docito.lovable.app/.lovable/oauth/consent`
- `https://docito.lovable.app/.docito/oauth/consent`
- `https://docito.app/.lovable/oauth/consent` (path contains `.lovable`)
- `https://www.docito.app/.lovable/oauth/consent` (path contains `.lovable`)
- any other entry with `.lovable` in host or path

**Keep only the docito-branded entries:**
- `https://docito.app/.docito/oauth/consent`
- `https://www.docito.app/.docito/oauth/consent`

### One important caveat about removing the `/.lovable/oauth/consent` path

Supabase Auth, after the user signs in during an OAuth authorization, **redirects to `/.lovable/oauth/consent?authorization_id=...` by default** — that path is baked into Supabase's OAuth server and cannot be renamed. If your Supabase project version still hard-codes that path:

- Removing `/.lovable/oauth/consent` from the allow-list will break MCP sign-in (the browser will land on a "redirect_uri not allowed" error after Google/email login).
- The safe way to fully drop `.lovable` from user-visible URLs is to keep `/.lovable/oauth/consent` only on the **apex domain** (`https://docito.app/.lovable/oauth/consent`) so Supabase's internal hop still resolves, while every link *we* publish and every branded URL points at `/.docito/oauth/consent`.

If your Supabase project exposes a "Consent redirect path" override in the OAuth 2.1 settings, set it to `/.docito/oauth/consent` and then you can safely remove all `.lovable` entries. If it does not, keep exactly this minimum:

**Minimum safe allow-list:**
- `https://docito.app/.docito/oauth/consent` (branded, user-facing)
- `https://www.docito.app/.docito/oauth/consent` (branded, user-facing)
- `https://docito.app/.lovable/oauth/consent` (only if Supabase still forces this path — remove if the override exists)

### Why no code change is needed

- Both consent routes are already mounted in `src/App.tsx`, so whichever path Supabase redirects to will render correctly.
- `OAuthConsent.tsx` uses relative paths — no `.lovable.app` host is referenced in code.
- The MCP endpoint itself stays at `https://gswwpjdtgsxzcsnrxutu.supabase.co/functions/v1/mcp` (Supabase Functions host, not movable), but users only see docito.app in the browser.

### Verification after you save the allow-list

1. Start a fresh MCP connection from ChatGPT / Claude / Cursor.
2. Sign in — confirm the browser lands on `https://docito.app/.docito/oauth/consent?authorization_id=...`.
3. Approve — the client should receive the token; `whoami` returns your user.

If step 2 errors with "redirect_uri not allowed", Supabase forced `/.lovable/oauth/consent` — add `https://docito.app/.lovable/oauth/consent` back and retry. That single entry is the only `.lovable` string that may need to remain, and only because Supabase's server hard-codes it.

### Nothing to implement in code

Approve this plan and update the allow-list; ping me once saved and I'll run the verification. If sign-in fails, I'll help you locate the Supabase OAuth "consent redirect path" override so we can drop the last `.lovable` entry too.
