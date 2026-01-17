// File: src/components/pharmacy/PharmacySettings.tsx

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Settings,
  Building2,
  Clock,
  Truck,
  Shield,
  Bell,
  Save,
  Phone,
  Mail,
  Globe,
  CreditCard,
  Loader2,
} from "lucide-react";

interface Props {
  pharmacyId: string;
}

interface OperatingHours {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
}

type PharmacyRow = {
  id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  license_number: string | null;
  accepts_insurance: boolean | null;
  delivery_available: boolean | null;
  operating_hours: any;
  verified: boolean | null;
  verification_status: string | null;
};

type PharmacySettingsRow = {
  pharmacy_id: string;
  timezone: string;
  billing_currency: string;
  delivery_radius_km: number;
  delivery_fee_cents: number;
  free_delivery_threshold_cents: number;
  is_24_hours: boolean;
  accepts_online_orders: boolean;
  requires_prescription_verification: boolean;
  notification_settings: Record<string, any>;
};

type GetResp =
  | {
      ok: true;
      available: boolean;
      pharmacy: PharmacyRow;
      settings: PharmacySettingsRow;
      warnings?: string[];
    }
  | { ok: false; error: string; available?: boolean; warnings?: string[] };

const defaultHours: OperatingHours[] = [
  { day: "Monday", open: "09:00", close: "18:00", isClosed: false },
  { day: "Tuesday", open: "09:00", close: "18:00", isClosed: false },
  { day: "Wednesday", open: "09:00", close: "18:00", isClosed: false },
  { day: "Thursday", open: "09:00", close: "18:00", isClosed: false },
  { day: "Friday", open: "09:00", close: "18:00", isClosed: false },
  { day: "Saturday", open: "10:00", close: "16:00", isClosed: false },
  { day: "Sunday", open: "10:00", close: "16:00", isClosed: true },
];

function safeHours(v: any): OperatingHours[] {
  if (!Array.isArray(v)) return defaultHours;
  const cleaned = v
    .map((x: any) => ({
      day: String(x?.day ?? ""),
      open: String(x?.open ?? "09:00"),
      close: String(x?.close ?? "18:00"),
      isClosed: Boolean(x?.isClosed ?? false),
    }))
    .filter((x: any) => x.day);
  return cleaned.length ? cleaned : defaultHours;
}

function dollarsToCents(v: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100));
}

function centsToDollars(v: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n) / 100;
}

