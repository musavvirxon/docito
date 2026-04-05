// File: src/components/financial/ReportsPanel.tsx

import { useMemo, useState } from "react";
import { Download, RefreshCw, BarChart3, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import type { FinanceEntityType } from "@/components/financial/FinanceHub";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ExportKind = "entries" | "payroll_runs";
type EntryType = "income" | "expense" | "payroll" | "transfer" | "adjustment";

type ExportResponse = {
  ok: boolean;
  error?: string;

  kind: ExportKind;
  entityType: FinanceEntityType;
  entityId: string;

  range: { from: string; to: string };

  filename: string;
  mimeType: string;
  csv: string;
  rowCount: number;
};

function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfToday() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
}

function downloadTextFile(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType || "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "export.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface Props {
  entityType: FinanceEntityType;
  entityId: string;
  locationId?: string | null;
}

export default function ReportsPanel({ entityType, entityId }: Props) {
  const today = startOfToday();
  const defaultFrom = isoDay(addDays(today, -30));
  const defaultTo = isoDay(addDays(today, 1)); // exclusive (date-only)

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);

  const [entriesTypePreset, setEntriesTypePreset] = useState<"all" | "income_costs" | "expenses_only">("income_costs");
  const [loading, setLoading] = useState(false);

  const fromIso = useMemo(() => new Date(`${fromDate}T00:00:00.000Z`).toISOString(), [fromDate]);
  const toIso = useMemo(() => new Date(`${toDate}T00:00:00.000Z`).toISOString(), [toDate]);

  const entryTypes: EntryType[] = useMemo(() => {
    if (entriesTypePreset === "expenses_only") return ["expense", "payroll"];
    if (entriesTypePreset === "income_costs") return ["income", "expense", "payroll"];
    return ["income", "expense", "payroll", "transfer", "adjustment"];
  }, [entriesTypePreset]);

  const doExport = async (kind: ExportKind) => {
    if (!entityType || !entityId) return;
    if (!fromDate || !toDate) {
      toast.error("Please select a valid date range");
      return;
    }

    setLoading(true);
    try {
      const body: any = {
        entityType,
        entityId,
        kind,
        from: fromIso,
        to: toIso,
      };

      if (kind === "entries") {
        body.entryTypes = entryTypes;
      } else {
        body.includeItems = true;
      }

      const { data, error } = await supabase.functions.invoke("finance-export", { body });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Export failed");

      if (!data.csv) {
        toast.error("No export content returned");
        return;
      }

      downloadTextFile(data.filename, data.mimeType, data.csv);
      toast.success(`Exported ${data.rowCount} rows`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-base font-semibold">Reports</h3>
          <Badge variant="secondary">Exports</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>From</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={loading} />
            </div>

            <div className="space-y-2">
              <Label>To (exclusive)</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={loading} />
            </div>

            <div className="space-y-2">
              <Label>Entry types</Label>
              <Select value={entriesTypePreset} onValueChange={(v) => setEntriesTypePreset(v as any)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income_costs">Income + costs</SelectItem>
                  <SelectItem value="expenses_only">Expenses only</SelectItem>
                  <SelectItem value="all">All types</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">Applies to “Transactions CSV”.</div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button variant="outline" onClick={() => doExport("entries")} disabled={loading} className="gap-2">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Transactions CSV
              <Download className="w-4 h-4" />
            </Button>

            <Button onClick={() => doExport("payroll_runs")} disabled={loading} className="gap-2">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Payroll CSV
              <Download className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Exports are generated with your current access permissions (RLS). If you can’t see something in the app, it
            won’t appear in the CSV.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
