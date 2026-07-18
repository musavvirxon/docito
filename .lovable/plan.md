
## MCP server for Docito (OAuth-protected)

Great — with OAuth 2.1 enabled on your Supabase project, I have everything I need. **No auth endpoints required from you**: `@lovable.dev/mcp-js` discovers them automatically from your Supabase issuer (`https://gswwpjdtgsxzcsnrxutu.supabase.co/auth/v1/.well-known/oauth-authorization-server`).

### On the `/.docito/oauth/consent` path
The consent-redirect path is **fixed by Supabase Auth** — it always redirects users to `/.lovable/oauth/consent?authorization_id=...` after they sign in during a client authorization. We can't rename that path; renaming it would break the redirect and no MCP client could complete OAuth. What we *can* do:
- Mount the React route at `/.lovable/oauth/consent` (required by Supabase).
- Additionally expose `/.docito/oauth/consent` as an alias that renders the same component, so anything we surface in our own UI/docs uses the docito-branded path.
- Everywhere else (favicon, connector metadata, published URLs) use **docito.app** — the MCP endpoint will be advertised from your Supabase functions host, but all app-facing links (consent screen branding, docs, published site) will use docito.app.

### What I'll build

1. **Install** `@lovable.dev/mcp-js` and `zod`.
2. **Vite plugin** — add `mcpPlugin()` to `vite.config.ts` (keeps existing plugins).
3. **MCP entry** `src/lib/mcp/index.ts` — `defineMcp` with `auth.oauth.issuer({ issuer: https://<ref>.supabase.co/auth/v1, acceptedAudiences: "authenticated" })`, using `import.meta.env.VITE_SUPABASE_PROJECT_ID` (kept import-safe: no top-level env reads or throws).
4. **Starter tools** under `src/lib/mcp/tools/` — each forwards the caller's token so RLS runs as that user:
   - `whoami` — returns the signed-in user's id/email.
   - `list_my_appointments` — the caller's own appointments (as patient or doctor).
   - `list_my_prescriptions` — the caller's own prescriptions.
   - `list_my_treatment_plans` — the caller's own treatment plans.
   All are read-only (`readOnlyHint: true`). Handlers derive `user_id` from `ctx.getUserId()` — never from tool input.
5. **Consent route** — new `src/pages/OAuthConsent.tsx` mounted at both `/.lovable/oauth/consent` (required by Supabase) and `/.docito/oauth/consent` (docito-branded alias) in `App.tsx`. Uses `supabase.auth.oauth.getAuthorizationDetails / approveAuthorization / denyAuthorization`. Docito-branded copy ("Connect {client} to your Docito account").
6. **Auth redirect plumbing** — update `src/pages/Auth.tsx` so password sign-in, signup `emailRedirectTo`, and social `signInWithOAuth.redirect_uri` all honor a `next=` param pointing back to the consent URL (validated as a same-origin relative path). Without this, connectors bounce to `/` after Google login.
7. **Favicon check** — verify `public/favicon.ico` exists (Docito already has branding assets); do not replace user's chosen favicon.
8. **Manifest + deploy** — run the manifest extractor, then deploy the auto-generated `supabase/functions/mcp` edge function.

### Files touched

- `package.json` (add deps)
- `vite.config.ts` (add `mcpPlugin()`)
- `src/lib/mcp/index.ts` (new)
- `src/lib/mcp/tools/whoami.ts`, `list-my-appointments.ts`, `list-my-prescriptions.ts`, `list-my-treatment-plans.ts` (new)
- `src/pages/OAuthConsent.tsx` (new)
- `src/App.tsx` (two consent routes)
- `src/pages/Auth.tsx` (honor `next=` on all sign-in paths)

### Endpoint (advertised to clients)

`https://gswwpjdtgsxzcsnrxutu.supabase.co/functions/v1/mcp` — this is the Supabase functions host and cannot be moved to docito.app (Supabase serves it). Users only ever see docito.app in the consent screen, favicon, and app UI.

### Supabase redirect allow-list

Please make sure your Supabase Auth "Redirect URLs" list includes:
- `https://docito.app/.lovable/oauth/consent`
- `https://docito.app/.docito/oauth/consent`
- `https://www.docito.app/.lovable/oauth/consent`
- `https://www.docito.app/.docito/oauth/consent`

If it doesn't, Google/social login will drop users on `/` after auth and connectors will silently fail. I'll remind you again after implementation.

Approve and I'll build it.
