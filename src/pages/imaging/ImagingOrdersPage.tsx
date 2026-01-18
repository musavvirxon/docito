// Path: src/pages/imaging/ImagingOrdersPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useStaffContext } from "@/hooks/useStaffContext";
import { useRealtimeImagingOrders } from "@/hooks/useRealtimeImagingOrders";

type ImagingOrderRow = {
  referral_id: string;
  imaging_center_id: string;
  workflow_status: string;
  priority: string | null;
  scheduled_time: string | null;
  assigned_staff_id: string | null;
  updated_at?: string | null;
};

function badgeVariant(status: string) {
  const s = String(status || "").toLowerCase();
  if (s.includes("complete")) return "default";
  if (s.includes("progress")) return "secondary";
  if (s.includes("pending") || s.includes("new")) return "outline";
  return "outline";
}

export default function ImagingOrdersPage() {
  const { permissions } = useStaffContext();
  const imagingCenterId = (permissions as any)?.entity_id || null;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ImagingOrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    if (!imagingCenterId) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error } = await (supabase.from as any)("imaging_order_state")
      .select("referral_id,imaging_center_id,workflow_status,priority,scheduled_time,assigned_staff_id,updated_at")
      .eq("imaging_center_id", imagingCenterId)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows((data || []) as any);
    }
    setLoading(false);
  }, [imagingCenterId]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useRealtimeImagingOrders({
    enabled: true,
    imagingCenterId,
    onChange: () => fetchRows(),
  });

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.workflow_status, (map.get(r.workflow_status) || 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle>Imaging Orders</CardTitle>
            <Button variant="outline" onClick={fetchRows} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {counts.map(([k, v]) => (
              <Badge key={k} variant="outline">
                {k}: {v}
              </Badge>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-10">No imaging orders.</div>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.referral_id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={badgeVariant(r.workflow_status) as any}>{r.workflow_status}</Badge>
                      {r.priority ? <Badge variant="secondary">{r.priority}</Badge> : null}
                      <div className="font-medium">Referral: {r.referral_id}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Updated: {r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}
                      {r.scheduled_time ? ` • Scheduled: ${new Date(r.scheduled_time).toLocaleString()}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
