// File: src/components/imaging/ImagingSettings.tsx

import { useEffect, useMemo, useState } from "react";
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

type CenterSettingsRow = {
  imaging_center_id: string;
  timezone: string;
  billing_currency: string;
  notify_email: boolean;
  notify_sms: boolean;
  report_template: string | null;
};

interface Props {
  centerId: string;
}

const TIMEZONES = ["UTC", "Asia/Tashkent", "Europe/London", "Europe/Berlin", "Asia/Dubai", "Asia/Kolkata"];
const CURRENCIES = ["usd", "uzs", "eur", "gbp"];

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

  const [settings, setSettings] = useState<CenterSettingsRow>({
    imaging_center_id: centerId,
    timezone: "UTC",
    billing_currency: "usd",
    notify_email: true,
    notify_sms: false,
    report_template: "",
  });

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

  useEffect(() => {
    const load = async () => {
      if (!centerId) return;
      setLoadingSettings(true);
      try {
        const { data, error } = await supabase
          .from("imaging_center_settings")
          .select("imaging_center_id, timezone, billing_currency, notify_email, notify_sms, report_template")
          .eq("imaging_center_id", centerId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const row = data as CenterSettingsRow;
          setSettings({
            imaging_center_id: row.imaging_center_id,
            timezone: row.timezone || "UTC",
            billing_currency: row.billing_currency || "usd",
            notify_email: Boolean(row.notify_email),
            notify_sms: Boolean(row.notify_sms),
            report_template: (row.report_template as string | null) || "",
          });
        } else {
          setSettings((s) => ({ ...s, imaging_center_id: centerId }));
        }
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to load settings");
      } finally {
        setLoadingSettings(false);
      }
    };

    load();
  }, [centerId]);

  const parsedModalities = useMemo(() => {
    return centerForm.modalities
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [centerForm.modalities]);

  const parsedAccreditations = useMemo(() => {
    return centerForm.accreditations
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [centerForm.accreditations]);

  const saveAll = async () => {
    if (!myImagingCenter?.id || !centerId) return;

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

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id ?? null;

      const { error: upsertErr } = await supabase.from("imaging_center_settings").upsert(
        {
          imaging_center_id: centerId,
          timezone: settings.timezone,
          billing_currency: settings.billing_currency,
          notify_email: settings.notify_email,
          notify_sms: settings.notify_sms,
          report_template: settings.report_template || null,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "imaging_center_id" }
      );

      if (upsertErr) throw upsertErr;

      toast.success("Settings saved");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">Manage your imaging center profile and operational preferences.</p>
        </div>
        <Button onClick={saveAll} disabled={saving || !centerId}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
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
            <Input value={centerForm.name} onChange={(e) => setCenterForm((s) => ({ ...s, name: e.target.value }))} placeholder="Imaging Center Name" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={centerForm.phone} onChange={(e) => setCenterForm((s) => ({ ...s, phone: e.target.value }))} placeholder="+998 ..." />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={centerForm.email} onChange={(e) => setCenterForm((s) => ({ ...s, email: e.target.value }))} placeholder="contact@center.com" />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input value={centerForm.website} onChange={(e) => setCenterForm((s) => ({ ...s, website: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Address</Label>
            <Input value={centerForm.address} onChange={(e) => setCenterForm((s) => ({ ...s, address: e.target.value }))} placeholder="Street, Building, etc." />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={centerForm.city} onChange={(e) => setCenterForm((s) => ({ ...s, city: e.target.value }))} placeholder="Tashkent" />
          </div>
          <div className="space-y-2">
            <Label>Modalities (comma-separated)</Label>
            <Input
              value={centerForm.modalities}
              onChange={(e) => setCenterForm((s) => ({ ...s, modalities: e.target.value }))}
              placeholder="MRI, CT, X-ray"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Accreditations (comma-separated)</Label>
            <Input
              value={centerForm.accreditations}
              onChange={(e) => setCenterForm((s) => ({ ...s, accreditations: e.target.value }))}
              placeholder="JCI, ISO..."
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
          <CardDescription>Time zone, billing, and notifications.</CardDescription>
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
            <Select value={settings.billing_currency} onValueChange={(v) => setSettings((s) => ({ ...s, billing_currency: v }))} disabled={loadingSettings}>
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
              <div className="text-sm text-muted-foreground">Send email alerts for new referrals and status changes.</div>
            </div>
            <Switch checked={settings.notify_email} onCheckedChange={(v) => setSettings((s) => ({ ...s, notify_email: v }))} disabled={loadingSettings} />
          </div>

          <div className="flex items-center justify-between md:col-span-2 p-3 rounded-lg border">
            <div>
              <div className="font-medium">SMS Notifications</div>
              <div className="text-sm text-muted-foreground">Send SMS alerts (requires SMS provider configuration).</div>
            </div>
            <Switch checked={settings.notify_sms} onCheckedChange={(v) => setSettings((s) => ({ ...s, notify_sms: v }))} disabled={loadingSettings} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Default Report Template</Label>
            <Textarea
              value={settings.report_template || ""}
              onChange={(e) => setSettings((s) => ({ ...s, report_template: e.target.value }))}
              placeholder="Template text inserted into new reports..."
              className="min-h-[140px]"
              disabled={loadingSettings}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
