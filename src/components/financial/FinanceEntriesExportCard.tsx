// File: src/components/financial/FinanceEntriesExportCard.tsx
import { useMemo, useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { FileDown, Loader2, Download } from "lucide-react";

type FinanceEntityType = "clinic" | "practice" | "lab" | "imaging" | "pharmacy";
type EntryTypeFilter = "all" | "income" | "expense" | "payroll";

type ExportRow = {
  occurred_at: string;
  entry_type: string;
  amount_cents: number;
  currency: string;
  category_id: string | null;
  category_name: string | null;
  description: string | null;
  reference: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function escapeCsvCell(v: unknown) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const keys = rows.length ? Object.keys(rows[0]) : [];
  const header = keys.map(escapeCsvCell).join(",");
  const lines = rows.map((r) => keys.map((k) => escapeCsvCell((r as any)[k])).join(","));
  const content = [header, ...lines].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatMoney(currency: string, cents: number) {
  const v = (Number(cents || 0) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(v);
  } catch {
    const sign = v < 0 ? "-" : "";
    return `${sign}${currency || "USD"} ${Math.abs(v).toFixed(2)}`;
  }
}

export default function FinanceEntriesExportCard(props: { entityType: FinanceEntityType; entityId: string; defaultDays?: number }) {
  const { entityType, entityId } = props;
  const days = Math.max(1, Math.min(props.defaultDays ?? 90, 3650));

  const today = useMemo(() => new Date(), []);
  const [dateTo, setDateTo] = useState(() => isoDate(today));
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return isoDate(d);
  });

  const [entryType, setEntryType] = useState<EntryTypeFilter>("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const canExport = useMemo(() => {
    if (!entityId) return false;
    if (!dateFrom || !dateTo) return false;
    if (dateFrom > dateTo) return false;
    return true;
  }, [entityId, dateFrom, dateTo]);

  const doExport = async () => {
    if (!canExport) return;

    setExporting(true);
    try {
      const { data, error } = await supabase.rpc("finance_entries_export", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_limit: 50000,
        p_entry_type: entryType === "all" ? null : entryType,
        p_category_id: categoryId === "all" ? null : categoryId,
      });

      if (error) throw error;

      const rows = ((data || []) as any[]) as ExportRow[];

      const csvRows = rows.map((r) => ({
        occurred_at: r.occurred_at ?? "",
        entry_type: r.entry_type ?? "",
        amount: r.amount_cents == null ? "" : (Number(r.amount_cents || 0) / 100).toFixed(2),
        currency: r.currency ?? "",
        category: r.category_name ?? "",
        description: r.description ?? "",
        reference: r.reference ?? "",
        created_at: r.created_at ?? "",
        updated_at: r.updated_at ?? "",
      }));

      const filename = `finance_entries_${entityType}_${entityId.slice(0, 8)}_${dateFrom}_to_${dateTo}.csv`;
      downloadCsv(filename, csvRows);

      const total = rows.reduce((acc, r) => acc + (Number(r.amount_cents || 0) || 0), 0);
      toast.success(`Exported ${csvRows.length} rows · total ${formatMoney(rows[0]?.currency || "USD", total)}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to export finance entries");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="border-muted">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="h-4 w-4 text-muted-foreground" />
          Export finance entries
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Download your ledger entries as CSV for accounting, auditing, or deeper analysis.
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-12">
          <div className="space-y-1 md:col-span-3">
            <Label>From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>

          <div className="space-y-1 md:col-span-3">
            <Label>To</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          <div className="space-y-1 md:col-span-3">
            <Label>Type</Label>
            <Select value={entryType} onValueChange={(v) => setEntryType(v as EntryTypeFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="payroll">Payroll</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 md:col-span-3">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => void doExport()} disabled={!canExport || exporting} className="gap-2 w-full md:w-auto">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Export CSV
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          Tip: export monthly ranges and share with your accountant. Filters help isolate payroll vs supplies vs utilities.
        </div>
      </CardContent>
    </Card>
  );
}
