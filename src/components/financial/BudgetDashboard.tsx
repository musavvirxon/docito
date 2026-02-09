// File: src/components/financial/BudgetDashboard.tsx
// B5: Wrapper to select a budget period for the current entity and show BudgetVsActualPanel

import { useEffect, useMemo, useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import BudgetVsActualPanel from "@/components/financial/BudgetVsActualPanel";

type FinanceEntityType = "clinic" | "practice" | "lab" | "imaging" | "pharmacy";

type PeriodRow = {
  id: string;
  period_start: string;
  period_end: string;
  label: string | null;
  currency: string;
};

export default function BudgetDashboard(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedLabel = useMemo(() => {
    const p = periods.find((x) => x.id === selectedId);
    if (!p) return null;
    return `${p.period_start} → ${p.period_end}${p.label ? ` · ${p.label}` : ""}`;
  }, [periods, selectedId]);

  const fetchPeriods = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("finance_budget_periods")
        .select("id,period_start,period_end,label,currency")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("period_start", { ascending: false })
        .limit(24);

      if (error) throw error;

      const rows = (data || []) as PeriodRow[];
      setPeriods(rows);

      if (!selectedId) {
        setSelectedId(rows[0]?.id ?? null);
      } else if (rows.length > 0 && !rows.some((r) => r.id === selectedId)) {
        setSelectedId(rows[0].id);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load budget periods");
      setPeriods([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  return (
    <div className="space-y-4">
      <Card className="border-muted">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Budget dashboard</CardTitle>
            <div className="text-sm text-muted-foreground">
              {selectedLabel ? `Selected: ${selectedLabel}` : "Select a period to view budget vs actual"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void fetchPeriods()} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading periods…
            </div>
          ) : periods.length === 0 ? (
            <div className="text-sm text-muted-foreground">No budget periods yet. Create a budget first.</div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-medium">Period</div>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={selectedId ?? ""}
                onChange={(e) => setSelectedId(e.target.value || null)}
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.period_start} → {p.period_end}
                    {p.label ? ` · ${p.label}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      <BudgetVsActualPanel budgetPeriodId={selectedId} />
    </div>
  );
}
