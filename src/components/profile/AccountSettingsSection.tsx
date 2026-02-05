// Path: src/components/profile/AccountSettingsSection.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { TimezoneCombobox } from "@/components/profile/TimezoneCombobox";
import { updateProfileTimezone } from "@/lib/timezoneApi";

type Settings = {
  theme?: "system" | "light" | "dark";
  reduce_motion?: boolean;
  timezone?: string;
  language?: string;
};

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
      toast.error(e?.message || "Failed to load settings");
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

      // Step 6: timezone updates go through timezone-update Edge Function
      if (effectiveTimezone && effectiveTimezone !== (profile?.timezone || "")) {
        await updateProfileTimezone(effectiveTimezone, "manual");
      }

      // Keep existing settings blob in sync (theme/reduce_motion/language/timezone)
      const { data, error } = await supabase.functions.invoke("account-dashboard", {
        body: { action: "update_settings", settings: payload },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data?.error || "Failed to save settings");

      // Keep profiles reads in sync for app UI (also refreshes auth context)
      await updateProfile({
        timezone: effectiveTimezone,
        language: effectiveLanguage,
      } as any);

      toast.success("Settings saved");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save settings");
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
          Loading settings…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Settings</h3>
          <p className="text-sm text-muted-foreground">App preferences synced to your account.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Appearance & accessibility</CardTitle>
          <CardDescription>High-performance preferences stored in Supabase.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={settings.theme || "system"} onValueChange={(v) => setSettings((p) => ({ ...p, theme: v as any }))}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
            <div className="space-y-1">
              <div className="font-medium">Reduce motion</div>
              <div className="text-sm text-muted-foreground">Minimize animations and transitions</div>
            </div>
            <Switch checked={Boolean(settings.reduce_motion)} onCheckedChange={(v) => setSettings((p) => ({ ...p, reduce_motion: v }))} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Timezone</Label>
              <TimezoneCombobox value={effectiveTimezone} onValueChange={(v) => setSettings((p) => ({ ...p, timezone: v }))} />
              <p className="text-xs text-muted-foreground">Calendar + referrals will display times in this timezone.</p>
            </div>

            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={effectiveLanguage} onValueChange={(v) => setSettings((p) => ({ ...p, language: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select language" />
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
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
