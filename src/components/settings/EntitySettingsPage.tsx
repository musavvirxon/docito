// File: src/components/settings/EntitySettingsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useEntitySettings, type EntityType } from "@/hooks/useEntitySettings";

type Props = {
  entityType: EntityType;
  entityId: string;
  heading?: string;
};

export default function EntitySettingsPage({ entityType, entityId, heading }: Props) {
  const { loading, saving, error, settings, saveSettings } = useEntitySettings(entityType, entityId);

  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!settings) return;
    setForm({
      display_name: settings.display_name ?? "",
      phone: settings.phone ?? "",
      email: settings.email ?? "",
      website: settings.website ?? "",
      address_line1: settings.address_line1 ?? "",
      address_line2: settings.address_line2 ?? "",
      city: settings.city ?? "",
      region: settings.region ?? "",
      postal_code: settings.postal_code ?? "",
      country: settings.country ?? "",
      timezone: settings.timezone ?? "UTC",
      logo_url: settings.logo_url ?? "",
      hours: settings.hours ?? {},
      notification_prefs: settings.notification_prefs ?? {},
      billing_prefs: settings.billing_prefs ?? {},
      integrations: settings.integrations ?? {},
    });
  }, [settings]);

  const canSave = useMemo(() => !loading && !!settings && !saving, [loading, saving, settings]);

  const onSave = async () => {
    try {
      await saveSettings(form);
      toast.success("Settings saved");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save settings");
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {error || "Unable to load settings."}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-2xl font-bold">{heading || "Settings"}</h2>
        <Button onClick={onSave} disabled={!canSave}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save
        </Button>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization profile</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Display name</Label>
                <Input value={form.display_name || ""} onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone || ""} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.email || ""} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={form.website || ""} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Logo URL</Label>
                <Input value={form.logo_url || ""} onChange={(e) => setForm((p) => ({ ...p, logo_url: e.target.value }))} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Hours (JSON)</Label>
                <Textarea
                  rows={6}
                  value={JSON.stringify(form.hours ?? {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value || "{}");
                      setForm((p) => ({ ...p, hours: parsed }));
                    } catch {
                      // keep typing, don't block
                      setForm((p) => ({ ...p, hours_raw: e.target.value }));
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">Example: {"{ \"mon\": {\"open\": \"09:00\", \"close\": \"18:00\"} }"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="address" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Address line 1</Label>
                <Input value={form.address_line1 || ""} onChange={(e) => setForm((p) => ({ ...p, address_line1: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Address line 2</Label>
                <Input value={form.address_line2 || ""} onChange={(e) => setForm((p) => ({ ...p, address_line2: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label>City</Label>
                <Input value={form.city || ""} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Region / State</Label>
                <Input value={form.region || ""} onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label>Postal code</Label>
                <Input value={form.postal_code || ""} onChange={(e) => setForm((p) => ({ ...p, postal_code: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={form.country || ""} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Timezone</Label>
                <Input value={form.timezone || "UTC"} onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label>Notification prefs (JSON)</Label>
              <Textarea
                rows={10}
                value={JSON.stringify(form.notification_prefs ?? {}, null, 2)}
                onChange={(e) => {
                  try {
                    setForm((p) => ({ ...p, notification_prefs: JSON.parse(e.target.value || "{}") }));
                  } catch {
                    setForm((p) => ({ ...p, notification_prefs_raw: e.target.value }));
                  }
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label>Billing prefs (JSON)</Label>
              <Textarea
                rows={10}
                value={JSON.stringify(form.billing_prefs ?? {}, null, 2)}
                onChange={(e) => {
                  try {
                    setForm((p) => ({ ...p, billing_prefs: JSON.parse(e.target.value || "{}") }));
                  } catch {
                    setForm((p) => ({ ...p, billing_prefs_raw: e.target.value }));
                  }
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
