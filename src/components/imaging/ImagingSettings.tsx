// File: src/pages/imaging/ImagingSettings.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useImagingCenter } from "@/hooks/useImagingCenter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type CenterSettings = {
  imaging_center_id: string;
  timezone: string;
  billing_currency: string;
  notify_email: boolean;
  notify_sms: boolean;
  report_template: string | null;
};

const TIMEZONES = ["UTC", "Asia/Tashkent", "Europe/London", "Europe/Berlin", "Asia/Dubai", "Asia/Kolkata"];
const CURRENCIES = ["usd", "uzs", "eur", "gbp"];

export default function ImagingSettings() {
  const navigate = useNavigate();
  const { myImagingCenter, fetchMyImagingCenter, updateImagingCenter, loading } = useImagingCenter();

  const [saving, setSaving] = useState(false);

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

  const [settings, setSettings] = useState<CenterSettings>({
    imaging_center_id: "",
    timezone: "UTC",
    billing_currency: "usd",
    notify_email: true,
    notify_sms: false,
    report_template: "",
  });

  const centerId = myImagingCenter?.id || "";

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
    const loadSettings = async () => {
      if (!centerId) return;

      try {
        const { data, error } = await supabase
          .from("imaging_center_settings")
          .select("imaging_center_id, timezone, billing_currency, notify_email, notify_sms, report_template")
          .eq("imaging_center_id", centerId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSettings({
            imaging_center_id: data.imaging_center_id,
            timezone: data.timezone || "UTC",
            billing_currency: data.billing_currency || "usd",
            notify_email: Boolean(data.notify_email),
            notify_sms: Boolean(data.notify_sms),
            report_template: (data.report_template as string | null) || "",
          });
        } else {
          setSettings((s) => ({ ...s, imaging_center_id: centerId }));
        }
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to load settings");
      }
    };

    loadSettings();
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
    if (!myImagingCenter) return;

    setSaving(true);
    try {
      // Update imaging_centers
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

      // Upsert imaging_center_settings
      const { error: upsertErr } = await supabase.from("imaging_center_settings").upsert(
        {
          imaging_center_id: myImagingCenter.id,
          timezone: settings.timezone,
          billing_currency: settings.billing_currency,
          notify_email: settings.notify_email,
          notify_sms: settings.notify_sms,
          report_template: settings.report_template || null,
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

  if (loading && !myImagingCenter) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!myImagingCenter) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>No Imaging Center</CardTitle>
            <CardDescription>You don’t have an imaging center linked to your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/imaging/dashboard")} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate("/imaging/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">Imaging Center Settings</h1>
              <p className="text-sm text-muted-foreground">Configure your center profile, notifications, and templates</p>
            </div>
          </div>

          <Button onClick={saveAll} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>

        {/* Center Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Center Profile</CardTitle>
            <CardDescription>Public-facing and operational information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={centerForm.name} onChange={(e) => setCenterForm({ ...centerForm, name: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={centerForm.website} onChange={(e) => setCenterForm({ ...centerForm, website: e.target.value })} placeholder="https://..." />
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={centerForm.phone} onChange={(e) => setCenterForm({ ...centerForm, phone: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={centerForm.email} onChange={(e) => setCenterForm({ ...centerForm, email: e.target.value })} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Address</Label>
                <Input value={centerForm.address} onChange={(e) => setCenterForm({ ...centerForm, address: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>City</Label>
                <Input value={centerForm.city} onChange={(e) => setCenterForm({ ...centerForm, city: e.target.value })} />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Accepts Insurance</p>
                  <p className="text-sm text-muted-foreground">Show insurance acceptance in search results</p>
                </div>
                <Switch checked={centerForm.accepts_insurance} onCheckedChange={(v) => setCenterForm({ ...centerForm, accepts_insurance: v })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Modalities (comma-separated)</Label>
              <Input
                value={centerForm.modalities}
                onChange={(e) => setCenterForm({ ...centerForm, modalities: e.target.value })}
                placeholder="MRI, CT, X-ray, Ultrasound"
              />
            </div>

            <div className="space-y-2">
              <Label>Accreditations (comma-separated)</Label>
              <Input value={centerForm.accreditations} onChange={(e) => setCenterForm({ ...centerForm, accreditations: e.target.value })} placeholder="JCI, ISO..." />
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Notifications, timezone, billing and templates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={settings.timezone} onValueChange={(v) => setSettings({ ...settings, timezone: v })}>
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
                <Select value={settings.billing_currency} onValueChange={(v) => setSettings({ ...settings, billing_currency: v })}>
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
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Referral updates, report status, reminders</p>
                </div>
                <Switch checked={settings.notify_email} onCheckedChange={(v) => setSettings({ ...settings, notify_email: v })} />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">SMS Notifications</p>
                  <p className="text-sm text-muted-foreground">Optional SMS alerts (if enabled)</p>
                </div>
                <Switch checked={settings.notify_sms} onCheckedChange={(v) => setSettings({ ...settings, notify_sms: v })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Report Template (optional)</Label>
              <Textarea
                value={settings.report_template || ""}
                onChange={(e) => setSettings({ ...settings, report_template: e.target.value })}
                placeholder="Provide a default report template for radiologists..."
                className="min-h-[140px]"
              />
              <p className="text-xs text-muted-foreground">This template can be used to pre-fill report text in your workflow UI.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={saveAll} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
