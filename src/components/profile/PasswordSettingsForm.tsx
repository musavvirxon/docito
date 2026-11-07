import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { passwordUpdateAttributes, requiresCurrentPassword } from "@/lib/authPassword";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordSettingsForm() {
  const { user } = useAuth();
  const { t } = useTranslation("auth");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const needsCurrent = requiresCurrentPassword(user);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !user) return;
    if (password.length < 8) return toast.error(t("auth.passwordSettings.minLength"));
    if (password !== confirm) return toast.error(t("auth.reset.mismatch"));
    if (needsCurrent && !currentPassword) return toast.error(t("auth.passwordSettings.currentRequired"));
    setSaving(true);
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!data.user || data.user.id !== user.id) throw new Error(t("auth.passwordSettings.signInAgain"));
      const { error } = await supabase.auth.updateUser(passwordUpdateAttributes(data.user, password, currentPassword));
      if (error) throw error;
      setCurrentPassword("");
      setPassword("");
      setConfirm("");
      toast.success(t("auth.reset.success"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.passwordSettings.failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">{t(needsCurrent ? "auth.passwordSettings.changeDescription" : "auth.passwordSettings.setDescription")}</p>
      {needsCurrent && <div className="space-y-2">
        <Label htmlFor="account-current-password">{t("auth.passwordSettings.currentPassword")}</Label>
        <Input id="account-current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required disabled={saving} />
      </div>}
      <div className="space-y-2">
        <Label htmlFor="account-new-password">{t("auth.reset.newPassword")}</Label>
        <Input id="account-new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required disabled={saving} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="account-confirm-password">{t("auth.reset.confirmPassword")}</Label>
        <Input id="account-confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} required disabled={saving} />
      </div>
      <Button type="submit" disabled={saving || !user}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t(needsCurrent ? "auth.passwordSettings.update" : "auth.passwordSettings.set")}
      </Button>
    </form>
  );
}