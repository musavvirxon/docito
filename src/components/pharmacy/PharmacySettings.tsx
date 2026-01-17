// File: src/components/pharmacy/PharmacySettings.tsx

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Settings as SettingsIcon,
  Building2,
  Clock,
  Truck,
  Shield,
  Bell,
  Save,
  MapPin,
  Phone,
  Mail,
  Globe,
  CreditCard,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  pharmacyId: string;
}

interface OperatingHoursRow {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
}

const defaultHours: OperatingHoursRow[] = [
  { day: "Monday", open: "09:00", close: "18:00", isClosed: false },
  { day: "Tuesday", open: "09:00", close: "18:00", isClosed: false },
  { day: "Wednesday", open: "09:00", close: "18:00", isClosed: false },
  { day: "Thursday", open: "09:00", close: "18:00", isClosed: false },
  { day: "Friday", open: "09:00", close: "18:00", isClosed: false },
  { day: "Saturday", open: "10:00", close: "16:00", isClosed: false },
  { day: "Sunday", open: "10:00", close: "16:00", isClosed: true },
];

type GetResp = {
  ok: boolean;
  error?: string;
  profile?: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone: string;
    email: string;
    website: string;
    license_number: string;
    verified: boolean;
    verification_status: string;
  };
  settings?: {
    delivery_available: boolean;
    delivery_radius_km: number;
    delivery_fee: number;
    free_delivery_threshold: number;
    is_24_hours: boolean;
    accepts_insurance: boolean;
    accepts_online_orders: boolean;
    requires_prescription_verification: boolean;
    billing_currency: string;
    timezone: string;
  };
  operating_hours?: any;
  notifications?: any;
  can_edit?: boolean;
};

function normalizeHours(v: any): OperatingHoursRow[] {
  // Prefer array of rows; fallback to object; fallback to defaults
  if (Array.isArray(v)) {
    const cleaned = v
      .map((r) => ({
        day: String(r?.day ?? ""),
        open: String(r?.open ?? "09:00"),
        close: String(r?.close ?? "18:00"),
        isClosed: Boolean(r?.isClosed ?? false),
      }))
      .filter((r) => r.day);
    if (cleaned.length) return cleaned;
  }

  // Old schema sometimes stored object; keep defaults in that case
  return defaultHours;
}

