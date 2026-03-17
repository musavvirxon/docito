import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { getBrowserTimeZone } from "@/lib/timezone";

type Settings = {
  theme?: "system" | "light" | "dark";
  reduce_motion?: boolean;
  timezone?: string;
  language?: string;
};

const timezones = [
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tashkent",
  "Asia/Dubai",
  "Asia/Tokyo",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
];

const languages = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  { code: "uz", label: "O'zbek" },
  { code: "ar", label: "العربية" },
  { code: "tr", label: "Türkçe" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "zh", label: "中文" },
  { code: "pt", label: "Português" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
];

export default function AccountSettingsSection() {
  const { user, profile, updateProfile } = useAuth();
  const { t } = useTranslation("profileMenu");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState<Settings>({
    theme: "system",
    reduce_motion: false,
    timezone: profile?.timezone || "UTC",
    language: profile?.language || "en",
  });

  const effectiveTimezone = useMemo(() => settings.timezone || "UTC", [settings.timezone]);
  const effectiveLanguage = useMemo(() => settings.language || "en", [settings.language]);
  const browserTz = useMemo(() => getBrowserTimeZone(), []);

  const load = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("account-dashboard", {
        body: { action: "get_settings" },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data?.error || "Failed to load settings");

      const remote = (data?.settings || {}) as Settings;

      setSettings((prev) => ({
        theme: (remote.theme as any) ?? prev.theme ?? "system",
        reduce_motion: Boolean(remote.reduce_motion ?? prev.reduce_motion ?? false),
        timezone: (remote.timezone as any) ?? profile?.timezone ?? prev.timezone ?? "UTC",
        language: (remote.language as any) ?? profile?.language ?? prev.language ?? "en",
      }));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || t("profile.toasts.settingsLoadFailed", "Failed to load settings"));
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload: Settings = {
        theme: settings.theme || "system",
        reduce_motion: Boolean(settings.reduce_motion),
        timezone: effectiveTimezone,
        language: effectiveLanguage,
      };

      const { data, error } = await supabase.functions.invoke("account-dashboard", {
        body: { action: "update_settings", settings: payload },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data?.error || "Failed to save settings");

      if ((profile?.timezone || "UTC") !== effectiveTimezone) {
        const { data: tzRes, error: tzErr } = await supabase.functions.invoke("user-timezone", {
          body: { timezone: effectiveTimezone, source: "manual", allow_overwrite: true },
        });

        if (tzErr) throw tzErr;
        if (tzRes?.ok === false) throw new Error(tzRes?.error || "Failed to set timezone");
      }

      await updateProfile({
        timezone: effectiveTimezone,
        language: effectiveLanguage,
      });

      toast.success(t("profile.toasts.settingsSaved", "Settings saved"));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || t("profile.toasts.settingsFailed", "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("profile.settings.loadingSettings", "Loading settings…")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{t("profile.settings.title", "Settings")}</h3>
          <p className="text-sm text-muted-foreground">{t("profile.settings.appPreferences", "App preferences synced to your account.")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {t("profile.settings.refresh", "Refresh")}
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">{t("profile.settings.appearance", "Appearance & accessibility")}</CardTitle>
          <CardDescription>{t("profile.settings.performance", "High-performance preferences stored in Supabase.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>{t("profile.settings.theme", "Theme")}</Label>
            <Select value={settings.theme || "system"} onValueChange={(v) => setSettings((p) => ({ ...p, theme: v as any }))}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder={t("profile.settings.selectTheme", "Select theme")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">{t("profile.settings.system", "System")}</SelectItem>
                <SelectItem value="light">{t("profile.settings.light", "Light")}</SelectItem>
                <SelectItem value="dark">{t("profile.settings.dark", "Dark")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
            <div className="space-y-1">
              <div className="font-medium">{t("profile.settings.reduceMotion", "Reduce motion")}</div>
              <div className="text-sm text-muted-foreground">{t("profile.settings.reduceMotionDesc", "Minimize animations and transitions")}</div>
            </div>
            <Switch checked={Boolean(settings.reduce_motion)} onCheckedChange={(v) => setSettings((p) => ({ ...p, reduce_motion: v }))} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("profile.settings.timezone", "Timezone")}</Label>
              <Select value={effectiveTimezone} onValueChange={(v) => setSettings((p) => ({ ...p, timezone: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t("profile.settings.selectTimezone", "Select timezone")} />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {t("profile.settings.calendar", "Calendar times will display in this timezone.")} {t("profile.settings.browser", "Browser")}: <span className="font-medium">{browserTz}</span>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg"
                  onClick={() => setSettings((p) => ({ ...p, timezone: browserTz }))}
                >
                  {t("profile.settings.useBrowser", "Use browser")}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("profile.settings.language", "Language")}</Label>
              <Select value={effectiveLanguage} onValueChange={(v) => setSettings((p) => ({ ...p, language: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t("profile.settings.selectLanguage", "Select language")} />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {t("profile.settings.save", "Save")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}