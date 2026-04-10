// File: src/components/lab/LabSettingsSection.tsx

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

type LabCenter = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  website: string | null;
  accepts_insurance: boolean;
  average_turnaround_hours: number;
};

type LabSettings = {
  lab_center_id: string;
  timezone: string;
  billing_currency: string;
  notify_email: boolean;
  notify_sms: boolean;
  auto_accept_referrals: boolean;
  default_turnaround_hours: number;
  report_template: string;
};

export function LabSettingsSection({ labCenterId }: { labCenterId: string }) {
  const { t } = useTranslation("labAdminDashboard");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [center, setCenter] = useState<LabCenter | null>(null);
  const [settings, setSettings] = useState<LabSettings | null>(null);

  const load = async () => {
    if (!labCenterId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('lab-settings', {
        body: { action: 'get', labCenterId },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Failed to load settings');

      setCenter(data.center as LabCenter);
      setSettings(data.settings as LabSettings);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to load lab settings');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!labCenterId || !center || !settings) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('lab-settings', {
        body: {
          action: 'save',
          labCenterId,
          center: {
            name: center.name,
            phone: center.phone,
            email: center.email,
            address: center.address,
            city: center.city,
            website: center.website,
            accepts_insurance: center.accepts_insurance,
            average_turnaround_hours: settings.default_turnaround_hours,
          },
          settings: {
            timezone: settings.timezone,
            billing_currency: settings.billing_currency,
            notify_email: settings.notify_email,
            notify_sms: settings.notify_sms,
            auto_accept_referrals: settings.auto_accept_referrals,
            default_turnaround_hours: settings.default_turnaround_hours,
            report_template: settings.report_template,
          },
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Failed to save settings');

      toast.success('Settings saved');
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to save lab settings');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labCenterId]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!center || !settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lab Settings</CardTitle>
          <CardDescription>Unable to load settings</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={load} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.settings.profile.title", "Lab Profile")}</CardTitle>
          <CardDescription>Basic information used across your lab workflows.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Lab name</Label>
            <Input value={center.name || ''} onChange={(e) => setCenter((p) => ({ ...(p as LabCenter), name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={center.phone || ''} onChange={(e) => setCenter((p) => ({ ...(p as LabCenter), phone: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={center.email || ''} onChange={(e) => setCenter((p) => ({ ...(p as LabCenter), email: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input value={center.website || ''} onChange={(e) => setCenter((p) => ({ ...(p as LabCenter), website: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Address</Label>
            <Input value={center.address || ''} onChange={(e) => setCenter((p) => ({ ...(p as LabCenter), address: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={center.city || ''} onChange={(e) => setCenter((p) => ({ ...(p as LabCenter), city: e.target.value }))} />
          </div>
          <div className="flex items-center justify-between md:col-span-2 rounded-lg border p-4">
            <div className="space-y-1">
              <div className="font-medium">Accepts insurance</div>
              <div className="text-sm text-muted-foreground">Show insurance eligibility options for patients.</div>
            </div>
            <Switch
              checked={Boolean(center.accepts_insurance)}
              onCheckedChange={(v) => setCenter((p) => ({ ...(p as LabCenter), accepts_insurance: v }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.settings.operational.title", "Operational Settings")}</CardTitle>
          <CardDescription>Notifications, billing defaults, and turnaround expectations.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Input value={settings.timezone} onChange={(e) => setSettings((p) => ({ ...(p as LabSettings), timezone: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label>Billing currency</Label>
            <Select
              value={settings.billing_currency}
              onValueChange={(v) => setSettings((p) => ({ ...(p as LabSettings), billing_currency: v }))}
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

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <div className="font-medium">Email notifications</div>
              <div className="text-sm text-muted-foreground">Order updates and escalations.</div>
            </div>
            <Switch
              checked={Boolean(settings.notify_email)}
              onCheckedChange={(v) => setSettings((p) => ({ ...(p as LabSettings), notify_email: v }))}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <div className="font-medium">SMS notifications</div>
              <div className="text-sm text-muted-foreground">Optional SMS alerts for urgent cases.</div>
            </div>
            <Switch
              checked={Boolean(settings.notify_sms)}
              onCheckedChange={(v) => setSettings((p) => ({ ...(p as LabSettings), notify_sms: v }))}
            />
          </div>

          <div className="flex items-center justify-between md:col-span-2 rounded-lg border p-4">
            <div className="space-y-1">
              <div className="font-medium">Auto-accept referrals</div>
              <div className="text-sm text-muted-foreground">Automatically accept inbound referrals (when supported).</div>
            </div>
            <Switch
              checked={Boolean(settings.auto_accept_referrals)}
              onCheckedChange={(v) => setSettings((p) => ({ ...(p as LabSettings), auto_accept_referrals: v }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Default turnaround (hours)</Label>
            <Input
              type="number"
              min={1}
              value={String(settings.default_turnaround_hours ?? 24)}
              onChange={(e) =>
                setSettings((p) => ({
                  ...(p as LabSettings),
                  default_turnaround_hours: Number(e.target.value || 24),
                }))
              }
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Default report template</Label>
            <Textarea
              value={settings.report_template || ''}
              onChange={(e) => setSettings((p) => ({ ...(p as LabSettings), report_template: e.target.value }))}
              className="min-h-[140px]"
              placeholder="Enter a default template used when drafting lab reports..."
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
