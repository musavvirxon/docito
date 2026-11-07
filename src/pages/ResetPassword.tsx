import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearPasswordRecovery, isPasswordRecoveryUser } from "@/lib/passwordRecovery";

export default function ResetPassword() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const validate = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (active) setReady(!error && isPasswordRecoveryUser(data.user?.id));
    };
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "INITIAL_SESSION" || event === "SIGNED_OUT") {
        // Do not await an Auth call inside the SDK callback.
        setTimeout(() => { if (active) void validate(); }, 0);
      }
    });
    void validate();
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || saving) return;
    if (password.length < 6) return toast.error(t("auth.reset.minLength", "Password must be at least 6 characters."));
    if (password !== confirm) return toast.error(t("auth.reset.mismatch", "Passwords do not match."));
    setSaving(true);
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !isPasswordRecoveryUser(data.user?.id)) {
        setReady(false);
        return toast.error(t("auth.reset.invalid"));
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return toast.error(error.message);
      clearPasswordRecovery();
      toast.success(t("auth.reset.success"));
      navigate("/dashboard", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.passwordSettings.failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("auth.reset.title", "Set a new password")}</CardTitle>
          <CardDescription>{t("auth.reset.description", "Choose a password to sign in with your email.")}</CardDescription>
        </CardHeader>
        <CardContent>
          {!ready ? (
            <p className="text-sm text-muted-foreground">{t("auth.reset.invalid", "Open this page from the link in your password reset email.")}</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{t("auth.reset.newPassword", "New password")}</Label>
                <Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t("auth.reset.confirmPassword", "Confirm password")}</Label>
                <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("auth.reset.save", "Save password")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
