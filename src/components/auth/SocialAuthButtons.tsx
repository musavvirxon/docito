import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Provider = "google" | "discord" | "facebook";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3 14.7 2 12 2 6.9 2 2.8 6.1 2.8 12S6.9 22 12 22c6.9 0 9.4-4.8 9.4-8.9 0-.6-.1-1.1-.2-1.5H12z"/>
    <path fill="#34A853" d="M3.9 7.3l3.2 2.3C8 7.9 9.9 6.8 12 6.8c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3 14.7 2 12 2 8.2 2 4.9 4.1 3.9 7.3z"/>
    <path fill="#FBBC05" d="M12 22c2.7 0 4.9-.9 6.5-2.4l-3.1-2.5c-.9.6-2 1-3.4 1-2.6 0-4.9-1.8-5.7-4.2L3 16.4C4.6 19.7 8 22 12 22z"/>
    <path fill="#4285F4" d="M21.4 12c0-.6-.1-1.1-.2-1.5H12v3.9h5.5c-.3 1.4-1.2 2.5-2.5 3.3l3.1 2.5c1.8-1.7 3.3-4.2 3.3-8.2z"/>
  </svg>
);

const DiscordIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
    <path fill="#5865F2" d="M20.317 4.369A19.79 19.79 0 0016.558 3c-.2.36-.43.85-.59 1.24a18.27 18.27 0 00-5.94 0C9.87 3.85 9.63 3.36 9.44 3a19.74 19.74 0 00-3.76 1.37C1.99 9.6 1.03 14.69 1.5 19.7a19.94 19.94 0 006.03 3.06c.49-.67.92-1.38 1.29-2.13-.71-.27-1.39-.6-2.03-.99.17-.13.34-.26.5-.4a14.23 14.23 0 0012.42 0c.16.14.33.27.5.4-.65.39-1.33.72-2.04.99.37.75.8 1.46 1.29 2.13a19.9 19.9 0 006.03-3.06c.55-5.82-.93-10.86-3.17-15.33zM8.52 16.33c-1.18 0-2.15-1.09-2.15-2.42s.95-2.43 2.15-2.43c1.21 0 2.17 1.1 2.15 2.43 0 1.33-.95 2.42-2.15 2.42zm6.96 0c-1.18 0-2.15-1.09-2.15-2.42s.95-2.43 2.15-2.43c1.21 0 2.17 1.1 2.15 2.43 0 1.33-.94 2.42-2.15 2.42z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
    <path fill="#1877F2" d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.5-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0022 12z"/>
  </svg>
);

const providers: { id: Provider; label: string; Icon: React.FC }[] = [
  { id: "google", label: "Google", Icon: GoogleIcon },
  { id: "discord", label: "Discord", Icon: DiscordIcon },
  { id: "facebook", label: "Facebook", Icon: FacebookIcon },
];

export const SocialAuthButtons = ({ returnTo }: { returnTo?: string | null }) => {
  const { t } = useTranslation("auth");
  const { lang } = useParams<{ lang?: string }>();
  const { toast } = useToast();
  const [pending, setPending] = useState<Provider | null>(null);

  const handleOAuth = async (provider: Provider) => {
    setPending(provider);
    try {
      const base = window.location.origin;
      const langPrefix = lang ? `/${lang}` : "";
      const redirectTo =
        returnTo && returnTo.startsWith("/")
          ? `${base}${returnTo}`
          : `${base}${langPrefix}/dashboard`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: t("auth.oauth.failedTitle", "Sign in failed"),
        description: error?.message ?? t("auth.oauth.failedDesc", "Could not start sign in."),
        variant: "destructive",
      });
      setPending(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            {t("auth.oauth.continueWith", "Or continue with")}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {providers.map(({ id, label, Icon }) => (
          <Button
            key={id}
            type="button"
            variant="outline"
            className="w-full h-10 gap-2"
            disabled={pending !== null}
            onClick={() => handleOAuth(id)}
            aria-label={t("auth.oauth.continueWithProvider", { provider: label, defaultValue: `Continue with ${label}` })}
          >
            {pending === id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon />}
            <span className="hidden sm:inline text-sm">{label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default SocialAuthButtons;
