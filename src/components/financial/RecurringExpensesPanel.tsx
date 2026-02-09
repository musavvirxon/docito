// File: src/components/financial/RecurringExpensesPanel.tsx
// B8: UI to manage recurring expense templates (utilities/taxes/supplies)
// - Create/update/delete templates
// - Toggle autopost and active
// - DB trigger from B6 auto-maintains next_run_at
// - Manual "Run now" uses Edge Function finance-recurring-run

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, Plus, Save, PlayCircle, Trash2, CalendarClock } from "lucide-react";

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";

type CategoryRow = {
  id: string;
  name: string;
  kind: "income" | "expense" | "payroll";
};

type RecurringRow = {
  id: string;
  category_id: string;
  amount_cents: number;
  currency: string;
  description: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  weekday: number | null;
  day_of_month: number | null;
  month_of_year: number | null;
  autopost: boolean;
  is_active: boolean;
  last_posted_at: string | null;
  next_run_at: string;
  notes: string | null;
  created_at: string;
};

function parseMajorToCents(v: string) {
  const s = String(v || "").trim();
  if (!s) return 0;
  const n = Number(s.replace(/,/g, "."));
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return Math.round(n * 100);
}

function centsToMajorString(cents: number) {
  const v = (Number(cents || 0) || 0) / 100;
  return v.toFixed(2);
}

function formatMoney(currency: string, cents: number) {
  const v = (Number(cents || 0) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(v);
  } catch {
    return `${currency} ${v.toFixed(2)}`;
  }
}

function weekdayLabel(n: number) {
  const map = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return map[n] ?? String(n);
}

function monthLabel(n: number) {
  const map = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return map[n - 1] ?? String(n);
}

