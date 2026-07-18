import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Local typed wrapper — the supabase.auth.oauth namespace is in beta and its
// TypeScript surface may not be published in the version we track.
type AuthorizationDetails = {
  client?: { name?: string | null; logo_uri?: string | null; client_uri?: string | null } | null;
  scopes?: string[] | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

type OAuthAny = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
};

const getOAuth = (): OAuthAny | null => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oauth = (supabase.auth as any).oauth;
  return oauth ?? null;
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const oauth = getOAuth();
      if (!oauth) {
        setError(
          "OAuth 2.1 is not enabled on this Supabase project. Enable it in Supabase Auth settings to allow MCP clients to connect."
        );
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?returnTo=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    const oauth = getOAuth();
    if (!oauth) return;
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Could not load this authorization request</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading authorization request…
        </div>
      </main>
    );
  }

  const clientName = details.client?.name ?? "an app";

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connect {clientName} to your Docito account</CardTitle>
          <CardDescription>
            This lets {clientName} use Docito tools as you. It will only see data you can see in
            the app. You can revoke access at any time from your Docito settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button disabled={busy} onClick={() => decide(true)}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `Approve ${clientName}`}
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => decide(false)}>
            Deny
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
