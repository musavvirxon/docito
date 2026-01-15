// File: src/components/imaging/ImagingSettings.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { useImagingCenter } from "@/hooks/useImagingCenter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  centerId: string;
}

type Settings = {
  timezone: string;
  billing_currency: string;
  notify_email: boolean;
  notify_sms: boolean;
  report_template: string;
};

const TIMEZONES = ["UTC", "Asia/Tashkent", "Europe/London", "Europe/Berlin", "Asia/Dubai", "Asia/Kolkata"];
const CURRENCIES = ["usd", "uzs", "eur", "gbp"];

function isSchemaCacheMissing(err: unknown) {
  const msg = String((err as any)?.message ?? err ?? "");
  const m = msg.toLowerCase();
  return msg.includes("Could not find the table") || m.includes("schema cache") || (m.includes("relation") && m.includes("does not exist"));
}

export default function ImagingSettings({ centerId }: Props) {
  const { myImagingCenter, updateImagingCenter, fetchMyImagingCenter } = useImagingCenter();

  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  const [centerForm, setCenterForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    website: "",
    modalities: "",
    accreditations: "",
    accepts_insurance: true,
  });

  const [settings, setSettings] = useState<Settings>({
    timezone: "UTC",
    billing_currency: "usd",
    notify_email: true,
    notify_sms: false,
    report_template: "",
  });

  const [settingsAvailable, setSettingsAvailable] = useState(true);
  const schemaReloadAttemptedRef = useRef(false);

  useEffect(() => {
    fetchMyImagingCenter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!myImagingCenter) return;
    setCenterForm({
      name: myImagingCenter.name || "",
      phone: myImagingCenter.phone || "",
      email: myImagingCenter.email || "",
      address: myImagingCenter.address || "",
      city: myImagingCenter.city || "",
      website: myImagingCenter.website || "",
      modalities: (myImagingCenter.modalities || []).join(", "),
      accreditations: (myImagingCenter.accreditations || []).join(", "),
      accepts_insurance: Boolean(myImagingCenter.accepts_insurance),
    });
  }, [myImagingCenter]);

  const parsedModalities = useMemo(
    () => centerForm.modalities.split(",").map((s) => s.trim()).filter(Boolean),
    [centerForm.modalities],
  );

  const parsedAccreditations = useMemo(
    () => centerForm.accreditations.split(",").map((s) => s.trim()).filter(Boolean),
    [centerForm.accreditations],
  );

  const reloadSchemaOnce = async () => {
    if (schemaReloadAttemptedRef.current) return false;
    schemaReloadAttemptedRef.current = true;

    try {
      const { data, error } = await supabase.functions.invoke("pgrst-reload", { body: {} });
      if (error) throw error;
      if ((data as any)?.ok) return true;
      return false;
    } catch {
      return false;
    }
  };

  const loadSettings = async () => {
    if (!centerId) return;

    setLoadingSettings(true);
    try {
      const { data, error } = await supabase.functions.invoke("imaging-settings", {
        body: { centerId, action: "get" },
      });
      if (error) throw error;

      const available = Boolean((data as any)?.available ?? true);
      setSettingsAvailable(available);

      const s = (data as any)?.settings ?? null;
      if (s) {
        setSettings({
          timezone: String(s.timezone ?? "UTC"),
          billing_currency: String(s.billing_currency ?? "usd"),
          notify_email: Boolean(s.notify_email ?? true),
          notify_sms: Boolean(s.notify_sms ?? false),
          report_template: String(s.report_template ?? ""),
        });
      }

      if (!available) {
        toast.message("Settings storage not ready yet", {
          description: "Attempting schema reload…",
        });

        const reloaded = await reloadSchemaOnce();
        if (reloaded) {
          const retry = await supabase.functions.invoke("imaging-settings", {
            body: { centerId, action: "get" },
          });
          if (!retry.error) {
            const retryAvail = Boolean((retry.data as any)?.available ?? true);
            setSettingsAvailable(retryAvail);
            const rs = (retry.data as any)?.settings ?? null;
            if (rs) {
              setSettings({
                timezone: String(rs.timezone ?? "UTC"),
                billing_currency: String(rs.billing_currency ?? "usd"),
                notify_email: Boolean(rs.notify_email ?? true),
                notify_sms: Boolean(rs.notify_sms ?? false),
                report_template: String(rs.report_template ?? ""),
              });
            }
          }
        }
      }
    } catch (e: any) {
      if (isSchemaCacheMissing(e)) {
        toast.message("Settings storage not ready yet", {
          description: "Attempting schema reload…",
        });
        const reloaded = await reloadSchemaOnce();
        if (reloaded) {
          await loadSettings();
          return;
        }
      }
      console.error(e);
      toast.error(e?.message || "Failed to load settings");
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    schemaReloadAttemptedRef.current = false;
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId]);

  const saveAll = async () => {
    if (!centerId || !myImagingCenter?.id) return;
    if (!centerForm.name.trim()) {
      toast.error("Center name is required");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateImagingCenter(myImagingCenter.id, {
        name: centerForm.name.trim(),
        phone: centerForm.phone.trim() || undefined,
        email: centerForm.email.trim() || undefined,
        address: centerForm.address.trim() || undefined,
        city: centerForm.city.trim() || undefined,
        website: centerForm.website.trim() || undefined,
        modalities: parsedModalities.length ? parsedModalities : undefined,
        accreditations: parsedAccreditations.length ? parsedAccreditations : undefined,
        accepts_insurance: centerForm.accepts_insurance,
      });

      if (!updated) throw new Error("Failed to update imaging center profile");

      const { data, error } = await supabase.functions.invoke("imaging-settings", {
        body: {
          centerId,
          action: "upsert",
          settings: {
            timezone: settings.timezone,
            billing_currency: settings.billing_currency,
            notify_email: settings.notify_email,
            notify_sms: settings.notify_sms,
            report_template: settings.report_template,
          },
        },
      });

      if (error) throw error;

      const available = Boolean((data as any)?.available ?? true);
      setSettingsAvailable(available);

      if (!available) {
        toast.message("Settings storage not ready yet", {
          description: "Attempting schema reload…",
        });

        const reloaded = await reloadSchemaOnce();
        if (reloaded) {
          const retry = await supabase.functions.invoke("imaging-settings", {
            body: {
              centerId,
              action: "upsert",
              settings: {
                timezone: settings.timezone,
                billing_currency: settings.billing_currency,
                notify_email: settings.notify_email,
                notify_sms: settings.notify_sms,
                report_template: settings.report_template,
              },
            },
          });

          if (retry.error) throw retry.error;

          const retryAvail = Boolean((retry.data as any)?.available ?? true);
          setSettingsAvailable(retryAvail);

          if (retryAvail) toast.success("Settings saved");
          else toast.message("Settings still syncing", { description: "Try again in a few seconds." });
        } else {
          toast.message("Settings still syncing", { description: "Try again in a few seconds." });
        }
      } else {
        toast.success("Settings saved");
      }
    } catch (e: any) {
      if (isSchemaCacheMissing(e)) {
        toast.message("Settings storage not ready yet", {
          description: "Attempting schema reload…",
        });
        const reloaded = await reloadSchemaOnce();
        if (reloaded) {
          setSaving(false);
          await saveAll();
          return;
        }
      }
      console.error(e);
      toast.error(e?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || loadingSettings;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">
            Profile + operational preferences{!settingsAvailable ? " (storage syncing…)" : ""}
          </p>
        </div>
        <Button onClick={saveAll} disabled={busy || !centerId}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Center Profile</CardTitle>
          <CardDescription>Public-facing and contact details.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={centerForm.name} onChange={(e) => setCenterForm((s) => ({ ...s, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={centerForm.phone} onChange={(e) => setCenterForm((s) => ({ ...s, phone: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={centerForm.email} onChange={(e) => setCenterForm((s) => ({ ...s, email: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input value={centerForm.website} onChange={(e) => setCenterForm((s) => ({ ...s, website: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Address</Label>
            <Input value={centerForm.address} onChange={(e) => setCenterForm((s) => ({ ...s, address: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={centerForm.city} onChange={(e) => setCenterForm((s) => ({ ...s, city: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Modalities (comma-separated)</Label>
            <Input value={centerForm.modalities} onChange={(e) => setCenterForm((s) => ({ ...s, modalities: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Accreditations (comma-separated)</Label>
            <Input
              value={centerForm.accreditations}
              onChange={(e) => setCenterForm((s) => ({ ...s, accreditations: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-between md:col-span-2 p-3 rounded-lg border">
            <div>
              <div className="font-medium">Accepts Insurance</div>
              <div className="text-sm text-muted-foreground">Show insurance acceptance in listings.</div>
            </div>
            <Switch checked={centerForm.accepts_insurance} onCheckedChange={(v) => setCenterForm((s) => ({ ...s, accepts_insurance: v }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operational Preferences</CardTitle>
          <CardDescription>Time zone, billing, notifications, templates.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Time Zone</Label>
            <Select value={settings.timezone} onValueChange={(v) => setSettings((s) => ({ ...s, timezone: v }))} disabled={loadingSettings}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Billing Currency</Label>
            <Select
              value={settings.billing_currency}
              onValueChange={(v) => setSettings((s) => ({ ...s, billing_currency: v }))}
              disabled={loadingSettings}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between md:col-span-2 p-3 rounded-lg border">
            <div>
              <div className="font-medium">Email Notifications</div>
              <div className="text-sm text-muted-foreground">New referrals and status changes.</div>
            </div>
            <Switch checked={settings.notify_email} onCheckedChange={(v) => setSettings((s) => ({ ...s, notify_email: v }))} disabled={loadingSettings} />
          </div>

          <div className="flex items-center justify-between md:col-span-2 p-3 rounded-lg border">
            <div>
              <div className="font-medium">SMS Notifications</div>
              <div className="text-sm text-muted-foreground">Requires SMS provider configuration.</div>
            </div>
            <Switch checked={settings.notify_sms} onCheckedChange={(v) => setSettings((s) => ({ ...s, notify_sms: v }))} disabled={loadingSettings} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Default Report Template</Label>
            <Textarea
              value={settings.report_template}
              onChange={(e) => setSettings((s) => ({ ...s, report_template: e.target.value }))}
              className="min-h-[140px]"
              disabled={loadingSettings}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