export default function RecurringExpensesPanel(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [rows, setRows] = useState<RecurringRow[]>([]);

  // Create form
  const [categoryId, setCategoryId] = useState<string>("");
  const [currency, setCurrency] = useState("USD");
  const [amountMajor, setAmountMajor] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<RecurringRow["frequency"]>("monthly");
  const [weekday, setWeekday] = useState<number>(1); // Mon
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [monthOfYear, setMonthOfYear] = useState<number>(1);
  const [autopost, setAutopost] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const canCreate = useMemo(() => {
    if (!entityId) return false;
    if (!categoryId.trim()) return false;
    const cents = parseMajorToCents(amountMajor);
    if (cents === null) return false;
    if (!currency.trim()) return false;
    if (!description.trim()) return false;

    if (frequency === "weekly" && !(weekday >= 0 && weekday <= 6)) return false;
    if (frequency === "monthly" && !(dayOfMonth >= 1 && dayOfMonth <= 31)) return false;
    if (frequency === "yearly" && !(monthOfYear >= 1 && monthOfYear <= 12 && dayOfMonth >= 1 && dayOfMonth <= 31)) return false;

    return true;
  }, [amountMajor, categoryId, currency, dayOfMonth, description, entityId, frequency, monthOfYear, weekday]);

  const fetchAll = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const [{ data: cats, error: cErr }, { data: rec, error: rErr }] = await Promise.all([
        supabase
          .from("finance_categories")
          .select("id,name,kind")
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .eq("kind", "expense")
          .order("name", { ascending: true }),
        supabase
          .from("finance_recurring_expenses")
          .select(
            "id,category_id,amount_cents,currency,description,frequency,weekday,day_of_month,month_of_year,autopost,is_active,last_posted_at,next_run_at,notes,created_at",
          )
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .order("is_active", { ascending: false })
          .order("autopost", { ascending: false })
          .order("next_run_at", { ascending: true })
          .limit(500),
      ]);

      if (cErr) throw cErr;
      if (rErr) throw rErr;

      setCategories((cats || []) as CategoryRow[]);
      setRows((rec || []) as RecurringRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load recurring expenses");
      setCategories([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const createRecurring = async () => {
    if (!canCreate) return;
    try {
      const cents = parseMajorToCents(amountMajor);
      if (cents === null) throw new Error("Invalid amount");

      const { data: u, error: uErr } = await supabase.auth.getUser();
      if (uErr) throw uErr;
      const uid = u?.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const payload: any = {
        entity_type: entityType,
        entity_id: entityId,
        category_id: categoryId,
        amount_cents: cents,
        currency: currency.trim().toUpperCase(),
        description: description.trim(),
        frequency,
        weekday: frequency === "weekly" ? weekday : null,
        day_of_month: frequency === "monthly" || frequency === "yearly" ? dayOfMonth : null,
        month_of_year: frequency === "yearly" ? monthOfYear : null,
        autopost,
        is_active: isActive,
        created_by: uid,
      };

      const { error } = await supabase.from("finance_recurring_expenses").insert(payload);
      if (error) throw error;

      toast.success("Recurring expense created");
      setAmountMajor("");
      setDescription("");
      setAutopost(false);
      setIsActive(true);
      await fetchAll();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create recurring expense");
    }
  };

  const patchRow = async (id: string, patch: Partial<RecurringRow>) => {
    setSavingId(id);
    try {
      const { error } = await supabase.from("finance_recurring_expenses").update(patch).eq("id", id);
      if (error) throw error;

      toast.success("Saved");
      await fetchAll();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save changes");
    } finally {
      setSavingId(null);
    }
  };

  const deleteRow = async (id: string) => {
    setSavingId(id);
    try {
      const { error } = await supabase.from("finance_recurring_expenses").delete().eq("id", id);
      if (error) throw error;

      toast.success("Deleted");
      await fetchAll();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to delete");
    } finally {
      setSavingId(null);
    }
  };

  const runNow = async (dryRun: boolean) => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("finance-recurring-run", {
        body: { entityType, entityId, dryRun, limit: 200 },
      });

      if (error) throw error;
      if (data && (data as any).ok === false) throw new Error((data as any).error || "Run failed");

      const created = Number((data as any)?.created ?? 0) || 0;
      const skipped = Number((data as any)?.skipped ?? 0) || 0;

      toast.success(dryRun ? `Dry run: would create ${created} (skipped ${skipped})` : `Created ${created} (skipped ${skipped})`);
      await fetchAll();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to run recurring expenses");
    } finally {
      setRunning(false);
    }
  };

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.id, c.name);
    return map;
  }, [categories]);

  useEffect(() => {
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  return (
    <Card className="border-muted">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            Recurring expenses
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Create templates for utilities/taxes/supplies and autopost them to the finance ledger.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => void fetchAll()} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>

          <Button variant="outline" onClick={() => void runNow(true)} disabled={running} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Dry run
          </Button>

          <Button onClick={() => void runNow(false)} disabled={running} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Run now
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Create */}
        <div className="rounded-md border p-4 space-y-3">
          <div className="text-sm font-medium">Create recurring expense</div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1 md:col-span-2">
              <Label>Expense category</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" />
            </div>

            <div className="space-y-1">
              <Label>Amount</Label>
              <Input inputMode="decimal" value={amountMajor} onChange={(e) => setAmountMajor(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1 md:col-span-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Electricity bill" />
            </div>

            <div className="space-y-1">
              <Label>Frequency</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label>Schedule</Label>
              {frequency === "weekly" ? (
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={weekday}
                  onChange={(e) => setWeekday(Number(e.target.value))}
                >
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                    <option key={d} value={d}>
                      {weekdayLabel(d)}
                    </option>
                  ))}
                </select>
              ) : frequency === "monthly" ? (
                <Input
                  inputMode="numeric"
                  value={String(dayOfMonth)}
                  onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, Number(e.target.value || 1))))}
                  placeholder="Day of month (1..31)"
                />
              ) : frequency === "yearly" ? (
                <div className="flex gap-2">
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={monthOfYear}
                    onChange={(e) => setMonthOfYear(Number(e.target.value))}
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {monthLabel(i + 1)}
                      </option>
                    ))}
                  </select>
                  <Input
                    inputMode="numeric"
                    value={String(dayOfMonth)}
                    onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, Number(e.target.value || 1))))}
                    placeholder="Day"
                  />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Every day</div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Label className="flex items-center gap-2">
              <input type="checkbox" checked={autopost} onChange={(e) => setAutopost(e.target.checked)} />
              Autopost to ledger
            </Label>

            <Label className="flex items-center gap-2">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active
            </Label>

            <div className="flex-1" />

            <Button onClick={() => void createRecurring()} disabled={!canCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No recurring expenses yet.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const busy = savingId === r.id;
              const catName = categoryNameById.get(r.category_id) || r.category_id;

              return (
                <div key={r.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">
                        {catName} · {formatMoney(r.currency, r.amount_cents)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.description} · {r.frequency}
                        {r.frequency === "weekly" && r.weekday !== null ? ` (${weekdayLabel(r.weekday)})` : ""}
                        {r.frequency === "monthly" && r.day_of_month !== null ? ` (day ${r.day_of_month})` : ""}
                        {r.frequency === "yearly" && r.month_of_year !== null && r.day_of_month !== null
                          ? ` (${monthLabel(r.month_of_year)} ${r.day_of_month})`
                          : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        next: {new Date(r.next_run_at).toLocaleString()}{" "}
                        {r.last_posted_at ? `· last: ${new Date(r.last_posted_at).toLocaleString()}` : ""}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={r.autopost}
                          onChange={(e) => void patchRow(r.id, { autopost: e.target.checked })}
                          disabled={busy}
                        />
                        Autopost
                      </Label>
                      <Label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={r.is_active}
                          onChange={(e) => void patchRow(r.id, { is_active: e.target.checked })}
                          disabled={busy}
                        />
                        Active
                      </Label>
                      <Button
                        variant="outline"
                        onClick={() => void deleteRow(r.id)}
                        disabled={busy}
                        className="gap-2"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-1">
                      <Label>Amount</Label>
                      <Input
                        inputMode="decimal"
                        defaultValue={centsToMajorString(r.amount_cents)}
                        onBlur={(e) => {
                          const cents = parseMajorToCents(e.target.value);
                          if (cents === null) {
                            toast.error("Invalid amount");
                            e.currentTarget.value = centsToMajorString(r.amount_cents);
                            return;
                          }
                          if (cents !== r.amount_cents) void patchRow(r.id, { amount_cents: cents });
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Currency</Label>
                      <Input
                        defaultValue={r.currency}
                        onBlur={(e) => {
                          const v = e.target.value.trim().toUpperCase();
                          if (!v) {
                            toast.error("Currency required");
                            e.currentTarget.value = r.currency;
                            return;
                          }
                          if (v !== r.currency) void patchRow(r.id, { currency: v });
                        }}
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <Label>Description</Label>
                      <Input
                        defaultValue={r.description}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (!v) {
                            toast.error("Description required");
                            e.currentTarget.value = r.description;
                            return;
                          }
                          if (v !== r.description) void patchRow(r.id, { description: v });
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Tip: Update schedule fields by editing the record directly for now (we’ll add a schedule editor next if needed).
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-md border p-3 bg-muted/20">
          <div className="text-sm font-medium">Notes</div>
          <div className="text-xs text-muted-foreground mt-1 space-y-1">
            <div>• Autopost only processes due rows (next_run_at ≤ now) and is idempotent per template per run day.</div>
            <div>• “Run now” posts to finance ledger as expense entries, which then appear in Budget vs Actual.</div>
            <div>• Next step can add a nicer schedule editor (weekday/day/month) inline.</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
