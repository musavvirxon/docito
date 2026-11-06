import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { linkedProviders, SOCIAL_PROVIDERS, type SocialProvider, type UserLike } from "@/lib/authPassword";

const LABELS: Record<string, string> = { email: "Email", google: "Google", discord: "Discord", facebook: "Facebook" };

export function SignInMethodsCard({ user }: { user: UserLike }) {
  const { t } = useTranslation("auth");
  const linked = linkedProviders(user);

  const connect = async (provider: SocialProvider) => {
    const { error } = await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo: `${window.location.origin}/profile` },
    });
    if (error) toast.error(t("auth.methods.linkFailed", "Could not connect this method. Make sure account linking is enabled.") + " " + error.message);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("auth.methods.title", "Sign-in methods")}</CardTitle>
        <CardDescription>{t("auth.methods.description", "Use any connected method to sign in to the same account.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {(["email", ...SOCIAL_PROVIDERS] as string[]).map((p) => (
          <div key={p} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <span className="text-sm font-medium text-foreground">{LABELS[p]}</span>
            {linked.includes(p) ? (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Check className="h-4 w-4" /> {t("auth.methods.connected", "Connected")}
              </span>
            ) : p === "email" ? (
              <span className="text-sm text-muted-foreground">{t("auth.methods.setPasswordBelow", "Set a password below")}</span>
            ) : (
              <Button size="sm" variant="outline" onClick={() => connect(p as SocialProvider)}>
                {t("auth.methods.connect", "Connect")}
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