export default function PharmacySettings({ pharmacyId }: Props) {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verified, setVerified] = useState(false);

  const [profile, setProfile] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    phone: "",
    email: "",
    website: "",
    license_number: "",
    description: "",
  });

  const [settings, setSettings] = useState({
    timezone: "UTC",
    billing_currency: "usd",
    delivery_available: false,
    delivery_radius_km: 10,
    delivery_fee: 0,
    free_delivery_threshold: 0,
    is_24_hours: false,
    accepts_insurance: true,
    accepts_online_orders: true,
    requires_prescription_verification: true,
  });

  const [operatingHours, setOperatingHours] = useState<OperatingHours[]>(defaultHours);

  const [notifications, setNotifications] = useState({
    email_new_prescription: true,
    email_low_stock: true,
    email_insurance_update: false,
    sms_order_ready: true,
    push_urgent_orders: true,
  });

  const payloadForSave = useMemo(() => {
    return {
      pharmacy: {
        name: profile.name,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        postal_code: profile.postal_code,
        country: profile.country,
        phone: profile.phone,
        email: profile.email,
        website: profile.website,
        license_number: profile.license_number,
        accepts_insurance: settings.accepts_insurance,
        delivery_available: settings.delivery_available,
        operating_hours: operatingHours,
      },
      settings: {
        timezone: settings.timezone,
        billing_currency: settings.billing_currency,
        delivery_radius_km: settings.delivery_radius_km,
        delivery_fee_cents: dollarsToCents(settings.delivery_fee),
        free_delivery_threshold_cents: dollarsToCents(settings.free_delivery_threshold),
        is_24_hours: settings.is_24_hours,
        accepts_online_orders: settings.accepts_online_orders,
        requires_prescription_verification: settings.requires_prescription_verification,
        notification_settings: notifications,
      },
    };
  }, [notifications, operatingHours, profile, settings]);

  const fetchSettings = async () => {
    if (!pharmacyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("pharmacy-settings", {
        body: { action: "get", pharmacyId },
      });
      if (error) throw error;

      const resp = data as GetResp;
      if (!resp || resp.ok !== true) throw new Error((resp as any)?.error || "Failed to load settings");

      const p = resp.pharmacy;
      const s = resp.settings;

      setVerified(Boolean(p.verified) || String(p.verification_status || "").toLowerCase() === "verified");

      setProfile({
        name: p.name || "",
        address: p.address || "",
        city: p.city || "",
        state: p.state || "",
        postal_code: p.postal_code || "",
        country: p.country || "",
        phone: p.phone || "",
        email: p.email || "",
        website: p.website || "",
        license_number: p.license_number || "",
        description: "",
      });

      setOperatingHours(safeHours(p.operating_hours));

      setSettings({
        timezone: s.timezone || "UTC",
        billing_currency: s.billing_currency || "usd",
        delivery_available: Boolean(p.delivery_available),
        delivery_radius_km: Number(s.delivery_radius_km ?? 10),
        delivery_fee: centsToDollars(Number(s.delivery_fee_cents ?? 0)),
        free_delivery_threshold: centsToDollars(Number(s.free_delivery_threshold_cents ?? 0)),
        is_24_hours: Boolean(s.is_24_hours),
        accepts_insurance: Boolean(p.accepts_insurance ?? true),
        accepts_online_orders: Boolean(s.accepts_online_orders ?? true),
        requires_prescription_verification: Boolean(s.requires_prescription_verification ?? true),
      });

      const ns = (s.notification_settings || {}) as any;
      setNotifications({
        email_new_prescription: Boolean(ns.email_new_prescription ?? true),
        email_low_stock: Boolean(ns.email_low_stock ?? true),
        email_insurance_update: Boolean(ns.email_insurance_update ?? false),
        sms_order_ready: Boolean(ns.sms_order_ready ?? true),
        push_urgent_orders: Boolean(ns.push_urgent_orders ?? true),
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load pharmacy settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacyId]);

  const saveAll = async () => {
    if (!pharmacyId) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("pharmacy-settings", {
        body: { action: "save", pharmacyId, ...payloadForSave },
      });
      if (error) throw error;
      const resp = data as GetResp;
      if (!resp || resp.ok !== true) throw new Error((resp as any)?.error || "Failed to save settings");
      toast.success("Settings saved");
      await fetchSettings();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateHours = (index: number, field: keyof OperatingHours, value: string | boolean) => {
    setOperatingHours((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value } as OperatingHours;
      return updated;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Pharmacy Settings
          </h2>
          <p className="text-muted-foreground">Manage your pharmacy profile and preferences</p>
        </div>
        {verified ? (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
            <Shield className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        ) : null}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="hours">Operating Hours</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Pharmacy Information
              </CardTitle>
              <CardDescription>Update your pharmacy details visible to patients</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pharmacy Name</Label>
                  <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Enter pharmacy name" />
                </div>
                <div className="space-y-2">
                  <Label>License Number</Label>
                  <Input value={profile.license_number} onChange={(e) => setProfile({ ...profile, license_number: e.target.value })} placeholder="Enter license number" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone
                  </Label>
                  <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="Enter phone number" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="Enter email" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Website
                  </Label>
                  <Input value={profile.website} onChange={(e) => setProfile({ ...profile, website: e.target.value })} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} placeholder="Country" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Address</Label>
                  <Input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} placeholder="Street address" />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} placeholder="City" />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={profile.state} onChange={(e) => setProfile({ ...profile, state: e.target.value })} placeholder="State" />
                </div>
                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input value={profile.postal_code} onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })} placeholder="Postal code" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea value={profile.description} onChange={(e) => setProfile({ ...profile, description: e.target.value })} placeholder="Short description (optional)" rows={4} />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <Label className="text-sm">Accepts insurance</Label>
                  <Switch checked={settings.accepts_insurance} onCheckedChange={(v) => setSettings({ ...settings, accepts_insurance: v })} />
                </div>

                <Button onClick={saveAll} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Operating Hours
              </CardTitle>
              <CardDescription>Set your pharmacy opening hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Label className="text-sm">Open 24 hours</Label>
                  <Switch checked={settings.is_24_hours} onCheckedChange={(v) => setSettings({ ...settings, is_24_hours: v })} />
                </div>
              </div>

              <div className="space-y-3">
                {operatingHours.map((h, idx) => (
                  <div key={h.day} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center p-3 rounded-lg border">
                    <div className="font-medium md:col-span-1">{h.day}</div>
                    <div className="md:col-span-1 flex items-center gap-2">
                      <Switch checked={!h.isClosed} onCheckedChange={(v) => updateHours(idx, "isClosed", !v)} />
                      <span className="text-sm text-muted-foreground">Open</span>
                    </div>
                    <div className="md:col-span-1">
                      <Input type="time" value={h.open} disabled={h.isClosed || settings.is_24_hours} onChange={(e) => updateHours(idx, "open", e.target.value)} />
                    </div>
                    <div className="md:col-span-1">
                      <Input type="time" value={h.close} disabled={h.isClosed || settings.is_24_hours} onChange={(e) => updateHours(idx, "close", e.target.value)} />
                    </div>
                    <div className="md:col-span-1 text-sm text-muted-foreground">
                      {settings.is_24_hours ? "24 hours" : h.isClosed ? "Closed" : ""}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button onClick={saveAll} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Delivery Settings
              </CardTitle>
              <CardDescription>Configure delivery options and pricing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Offer delivery</Label>
                  <p className="text-xs text-muted-foreground">Enable delivery fulfillment for orders</p>
                </div>
                <Switch checked={settings.delivery_available} onCheckedChange={(v) => setSettings({ ...settings, delivery_available: v })} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Delivery radius (km)
                  </Label>
                  <Input
                    type="number"
                    value={settings.delivery_radius_km}
                    onChange={(e) => setSettings({ ...settings, delivery_radius_km: Number(e.target.value) || 0 })}
                    min={0}
                    step={1}
                    disabled={!settings.delivery_available}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Delivery fee ($)
                  </Label>
                  <Input
                    type="number"
                    value={settings.delivery_fee}
                    onChange={(e) => setSettings({ ...settings, delivery_fee: Number(e.target.value) || 0 })}
                    min={0}
                    step={0.5}
                    disabled={!settings.delivery_available}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Free delivery threshold ($)</Label>
                  <Input
                    type="number"
                    value={settings.free_delivery_threshold}
                    onChange={(e) => setSettings({ ...settings, free_delivery_threshold: Number(e.target.value) || 0 })}
                    min={0}
                    step={1}
                    disabled={!settings.delivery_available}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Accept online orders</Label>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm text-muted-foreground">Patients can place orders online</span>
                    <Switch checked={settings.accepts_online_orders} onCheckedChange={(v) => setSettings({ ...settings, accepts_online_orders: v })} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Require prescription verification</Label>
                  <p className="text-xs text-muted-foreground">Extra verification step before dispensing</p>
                </div>
                <Switch
                  checked={settings.requires_prescription_verification}
                  onCheckedChange={(v) => setSettings({ ...settings, requires_prescription_verification: v })}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={saveAll} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose which alerts your team receives</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">New prescription</p>
                    <p className="text-sm text-muted-foreground">Email alert for incoming prescriptions</p>
                  </div>
                  <Switch checked={notifications.email_new_prescription} onCheckedChange={(v) => setNotifications({ ...notifications, email_new_prescription: v })} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Low stock</p>
                    <p className="text-sm text-muted-foreground">Email alert when inventory is low</p>
                  </div>
                  <Switch checked={notifications.email_low_stock} onCheckedChange={(v) => setNotifications({ ...notifications, email_low_stock: v })} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Insurance updates</p>
                    <p className="text-sm text-muted-foreground">Email for claim/coverage updates</p>
                  </div>
                  <Switch checked={notifications.email_insurance_update} onCheckedChange={(v) => setNotifications({ ...notifications, email_insurance_update: v })} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Order ready</p>
                    <p className="text-sm text-muted-foreground">SMS alert when order is ready</p>
                  </div>
                  <Switch checked={notifications.sms_order_ready} onCheckedChange={(v) => setNotifications({ ...notifications, sms_order_ready: v })} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Urgent orders</p>
                    <p className="text-sm text-muted-foreground">Push notifications for urgent orders</p>
                  </div>
                  <Switch checked={notifications.push_urgent_orders} onCheckedChange={(v) => setNotifications({ ...notifications, push_urgent_orders: v })} />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveAll} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