export default function PharmacySettings({ pharmacyId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [canEdit, setCanEdit] = useState(false);

  const [profile, setProfile] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US",
    phone: "",
    email: "",
    website: "",
    license_number: "",
  });

  const [settings, setSettings] = useState({
    delivery_available: false,
    delivery_radius_km: 10,
    delivery_fee: 5,
    free_delivery_threshold: 50,
    is_24_hours: false,
    accepts_insurance: true,
    accepts_online_orders: true,
    requires_prescription_verification: true,
    billing_currency: "usd",
    timezone: "UTC",
  });

  const [operatingHours, setOperatingHours] = useState<OperatingHoursRow[]>(defaultHours);

  const [notifications, setNotifications] = useState({
    email_new_prescription: true,
    email_low_stock: true,
    email_insurance_update: false,
    sms_order_ready: true,
    push_urgent_orders: true,
  });

  const verificationBadge = useMemo(() => {
    const status = (settings && canEdit !== undefined) ? "" : "";
    void status;
    return null;
  }, [canEdit, settings]);

  const load = async () => {
    if (!pharmacyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("pharmacy-settings", {
        body: { action: "get", pharmacyId },
      });
      if (error) throw error;

      const payload = data as GetResp;
      if (!payload?.ok) throw new Error(payload?.error || "Failed to load settings");

      setCanEdit(Boolean(payload.can_edit));

      if (payload.profile) {
        setProfile({
          name: payload.profile.name || "",
          address: payload.profile.address || "",
          city: payload.profile.city || "",
          state: payload.profile.state || "",
          postal_code: payload.profile.postal_code || "",
          country: payload.profile.country || "US",
          phone: payload.profile.phone || "",
          email: payload.profile.email || "",
          website: payload.profile.website || "",
          license_number: payload.profile.license_number || "",
        });
      }

      if (payload.settings) {
        setSettings({
          delivery_available: Boolean(payload.settings.delivery_available),
          delivery_radius_km: Number(payload.settings.delivery_radius_km || 10),
          delivery_fee: Number(payload.settings.delivery_fee || 5),
          free_delivery_threshold: Number(payload.settings.free_delivery_threshold || 50),
          is_24_hours: Boolean(payload.settings.is_24_hours),
          accepts_insurance: Boolean(payload.settings.accepts_insurance),
          accepts_online_orders: Boolean(payload.settings.accepts_online_orders),
          requires_prescription_verification: Boolean(payload.settings.requires_prescription_verification),
          billing_currency: payload.settings.billing_currency || "usd",
          timezone: payload.settings.timezone || "UTC",
        });
      }

      setOperatingHours(normalizeHours(payload.operating_hours));
      if (payload.notifications && typeof payload.notifications === "object") {
        setNotifications((prev) => ({
          ...prev,
          ...payload.notifications,
        }));
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load pharmacy settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacyId]);

  const saveAll = async () => {
    if (!pharmacyId) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("pharmacy-settings", {
        body: {
          action: "save",
          pharmacyId,
          profile,
          settings,
          operating_hours: operatingHours,
          notifications,
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to save settings");

      toast.success("Settings saved");
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            Pharmacy Settings
          </h2>
          <p className="text-muted-foreground text-sm">Manage pharmacy profile, operations, delivery and notifications.</p>
        </div>

        <div className="flex items-center gap-2">
          {!canEdit ? <Badge variant="secondary">View only</Badge> : <Badge variant="outline">Admin</Badge>}
          <Button onClick={saveAll} disabled={!canEdit || saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="gap-2">
            <Building2 className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="hours" className="gap-2">
            <Clock className="h-4 w-4" />
            Hours
          </TabsTrigger>
          <TabsTrigger value="delivery" className="gap-2">
            <Truck className="h-4 w-4" />
            Delivery
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Pharmacy Profile
              </CardTitle>
              <CardDescription>Basic information shown to patients and referrers.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pharmacy Name</Label>
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>License Number</Label>
                  <Input
                    value={profile.license_number}
                    onChange={(e) => setProfile((p) => ({ ...p, license_number: e.target.value }))}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4" /> Phone
                  </Label>
                  <Input
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Email
                  </Label>
                  <Input
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Website
                </Label>
                <Input
                  value={profile.website}
                  onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))}
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Address
                </Label>
                <Textarea
                  value={profile.address}
                  onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
                  disabled={!canEdit}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={profile.city}
                    onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={profile.state}
                    onChange={(e) => setProfile((p) => ({ ...p, state: e.target.value }))}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input
                    value={profile.postal_code}
                    onChange={(e) => setProfile((p) => ({ ...p, postal_code: e.target.value }))}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    value={profile.country}
                    onChange={(e) => setProfile((p) => ({ ...p, country: e.target.value }))}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Accepts Insurance
                  </Label>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="text-sm text-muted-foreground">Allow insurance-based fulfillment</div>
                    <Switch
                      checked={settings.accepts_insurance}
                      onCheckedChange={(v) => setSettings((s) => ({ ...s, accepts_insurance: v }))}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hours */}
        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Operating Hours
              </CardTitle>
              <CardDescription>Displayed to patients and used for delivery estimates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">24 Hours</div>
                  <div className="text-sm text-muted-foreground">Pharmacy operates 24/7</div>
                </div>
                <Switch
                  checked={settings.is_24_hours}
                  onCheckedChange={(v) => setSettings((s) => ({ ...s, is_24_hours: v }))}
                  disabled={!canEdit}
                />
              </div>

              {!settings.is_24_hours && (
                <div className="space-y-3">
                  {operatingHours.map((h, idx) => (
                    <div key={h.day} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center rounded-lg border p-3">
                      <div className="font-medium md:col-span-1">{h.day}</div>

                      <div className="flex items-center gap-2 md:col-span-2">
                        <Label className="text-xs text-muted-foreground">Open</Label>
                        <Input
                          type="time"
                          value={h.open}
                          onChange={(e) =>
                            setOperatingHours((arr) =>
                              arr.map((r, i) => (i === idx ? { ...r, open: e.target.value } : r)),
                            )
                          }
                          disabled={!canEdit || h.isClosed}
                        />
                        <Label className="text-xs text-muted-foreground">Close</Label>
                        <Input
                          type="time"
                          value={h.close}
                          onChange={(e) =>
                            setOperatingHours((arr) =>
                              arr.map((r, i) => (i === idx ? { ...r, close: e.target.value } : r)),
                            )
                          }
                          disabled={!canEdit || h.isClosed}
                        />
                      </div>

                      <div className="flex items-center justify-between md:col-span-2">
                        <div className="text-sm text-muted-foreground">Closed</div>
                        <Switch
                          checked={h.isClosed}
                          onCheckedChange={(v) =>
                            setOperatingHours((arr) =>
                              arr.map((r, i) => (i === idx ? { ...r, isClosed: v } : r)),
                            )
                          }
                          disabled={!canEdit}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery */}
        <TabsContent value="delivery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Delivery Settings
              </CardTitle>
              <CardDescription>Control delivery availability, fees and eligibility.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">Delivery Available</div>
                  <div className="text-sm text-muted-foreground">Allow pharmacy delivery fulfillment</div>
                </div>
                <Switch
                  checked={settings.delivery_available}
                  onCheckedChange={(v) => setSettings((s) => ({ ...s, delivery_available: v }))}
                  disabled={!canEdit}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Delivery Radius (km)</Label>
                  <Input
                    type="number"
                    value={settings.delivery_radius_km}
                    onChange={(e) => setSettings((s) => ({ ...s, delivery_radius_km: Number(e.target.value || 0) }))}
                    disabled={!canEdit || !settings.delivery_available}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Delivery Fee</Label>
                  <Input
                    type="number"
                    value={settings.delivery_fee}
                    onChange={(e) => setSettings((s) => ({ ...s, delivery_fee: Number(e.target.value || 0) }))}
                    disabled={!canEdit || !settings.delivery_available}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Free Delivery Threshold</Label>
                  <Input
                    type="number"
                    value={settings.free_delivery_threshold}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, free_delivery_threshold: Number(e.target.value || 0) }))
                    }
                    disabled={!canEdit || !settings.delivery_available}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing & Workflow
              </CardTitle>
              <CardDescription>Defaults for billing currency, timezone and verification workflow.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Billing Currency</Label>
                  <Select
                    value={settings.billing_currency}
                    onValueChange={(v) => setSettings((s) => ({ ...s, billing_currency: v }))}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD</SelectItem>
                      <SelectItem value="uzs">UZS</SelectItem>
                      <SelectItem value="eur">EUR</SelectItem>
                      <SelectItem value="gbp">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(v) => setSettings((s) => ({ ...s, timezone: v }))}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="Asia/Tashkent">Asia/Tashkent</SelectItem>
                      <SelectItem value="Europe/London">Europe/London</SelectItem>
                      <SelectItem value="Europe/Berlin">Europe/Berlin</SelectItem>
                      <SelectItem value="Asia/Dubai">Asia/Dubai</SelectItem>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">Online Orders</div>
                  <div className="text-sm text-muted-foreground">Allow patients to submit online fulfillment orders</div>
                </div>
                <Switch
                  checked={settings.accepts_online_orders}
                  onCheckedChange={(v) => setSettings((s) => ({ ...s, accepts_online_orders: v }))}
                  disabled={!canEdit}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">Prescription Verification Required</div>
                  <div className="text-sm text-muted-foreground">Require verification before dispensing</div>
                </div>
                <Switch
                  checked={settings.requires_prescription_verification}
                  onCheckedChange={(v) => setSettings((s) => ({ ...s, requires_prescription_verification: v }))}
                  disabled={!canEdit}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Configure email/SMS/push notifications for pharmacy events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  key: "email_new_prescription",
                  title: "Email: New Prescription",
                  desc: "Notify when a new prescription is assigned to this pharmacy",
                },
                {
                  key: "email_low_stock",
                  title: "Email: Low Stock",
                  desc: "Notify when inventory falls below threshold",
                },
                {
                  key: "email_insurance_update",
                  title: "Email: Insurance Updates",
                  desc: "Notify on insurance claim status updates",
                },
                {
                  key: "sms_order_ready",
                  title: "SMS: Order Ready",
                  desc: "Notify patients when orders are ready for pickup",
                },
                {
                  key: "push_urgent_orders",
                  title: "Push: Urgent Orders",
                  desc: "Notify staff when urgent orders are created",
                },
              ].map((row) => (
                <div key={row.key} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium">{row.title}</div>
                    <div className="text-sm text-muted-foreground">{row.desc}</div>
                  </div>
                  <Switch
                    checked={Boolean((notifications as any)[row.key])}
                    onCheckedChange={(v) => setNotifications((n) => ({ ...(n as any), [row.key]: v }))}
                    disabled={!canEdit}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {verificationBadge}
    </div>
  );
}
