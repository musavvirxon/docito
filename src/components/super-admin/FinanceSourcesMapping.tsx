// File: src/components/super-admin/FinanceSourcesMapping.tsx

import { useEffect, useMemo, useState } from "react";
import { DollarSign, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type EntityType = "practice" | "lab" | "pharmacy" | "imaging_center";
type DaysPreset = "7" | "30" | "90";

type FinanceSourcesResponse = {
  ok: boolean;
  error?: string;
  entityType?: EntityType;
  entityId?: string;
  window?: {
    startUtc: string;
    endExclusiveUtc: string;
    days: number;
  };
  sources?: Array<{
    key: string;
    label: string;
    supported: boolean;
    currency?: string;
    totals: { count: number; amountCents: number };
    daily: Array<{ date: string; count: number; amountCents: number }>;
    notes?: string[];
  }>;
  notes?: string[];
};

type EntityOption = { id: string; name: string };

const formatCurrency = (cents: number, currency: string = "USD") => {
  const value = (Number(cents) || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
};

const entityLabel: Record<EntityType, string> = {
  practice: "Clinic",
  lab: "Lab",
  pharmacy: "Pharmacy",
  imaging_center: "Imaging Center",
};

export default function FinanceSourcesMapping() {
  const [entityType, setEntityType] = useState<EntityType>("practice");
  const [days, setDays] = useState<DaysPreset>("30");

  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [entityId, setEntityId] = useState<string>("");

  const [manualEntityId, setManualEntityId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FinanceSourcesResponse | null>(null);

  const loadEntities = async (t: EntityType) => {
    setEntitiesLoading(true);
    setEntities([]);
    setEntityId("");

    try {
      if (t === "practice") {
        const { data, error } = await supabase.from("practices").select("id,name").order("created_at", { ascending: false }).limit(1000);
        if (error) throw error;
        setEntities((data || []).map((r: any) => ({ id: r.id, name: r.name })));
        return;
      }

      if (t === "lab") {
        const { data, error } = await supabase.from("lab_centers").select("id,name").order("created_at", { ascending: false }).limit(1000);
        if (error) throw error;
        setEntities((data || []).map((r: any) => ({ id: r.id, name: r.name })));
        return;
      }

      if (t === "pharmacy") {
        const { data, error } = await supabase.from("pharmacies").select("id,name").order("created_at", { ascending: false }).limit(1000);
        if (error) throw error;
        setEntities((data || []).map((r: any) => ({ id: r.id, name: r.name })));
        return;
      }

      if (t === "imaging_center") {
        const { data, error } = await supabase.from("imaging_centers").select("id,name").order("created_at", { ascending: false }).limit(1000);
        if (error) throw error;
        setEntities((data || []).map((r: any) => ({ id: r.id, name: r.name })));
        return;
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load entities");
      setEntities([]);
    } finally {
      setEntitiesLoading(false);
    }
  };

  useEffect(() => {
    void loadEntities(entityType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType]);

  const resolvedEntityId = (entityId || manualEntityId || "").trim();

  const loadSources = async () => {
    if (!resolvedEntityId) {
      toast.error("Select an entity or enter an Entity ID");
      return;
    }

    setLoading(true);
    setData(null);

    try {
      const { data: resp, error } = await supabase.functions.invoke<FinanceSourcesResponse>("finance-sources", {
        body: {
          entityType,
          entityId: resolvedEntityId,
          days: Number(days),
        },
      });

      if (error) throw error;
      if (!resp?.ok) throw new Error(resp?.error || "Failed to load finance sources");

      setData(resp);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load finance sources");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const charts = useMemo(() => {
    const sources = data?.sources || [];
    return sources.map((s) => {
      const currency = s.currency || "USD";
      const rows = (s.daily || []).map((d) => ({
        date: d.date,
        count: d.count || 0,
        amount: (d.amountCents || 0) / 100,
        currency,
      }));
      return { ...s, currency, rows };
    });
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Finance Sources Mapping</h2>
          <Badge variant="secondary">Step 1</Badge>
        </div>

        <Button onClick={loadSources} disabled={loading} className="gap-2">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select entity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select value={entityType} onValueChange={(v) => setEntityType(v as EntityType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="practice">Clinic (practice)</SelectItem>
                  <SelectItem value="lab">Lab (lab_center)</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="imaging_center">Imaging Center</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                {entityLabel[entityType]} revenue sources based on current DB tables.
              </div>
            </div>

            <div className="space-y-2">
              <Label>Entity</Label>
              <Select value={entityId} onValueChange={(v) => setEntityId(v)} disabled={entitiesLoading || entities.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={entitiesLoading ? "Loading..." : entities.length ? "Select entity" : "No entities found"} />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                If you can’t find it in the dropdown, paste the UUID in the field below.
              </div>
            </div>

            <div className="space-y-2">
              <Label>Days</Label>
              <Select value={days} onValueChange={(v) => setDays(v as DaysPreset)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                Window is computed in UTC.
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Manual Entity ID (UUID)</Label>
            <Input
              value={manualEntityId}
              onChange={(e) => setManualEntityId(e.target.value)}
              placeholder="e.g., 3fa85f64-5717-4562-b3fc-2c963f66afa6"
            />
          </div>
        </CardContent>
      </Card>

      {!data && !loading && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Select an entity and click <span className="font-medium text-foreground">Refresh</span> to view current revenue sources.
          </CardContent>
        </Card>
      )}

      {!!data && (
        <div className="space-y-6">
          {!!data.notes?.length && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.notes.map((n, idx) => (
                  <div key={idx} className="text-sm text-muted-foreground">
                    • {n}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {(data.sources || []).map((s) => {
            const supported = !!s.supported;
            const currency = s.currency || "USD";
            const chart = charts.find((c) => c.key === s.key);
            const total = s.totals?.amountCents || 0;
            const count = s.totals?.count || 0;

            return (
              <Card key={s.key}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{s.label}</CardTitle>
                    <div className="flex items-center gap-2">
                      {supported ? (
                        <Badge className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Supported
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Unsupported
                        </Badge>
                      )}
                      <Badge variant="secondary">{s.key}</Badge>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Total</div>
                    <div className="text-lg font-semibold">{formatCurrency(total, currency)}</div>
                    <div className="text-xs text-muted-foreground">{count} records</div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {!!s.notes?.length && (
                    <div className="space-y-1">
                      {s.notes.map((n, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground">
                          • {n}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chart?.rows || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="amount" name="Amount" dot={false} />
                        <Line type="monotone" dataKey="count" name="Count" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
