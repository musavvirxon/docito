// File: src/components/financial/BudgetEditorPanel.tsx
// B3: Budget editor UI (period + planned expense lines) -> calls Edge Function finance-budget-upsert
// - Keeps styling consistent with existing panels
// - Creates expense categories automatically by name via Edge Function

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, Save, Plus, Trash2, CalendarDays } from "lucide-react";

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";

type CategoryRow = {
  id: string;
  name: string;
  kind: "income" | "expense" | "payroll";
};

type ExistingPeriod = {
  id: string;
  currency: string;
  label: string | null;
  notes: string | null;
};

type ExistingLine = {
  id: string;
  category_id: string;
  planned_amount_cents: number;
  notes: string | null;
  categories?: { id: string; name: string } | null;
};

type DraftLine = {
  key: string;
  categoryId: string | "";
  categoryName: string;
  plannedMajor: string; // entered in major units (e.g. 10.50)
  notes: string;
};

function uuidLike() {
  // cheap stable key for client-only row keys
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function yyyyMmDd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthPeriod(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: yyyyMmDd(start), end: yyyyMmDd(end) };
}

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

export default function BudgetEditorPanel(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<CategoryRow[]>([]);

  const [month, setMonth] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`; // YYYY-MM
  });

  const [currency, setCurrency] = useState("USD");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");

  const [draftLines, setDraftLines] = useState<DraftLine[]>([
    { key: uuidLike(), categoryId: "", categoryName: "Supplies", plannedMajor: "", notes: "" },
    { key: uuidLike(), categoryId: "", categoryName: "Electricity", plannedMajor: "", notes: "" },
    { key: uuidLike(), categoryId: "", categoryName: "Water", plannedMajor: "", notes: "" },
    { key: uuidLike(), categoryId: "", categoryName: "Gas/Heating", plannedMajor: "", notes: "" },
    { key: uuidLike(), categoryId: "", categoryName: "Taxes", plannedMajor: "", notes: "" },
  ]);

  const { periodStart, periodEnd } = useMemo(() => {
    const [y, m] = month.split("-").map((x) => Number(x));
    const d = new Date(Number.isFinite(y) ? y : new Date().getFullYear(), Number.isFinite(m) ? m - 1 : new Date().getMonth(), 1);
    return monthPeriod(d);
  }, [month]);

  const totalPlannedCents = useMemo(() => {
    return draftLines.reduce((sum, l) => {
      const cents = parseMajorToCents(l.plannedMajor);
      if (cents === null) return sum;
      return sum + cents;
    }, 0);
  }, [draftLines]);

  const canSave = useMemo(() => {
    if (!entityId) return false;
    if (!/^\d{4}-\d{2}$/.test(month)) return false;

    // At least one valid line
    const any = draftLines.some((l) => {
      const cents = parseMajorToCents(l.plannedMajor);
      const hasCat = (l.categoryId && l.categoryId.trim()) || l.categoryName.trim();
      return cents !== null && hasCat;
    });

    if (!any) return false;

    // All non-empty planned values must be valid
    for (const l of draftLines) {
      const cents = parseMajorToCents(l.plannedMajor);
      if (l.plannedMajor.trim() && cents === null) return false;
      const hasCat = (l.categoryId && l.categoryId.trim()) || l.categoryName.trim();
      if (!hasCat) return false;
    }

    return true;
  }, [draftLines, entityId, month]);

  const fetchForPeriod = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      // Fetch expense categories
      const { data: cats, error: cErr } = await supabase
        .from("finance_categories")
        .select("id,name,kind")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("kind", "expense")
        .order("name", { ascending: true });

      if (cErr) throw cErr;
      setCategories((cats || []) as CategoryRow[]);

      // Find period
      const { data: p, error: pErr } = await supabase
        .from("finance_budget_periods")
        .select("id,currency,label,notes")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("period_start", periodStart)
        .eq("period_end", periodEnd)
        .maybeSingle();

      if (pErr) throw pErr;

      if (!p?.id) {
        // No existing period -> keep draft defaults
        setCurrency("USD");
        setLabel("");
        setNotes("");
        return;
      }

      const period = p as ExistingPeriod;
      setCurrency(String(period.currency || "USD").toUpperCase());
      setLabel(period.label ?? "");
      setNotes(period.notes ?? "");

      // Load lines for that period
      const { data: lines, error: lErr } = await supabase
        .from("finance_budget_lines")
        .select("id,category_id,planned_amount_cents,notes,categories:category_id(id,name)")
        .eq("budget_period_id", period.id)
        .order("planned_amount_cents", { ascending: false });

      if (lErr) throw lErr;

      const mapped: DraftLine[] = (lines || []).map((ln: any) => ({
        key: uuidLike(),
        categoryId: String(ln.category_id),
        categoryName: ln?.categories?.name ? String(ln.categories.name) : "",
        plannedMajor: centsToMajorString(Number(ln.planned_amount_cents || 0)),
        notes: ln?.notes ? String(ln.notes) : "",
      }));

      setDraftLines(mapped.length > 0 ? mapped : draftLines);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load budget");
    } finally {
      setLoading(false);
    }
  };

  const saveBudget = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payloadLines = draftLines.map((l) => {
        const cents = parseMajorToCents(l.plannedMajor);
        if (cents === null) throw new Error("Invalid planned amount");
        if (!l.categoryId.trim() && !l.categoryName.trim()) throw new Error("Each line requires category");
        return {
          categoryId: l.categoryId.trim() ? l.categoryId.trim() : undefined,
          categoryName: l.categoryId.trim() ? undefined : l.categoryName.trim(),
          plannedAmountCents: cents,
          notes: l.notes.trim() ? l.notes.trim() : undefined,
        };
      });

      const { data, error } = await supabase.functions.invoke("finance-budget-upsert", {
        body: {
          entityType,
          entityId,
          periodStart,
          periodEnd,
          currency: currency.trim().toUpperCase(),
          label: label.trim() ? label.trim() : undefined,
          notes: notes.trim() ? notes.trim() : undefined,
          lines: payloadLines,
        },
      });

      if (error) throw error;
      if (data && (data as any).ok === false) throw new Error((data as any).error || "Failed to save budget");

      toast.success("Budget saved");
      await fetchForPeriod();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save budget");
    } finally {
      setSaving(false);
    }
  };

  const addLine = () => {
    setDraftLines((prev) => [...prev, { key: uuidLike(), categoryId: "", categoryName: "", plannedMajor: "", notes: "" }]);
  };

  const removeLine = (key: string) => {
    setDraftLines((prev) => prev.filter((l) => l.key !== key));
  };

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setDraftLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  useEffect(() => {
    void fetchForPeriod();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId, periodStart, periodEnd]);

  return (
    <Card className="border-muted">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Budgets
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Plan expenses (supplies, taxes, utilities) and compare later with actual spend.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void fetchForPeriod()} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>

          <Button onClick={() => void saveBudget()} disabled={!canSave || saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label>Month</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Currency</Label>
            <Input placeholder="USD" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>Label (optional)</Label>
            <Input placeholder="e.g. January budget" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>

          <div className="space-y-1 md:col-span-4">
            <Label>Notes (optional)</Label>
            <Input placeholder="Optional notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="rounded-md border p-3 bg-muted/20">
          <div className="text-sm font-medium">Period</div>
          <div className="text-xs text-muted-foreground mt-1">
            {periodStart} → {periodEnd} · Total planned:{" "}
            <span className="font-medium">
              {(() => {
                try {
                  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.trim().toUpperCase() }).format(
                    totalPlannedCents / 100,
                  );
                } catch {
                  return `${currency.toUpperCase()} ${(totalPlannedCents / 100).toFixed(2)}`;
                }
              })()}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Budget lines</div>
            <Button variant="outline" onClick={addLine} className="gap-2">
              <Plus className="h-4 w-4" />
              Add line
            </Button>
          </div>

          <div className="space-y-2">
            {draftLines.map((l) => {
              const usingId = Boolean(l.categoryId.trim());
              const cents = parseMajorToCents(l.plannedMajor);
              const amountOk = cents !== null;

              return (
                <div key={l.key} className="rounded-md border p-3 grid gap-3 md:grid-cols-12 md:items-end">
                  <div className="md:col-span-4 space-y-1">
                    <Label>Category</Label>
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={l.categoryId}
                      onChange={(e) => {
                        const cid = e.target.value;
                        const name = cid
                          ? categories.find((c) => c.id === cid)?.name ?? ""
                          : "";
                        updateLine(l.key, { categoryId: cid, categoryName: name });
                      }}
                    >
                      <option value="">(New by name)</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {!usingId ? (
                      <Input
                        placeholder="Category name (e.g. Supplies)"
                        value={l.categoryName}
                        onChange={(e) => updateLine(l.key, { categoryName: e.target.value })}
                      />
                    ) : null}
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <Label>Planned amount ({currency.toUpperCase()})</Label>
                    <Input
                      inputMode="decimal"
                      placeholder="0.00"
                      value={l.plannedMajor}
                      onChange={(e) => updateLine(l.key, { plannedMajor: e.target.value })}
                    />
                    {!amountOk ? <div className="text-xs text-destructive">Invalid amount</div> : null}
                  </div>

                  <div className="md:col-span-4 space-y-1">
                    <Label>Notes</Label>
                    <Input
                      placeholder="Optional"
                      value={l.notes}
                      onChange={(e) => updateLine(l.key, { notes: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-1 flex justify-end">
                    <Button variant="outline" onClick={() => removeLine(l.key)} className="gap-2">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-md border p-3 bg-muted/20">
          <div className="text-sm font-medium">How it works</div>
          <div className="text-xs text-muted-foreground mt-1 space-y-1">
            <div>• If you pick an existing category, it uses that.</div>
            <div>• If you leave category blank and type a name, the backend will create an expense category automatically.</div>
            <div>• Next steps will show “Budget vs Actual” using finance expense entries in the same period.</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
