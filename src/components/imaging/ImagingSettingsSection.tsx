// File: src/components/imaging/ImagingSettingsSection.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  centerId: string;
}

type CenterRow = {
  id?: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  website: string | null;
  modalities: string[] | null;
  accreditations: string[] | null;
  accepts_insurance: boolean | null;
};

type SettingsRow = {
  imaging_center_id: string;
  timezone: string | null;
  billing_currency: string | null;
  notify_email: boolean | null;
  notify_sms: boolean | null;
  report_template: string | null;
  auto_accept_referrals: boolean | null;
  default_turnaround_hours: number | null;
};

const TIMEZONES = ["UTC", "Asia/Tashkent", "Europe/London", "Europe/Berlin", "Asia/Dubai", "Asia/Kolkata"];
const CURRENCIES = ["usd", "uzs", "eur", "gbp"];

export default function ImagingSettingsSection({ centerId }: Props) {
  const { t } = useTranslation("imagingAdminDashboard");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const notifiedRef = useRef(false);

  const [center, setCenter] = useState<CenterRow>({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    website: "",
    modalities: [],
    accreditations: [],
    accepts_insurance: true,
  });

  const [settings, setSettings] = useState<SettingsRow>({
    imaging_center_id: centerId,
    timezone: "UTC",
    billing_currency: "usd",
    notify_email: true,
    notify_sms: false,
    report_template: "",
    auto_accept_referrals: false,
    default_turnaround_hours: 24,
  });

  const [available, setAvailable] = useState(true);

  const [modalitiesInput, setModalitiesInput] = useState("");
  const [accreditationsInput, setAccreditationsInput] = useState("");

  const modalitiesText = useMemo(() => (center.modalities || []).join(", "), [center.modalities]);
  const accreditationsText = useMemo(() => (center.accreditations || []).join(", "), [center.accreditations]);

  useEffect(() => {
    setModalitiesInput(modalitiesText);
    setAccreditationsInput(accreditationsText);
  }, [modalitiesText, accreditationsText]);

  const parsedModalities = useMemo(
    () =>
      modalitiesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [modalitiesInput],
  );

  const parsedAccreditations = useMemo(
    () =>
      accreditationsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [accreditationsInput],
  );

  const load = async () => {
    if (!centerId) return;
    setLoading(true);
    notifiedRef.current = false;

    try {
      const { data, error } = await supabase.functions.invoke("imaging-settings", {
        body: { action: "get", centerId },
      });
      if (error) throw error;

      if (!data?.ok) throw new Error(data?.error || "Failed to load settings");

      setAvailable(Boolean(data.available));

      if (!data.available && !notifiedRef.current) {
        notifiedRef.current = true;
        toast.message("Settings storage not ready yet", {
          description: "Apply migrations, set SUPABASE_DB_URL secret, redeploy functions, then refresh.",
        });
      }

      setCenter((data.center || {}) as CenterRow);
      setSettings((data.settings || {}) as SettingsRow);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId]);

  const save = async () => {
    if (!centerId) return;
    setSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke("imaging-settings", {
        body: {
          action: "save",
          centerId,
          center: {
            name: center.name?.trim() || null,
            phone: center.phone?.trim() || null,
            email: center.email?.trim() || null,
            address: center.address?.trim() || null,
            city: center.city?.trim() || null,
            website: center.website?.trim() || null,
            modalities: parsedModalities,
            accreditations: parsedAccreditations,
            accepts_insurance: Boolean(center.accepts_insurance),
          },
          settings: {
            timezone: settings.timezone || "UTC",
            billing_currency: settings.billing_currency || "usd",
            notify_email: Boolean(settings.notify_email),
            notify_sms: Boolean(settings.notify_sms),
            report_template: settings.report_template || null,
            auto_accept_referrals: Boolean(settings.auto_accept_referrals),
            default_turnaround_hours: Number(settings.default_turnaround_hours ?? 24),
          },
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to save settings");

      setAvailable(Boolean(data.available));

      if (!data.available) {
        toast.message("Settings storage not ready yet", {
          description: "Apply migrations, set SUPABASE_DB_URL secret, redeploy functions, then refresh.",
        });
        return;
      }

      setCenter((data.center || {}) as CenterRow);
      setSettings((data.settings || {}) as SettingsRow);
      toast.success("Settings saved");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Center Profile</CardTitle>
          <CardDescription>Public and operational details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={center.name || ""} onChange={(e) => setCenter((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={center.phone || ""} onChange={(e) => setCenter((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={center.email || ""} onChange={(e) => setCenter((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input value={center.website || ""} onChange={(e) => setCenter((p) => ({ ...p, website: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Address</Label>
            <Input value={center.address || ""} onChange={(e) => setCenter((p) => ({ ...p, address: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={center.city || ""} onChange={(e) => setCenter((p) => ({ ...p, city: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label>Accepts Insurance</Label>
            <div className="flex items-center gap-3">
              <Switch checked={Boolean(center.accepts_insurance)} onCheckedChange={(v) => setCenter((p) => ({ ...p, accepts_insurance: v }))} />
              <span className="text-sm text-muted-foreground">{Boolean(center.accepts_insurance) ? "Yes" : "No"}</span>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Modalities (comma-separated)</Label>
            <Input value={modalitiesInput} onChange={(e) => setModalitiesInput(e.target.value)} placeholder="MRI, CT, X-ray..." />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Accreditations (comma-separated)</Label>
            <Input value={accreditationsInput} onChange={(e) => setAccreditationsInput(e.target.value)} placeholder="ACR, ISO, ..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operational Settings</CardTitle>
          <CardDescription>
            Notifications, defaults and billing preferences{!available ? " (storage not ready)" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={settings.timezone || "UTC"} onValueChange={(v) => setSettings((p) => ({ ...p, timezone: v }))}>
              <SelectTrigger>
                <SelectValue />
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
            <Select value={settings.billing_currency || "usd"} onValueChange={(v) => setSettings((p) => ({ ...p, billing_currency: v }))}>
              <SelectTrigger>
                <SelectValue />
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

          <div className="space-y-2">
            <Label>Notify Email</Label>
            <div className="flex items-center gap-3">
              <Switch checked={Boolean(settings.notify_email)} onCheckedChange={(v) => setSettings((p) => ({ ...p, notify_email: v }))} />
              <span className="text-sm text-muted-foreground">{Boolean(settings.notify_email) ? "Enabled" : "Disabled"}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notify SMS</Label>
            <div className="flex items-center gap-3">
              <Switch checked={Boolean(settings.notify_sms)} onCheckedChange={(v) => setSettings((p) => ({ ...p, notify_sms: v }))} />
              <span className="text-sm text-muted-foreground">{Boolean(settings.notify_sms) ? "Enabled" : "Disabled"}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Auto-accept referrals</Label>
            <div className="flex items-center gap-3">
              <Switch checked={Boolean(settings.auto_accept_referrals)} onCheckedChange={(v) => setSettings((p) => ({ ...p, auto_accept_referrals: v }))} />
              <span className="text-sm text-muted-foreground">{Boolean(settings.auto_accept_referrals) ? "Enabled" : "Disabled"}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Default turnaround hours</Label>
            <Input
              type="number"
              min={1}
              value={String(settings.default_turnaround_hours ?? 24)}
              onChange={(e) => setSettings((p) => ({ ...p, default_turnaround_hours: Number(e.target.value || 24) }))}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Default Report Template</Label>
            <Textarea
              value={settings.report_template || ""}
              onChange={(e) => setSettings((p) => ({ ...p, report_template: e.target.value }))}
              className="min-h-[140px]"
              placeholder="Enter a default template used when drafting imaging reports..."
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={load} disabled={saving}>
              Refresh
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
