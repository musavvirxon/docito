// File: src/components/finance/RecurringTemplatesPanel.tsx
// Step 31: Minimal UI panel to create + list recurring templates and run due items (manual trigger)

import { useEffect, useMemo, useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Play, RefreshCw, Trash2 } from "lucide-react";

type FinanceEntityType = "clinic" | "practice" | "lab" | "imaging" | "pharmacy";

type TemplateRow = {
  id: string;
  entity_type: FinanceEntityType;
  entity_id: string;
  entry_type: string;
  amount_cents: number;
  currency: string;
  category_id: string | null;
  description: string | null;
  frequency: string;
  interval: number;
  byweekday: number[] | null;
  bymonthday: number | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
  created_at: string;
};

function formatMoney(currency: string, cents: number) {
  const value = (Number(cents || 0) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function parseMoneyToCents(input: string) {
  const s = String(input || "").trim();
  if (!s) return null;
  const normalized = s.replace(/,/g, ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return Math.round(n * 100);
}

export default function RecurringTemplatesPanel(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [creating, setCreating] = useState(false);

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<"monthly" | "weekly" | "daily">("monthly");
  const [interval, setInterval] = useState("1");
  const [bymonthday, setBymonthday] = useState("1");

  const canCreate = useMemo(() => {
    const cents = parseMoneyToCents(amount);
    const intv = Number(interval);
    const dom = Number(bymonthday);
    if (cents === null || cents <= 0) return false;
    if (!Number.isFinite(intv) || intv < 1) return false;
    if (frequency === "monthly" && (!Number.isFinite(dom) || dom < 1 || dom > 31)) return false;
    if (!currency.trim()) return false;
    return true;
  }, [amount, bymonthday, currency, frequency, interval]);

  const fetchRows = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("finance_recurring_templates")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRows((data || []) as TemplateRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load recurring templates");
    } finally {
      setLoading(false);
    }
  };

  const createRow = async () => {
    if (!entityId) return;
    if (!canCreate) return;

    setCreating(true);
    try {
      const cents = parseMoneyToCents(amount)!;
      const intv = Number(interval);
      const dom = Number(bymonthday);

      const { data: userResp, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userResp?.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const insertPayload: any = {
        entity_type: entityType,
        entity_id: entityId,
        entry_type: "expense",
        amount_cents: cents,
        currency: currency.trim().toUpperCase(),
        category_id: null,
        description: description.trim() || null,
        frequency,
        interval: intv,
        byweekday: null,
        bymonthday: frequency === "monthly" ? dom : null,
        start_date: new Date().toISOString().slice(0, 10),
        is_active: true,
        created_by: uid,
      };

      const { error } = await supabase.from("finance_recurring_templates").insert(insertPayload);
      if (error) throw error;

      toast.success("Recurring expense created");
      setAmount("");
      setDescription("");
      await fetchRows();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create recurring template");
    } finally {
      setCreating(false);
    }
  };

  const runNow = async () => {
    if (!entityId) return;
    try {
      const { data, error } = await supabase.functions.invoke("finance-run-recurring", {
        body: { entityType, entityId },
      });
      if (error) throw error;
      if (data && (data as any).ok === false) throw new Error((data as any).error || "Failed to run recurring");

      const count = Number((data as any)?.count || 0);
      toast.success(count > 0 ? `Posted ${count} recurring entries` : "No recurring entries due");
      await fetchRows();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to run recurring");
    }
  };

  const deleteRow = async (id: string) => {
    try {
      const { error } = await supabase.from("finance_recurring_templates").delete().eq("id", id);
      if (error) throw error;
      toast.success("Removed recurring template");
      await fetchRows();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to delete template");
    }
  };

  useEffect(() => {
    void fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  return (
    <Card className="border-muted">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-base">Recurring expenses</CardTitle>
          <div className="text-sm text-muted-foreground">
            Utilities, rent, taxes, maintenance — generate ledger entries automatically.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void fetchRows()} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
          <Button variant="default" onClick={() => void runNow()} className="gap-2">
            <Play className="h-4 w-4" />
            Run due
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-md border p-4 space-y-3">
          <div className="text-sm font-medium">Create recurring expense</div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input inputMode="decimal" placeholder="100.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <Input placeholder="USD" value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Frequency</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Every</Label>
              <Input inputMode="numeric" placeholder="1" value={interval} onChange={(e) => setInterval(e.target.value)} />
              <div className="text-xs text-muted-foreground">
                {frequency === "monthly" ? "month(s)" : frequency === "weekly" ? "week(s)" : "day(s)"}
              </div>
            </div>
          </div>

          {frequency === "monthly" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Day of month</Label>
                <Input
                  inputMode="numeric"
                  placeholder="1"
                  value={bymonthday}
                  onChange={(e) => setBymonthday(e.target.value)}
                />
                <div className="text-xs text-muted-foreground">1–31 (auto-clamps to last day).</div>
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input
                  placeholder="Electricity bill"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Description</Label>
              <Input placeholder="Utilities" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={() => void createRow()} disabled={!canCreate || creating} className="gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No recurring templates yet.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {r.description || "Recurring expense"} — {formatMoney(r.currency, r.amount_cents)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.frequency} · every {r.interval} · next: {r.next_run_at ? new Date(r.next_run_at).toLocaleString() : "—"}
                  </div>
                </div>
                <Button variant="outline" onClick={() => void deleteRow(r.id)} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
