// Path: src/components/settings/EntitySettingsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { useEntitySettings, type EntityType } from "@/hooks/useEntitySettings";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  entityType: EntityType;
  entityId: string;
  heading?: string;
};

type BillingRes = {
  ok: boolean;
  error?: string;
  summary?: {
    total_paid_cents: number;
    total_refunded_cents: number;
    outstanding_cents: number;
    open_invoice_count: number;
  };
  invoices?: Array<{
    id: string;
    status: string;
    currency: string;
    amount_due_cents: number;
    amount_paid_cents: number;
    amount_remaining_cents: number;
    due_at: string | null;
    paid_at: string | null;
    created_at: string;
    hosted_invoice_url?: string | null;
    invoice_pdf_url?: string | null;
  }>;
  transactions?: Array<{
    id: string;
    status: string;
    transaction_type: string;
    currency: string;
    amount_cents: number;
    provider: string;
    provider_ref: string | null;
    created_at: string;
    invoice_id: string | null;
  }>;
  currency?: string | null;
};

type AnalyticsRes = {
  ok: boolean;
  error?: string;
  window_days?: number;
  kpis?: Record<string, number>;
  trend?: Array<Record<string, any>>;
  currency?: string | null;
};

function fmtMoney(cents: number, currency: string) {
  const cur = (currency || "usd").toUpperCase();
  const value = Number(cents || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${cur} ${value.toFixed(2)}`;
  }
}

export default function EntitySettingsPage({ entityType, entityId, heading }: Props) {
  const { loading, saving, error, settings, saveSettings } = useEntitySettings(entityType, entityId);

  const [form, setForm] = useState<Record<string, any>>({});
  const [tab, setTab] = useState<"profile" | "address" | "notifications" | "billing" | "analytics">("profile");

  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingRes | null>(null);

  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsRes | null>(null);

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

  const billingCurrency = useMemo(() => {
    const explicit = billing?.currency || null;
    if (explicit) return String(explicit).toLowerCase();

    const invCur = billing?.invoices?.find((i) => i.currency)?.currency;
    if (invCur) return String(invCur).toLowerCase();

    const txCur = billing?.transactions?.find((t) => t.currency)?.currency;
    if (txCur) return String(txCur).toLowerCase();

    const pref = settings?.billing_prefs?.currency;
    if (pref) return String(pref).toLowerCase();

    return "usd";
  }, [billing?.currency, billing?.invoices, billing?.transactions, settings?.billing_prefs?.currency]);

  const analyticsCurrency = useMemo(() => {
    const explicit = analytics?.currency || null;
    if (explicit) return String(explicit).toLowerCase();
    return billingCurrency || "usd";
  }, [analytics?.currency, billingCurrency]);

  const onSave = async () => {
    try {
      await saveSettings(form);
      toast.success("Settings saved");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save settings");
    }
  };

  const loadBilling = async () => {
    setBillingLoading(true);
    setBillingError(null);
    try {
      if (entityType === "clinic") {
        const { data, error: fnErr } = await supabase.functions.invoke<BillingRes>("entity-dashboard", {
          body: { action: "billing", entityType, entityId, limit: 50 },
        });
        if (fnErr) throw fnErr;
        if (!data?.ok) throw new Error(data?.error || "Failed to load billing");
        setBilling(data);
      } else {
        const { data, error: fnErr } = await supabase.functions.invoke<BillingRes>("facility-billing", {
          body: { entityType, entityId, limit: 50 },
        });
        if (fnErr) throw fnErr;
        if (!data?.ok) throw new Error(data?.error || "Failed to load billing");
        setBilling(data);
      }
    } catch (e: any) {
      setBilling(null);
      setBillingError(e?.message || "Failed to load billing");
    } finally {
      setBillingLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      if (entityType === "clinic") {
        const { data, error: fnErr } = await supabase.functions.invoke<AnalyticsRes>("entity-dashboard", {
          body: { action: "analytics", entityType, entityId, days: 30 },
        });
        if (fnErr) throw fnErr;
        if (!data?.ok) throw new Error(data?.error || "Failed to load analytics");
        setAnalytics(data);
      } else {
        const { data, error: fnErr } = await supabase.functions.invoke<AnalyticsRes>("facility-analytics", {
          body: { entityType, entityId, days: 30 },
        });
        if (fnErr) throw fnErr;
        if (!data?.ok) throw new Error(data?.error || "Failed to load analytics");
        setAnalytics(data);
      }
    } catch (e: any) {
      setAnalytics(null);
      setAnalyticsError(e?.message || "Failed to load analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "billing") void loadBilling();
    if (tab === "analytics") void loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, entityType, entityId]);

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
          <CardContent className="text-sm text-muted-foreground">{error || "Unable to load settings."}</CardContent>
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full md:w-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization profile</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Display name</Label>
                <Input
                  value={form.display_name ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone ?? ""} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.email ?? ""} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={form.website ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Logo URL</Label>
                <Input
                  value={form.logo_url ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, logo_url: e.target.value }))}
                />
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
                <Input
                  value={form.address_line1 ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, address_line1: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Address line 2</Label>
                <Input
                  value={form.address_line2 ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, address_line2: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={form.city ?? ""} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Input
                  value={form.region ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Postal code</Label>
                <Input
                  value={form.postal_code ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, postal_code: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={form.country ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
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
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Billing Summary</CardTitle>
                <Button variant="outline" size="sm" onClick={loadBilling} disabled={billingLoading}>
                  <RefreshCcw className={`h-4 w-4 mr-2 ${billingLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {billingLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : billingError ? (
                  <div className="text-center py-8 text-muted-foreground">{billingError}</div>
                ) : billing?.summary ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                      <p className="text-xl font-semibold">
                        {fmtMoney(billing.summary.total_paid_cents, billingCurrency)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
                      <p className="text-xl font-semibold">
                        {fmtMoney(billing.summary.outstanding_cents, billingCurrency)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm font-medium text-muted-foreground">Open Invoices</p>
                      <p className="text-xl font-semibold">{billing.summary.open_invoice_count}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No billing data available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Analytics</CardTitle>
                <Button variant="outline" size="sm" onClick={loadAnalytics} disabled={analyticsLoading}>
                  <RefreshCcw className={`h-4 w-4 mr-2 ${analyticsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : analyticsError ? (
                  <div className="text-center py-8 text-muted-foreground">{analyticsError}</div>
                ) : analytics?.kpis ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    {Object.entries(analytics.kpis).map(([key, value]) => (
                      <div key={key} className="rounded-lg border p-3">
                        <p className="text-sm font-medium text-muted-foreground capitalize">
                          {key.replace(/_/g, " ")}
                        </p>
                        <p className="text-xl font-semibold">
                          {typeof value === "number" && key.includes("revenue")
                            ? fmtMoney(value, analyticsCurrency)
                            : value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No analytics data available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
