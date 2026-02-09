// File: src/components/financial/FinanceLedgerPanel.tsx
// B16: Finance ledger unified list + filters + quick add (income/expense/payroll)

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { Loader2, RefreshCw, Plus, ListOrdered, ArrowUpRight, ArrowDownLeft, Briefcase } from "lucide-react";

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";
type EntryType = "income" | "expense" | "payroll";

type FinanceEntryRow = {
  id: string;
  entity_type: FinanceEntityType;
  entity_id: string;
  entry_type: EntryType;
  amount_cents: number;
  currency: string;
  occurred_at: string;
  category_id: string | null;
  description: string | null;
  metadata: any;
  created_at: string;
};

type CategoryRow = {
  id: string;
  kind: "income" | "expense" | "payroll";
  name: string;
};

function formatMoney(currency: string, cents: number) {
  const v = (Number(cents || 0) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(v);
  } catch {
    return `${currency || "USD"} ${v.toFixed(2)}`;
  }
}

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDayISO(dateStr: string) {
  // local date -> ISO string boundary (treat as local, convert to ISO)
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  const dt = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  return dt.toISOString();
}

function endOfDayISO(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  const dt = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
  return dt.toISOString();
}

function normalizeCurrency(v: string) {
  const s = String(v || "").trim().toUpperCase();
  return s || "USD";
}

function parseMajorToCents(v: string) {
  const s = String(v || "").trim();
  if (!s) return null;
  const n = Number(s.replace(/,/g, "."));
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return Math.round(n * 100);
}

function iconForType(t: EntryType) {
  if (t === "income") return <ArrowUpRight className="h-4 w-4 text-muted-foreground" />;
  if (t === "expense") return <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />;
  return <Briefcase className="h-4 w-4 text-muted-foreground" />;
}

function labelForType(t: EntryType) {
  if (t === "income") return "Income";
  if (t === "expense") return "Expense";
  return "Payroll";
}

export default function FinanceLedgerPanel(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [entries, setEntries] = useState<FinanceEntryRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  // Filters
  const today = useMemo(() => new Date(), []);
  const [dateFrom, setDateFrom] = useState(() => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30)));
  const [dateTo, setDateTo] = useState(() => isoDate(today));
  const [filterType, setFilterType] = useState<"all" | EntryType>("all");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filteredCategoryOptions = useMemo(() => {
    const list = categories || [];
    if (filterType === "all") return list;
    return list.filter((c) => c.kind === filterType);
  }, [categories, filterType]);

  // Create dialog state
  const [openCreate, setOpenCreate] = useState(false);
  const [createType, setCreateType] = useState<EntryType>("expense");
  const [createAmountMajor, setCreateAmountMajor] = useState("");
  const [createCurrency, setCreateCurrency] = useState("USD");
  const [createDate, setCreateDate] = useState(() => isoDate(today));
  const [createCategoryId, setCreateCategoryId] = useState<string>("");
  const [createCategoryName, setCreateCategoryName] = useState<string>("");
  const [createDescription, setCreateDescription] = useState("");

  const createCategoryList = useMemo(() => categories.filter((c) => c.kind === createType), [categories, createType]);

  const canCreate = useMemo(() => {
    if (!entityId) return false;
    const cents = parseMajorToCents(createAmountMajor);
    if (cents === null || cents <= 0) return false;
    if (!createCurrency.trim()) return false;
    if (!createDate.trim()) return false;
    // category: either existing id or a name to create later
    if (!createCategoryId && !createCategoryName.trim()) return false;
    return true;
  }, [createAmountMajor, createCategoryId, createCategoryName, createCurrency, createDate, entityId]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("finance_categories")
      .select("id,kind,name")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("kind", { ascending: true })
      .order("name", { ascending: true })
      .limit(1000);

    if (error) throw error;

    setCategories((data || []) as any);
  };

  const fetchEntries = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const fromIso = startOfDayISO(dateFrom);
      const toIso = endOfDayISO(dateTo);

      let q = supabase
        .from("finance_entries")
        .select("id,entity_type,entity_id,entry_type,amount_cents,currency,occurred_at,category_id,description,metadata,created_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .gte("occurred_at", fromIso)
        .lte("occurred_at", toIso)
        .order("occurred_at", { ascending: false })
        .limit(200);

      if (filterType !== "all") q = q.eq("entry_type", filterType);
      if (filterCategoryId !== "all") q = q.eq("category_id", filterCategoryId);

      const s = search.trim();
      if (s) {
        // description only (safe, indexed later)
        q = q.ilike("description", `%${s}%`);
      }

      const [entriesRes] = await Promise.all([q, fetchCategories()]);
      if (entriesRes.error) throw entriesRes.error;

      setEntries((entriesRes.data || []) as FinanceEntryRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load ledger");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const ensureCategory = async (): Promise<string> => {
    if (createCategoryId) return createCategoryId;

    const name = createCategoryName.trim();
    if (!name) throw new Error("Category required");

    // Prefer server-side helper if present (from B14). If not, fallback to insert.
    try {
      const { data, error } = await supabase.rpc("finance_ensure_category", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_kind: createType,
        p_name: name,
      });
      if (error) throw error;
      if (!data) throw new Error("Failed to create category");
      return String(data);
    } catch {
      // Fallback direct insert
      const { data: u, error: uErr } = await supabase.auth.getUser();
      if (uErr) throw uErr;
      const uid = u?.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const { data: inserted, error: insErr } = await supabase
        .from("finance_categories")
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          kind: createType,
          name,
          is_default: false,
          created_by: uid,
        })
        .select("id")
        .single();

      if (insErr) throw insErr;
      return String((inserted as any)?.id);
    }
  };

  const createEntry = async () => {
    if (!canCreate) return;
    setSaving(true);
    try {
      const cents = parseMajorToCents(createAmountMajor);
      if (cents === null || cents <= 0) throw new Error("Invalid amount");

      const { data: u, error: uErr } = await supabase.auth.getUser();
      if (uErr) throw uErr;
      const uid = u?.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const categoryId = await ensureCategory();

      const occurredAt = new Date(`${createDate}T12:00:00.000Z`).toISOString(); // stable day value

      const payload = {
        entity_type: entityType,
        entity_id: entityId,
        entry_type: createType,
        amount_cents: cents,
        currency: normalizeCurrency(createCurrency),
        occurred_at: occurredAt,
        category_id: categoryId,
        description: createDescription.trim() ? createDescription.trim() : null,
        metadata: {
          module: "manual",
        },
        created_by: uid,
      };

      const { error } = await supabase.from("finance_entries").insert(payload);
      if (error) throw error;

      toast.success(`${labelForType(createType)} entry created`);
      setOpenCreate(false);

      // Reset minimal fields
      setCreateAmountMajor("");
      setCreateDescription("");
      setCreateCategoryId("");
      setCreateCategoryName("");

      await fetchEntries();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create entry");
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let payroll = 0;
    for (const e of entries) {
      const v = Number(e.amount_cents || 0) || 0;
      if (e.entry_type === "income") income += v;
      else if (e.entry_type === "expense") expense += v;
      else payroll += v;
    }
    return { income, expense, payroll, net: income - expense - payroll };
  }, [entries]);

  const currencyHint = useMemo(() => {
    const c = entries[0]?.currency;
    return (c || "USD").toUpperCase();
  }, [entries]);

  return (
    <Card className="border-muted">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <ListOrdered className="h-4 w-4 text-muted-foreground" />
            Ledger
          </CardTitle>
          <div className="text-sm text-muted-foreground">Unified income, expense, and payroll ledger with filters and quick add.</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add entry
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add finance entry</DialogTitle>
              </DialogHeader>

              <div className="grid gap-3 md:grid-cols-12">
                <div className="space-y-1 md:col-span-4">
                  <Label>Type</Label>
                  <Select
                    value={createType}
                    onValueChange={(v) => {
                      const t = v as EntryType;
                      setCreateType(t);
                      setCreateCategoryId("");
                      setCreateCategoryName("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="payroll">Payroll</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 md:col-span-4">
                  <Label>Date</Label>
                  <Input type="date" value={createDate} onChange={(e) => setCreateDate(e.target.value)} />
                </div>

                <div className="space-y-1 md:col-span-4">
                  <Label>Currency</Label>
                  <Input value={createCurrency} onChange={(e) => setCreateCurrency(e.target.value)} placeholder="USD" />
                </div>

                <div className="space-y-1 md:col-span-6">
                  <Label>Amount</Label>
                  <Input
                    inputMode="decimal"
                    value={createAmountMajor}
                    onChange={(e) => setCreateAmountMajor(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1 md:col-span-6">
                  <Label>Category (existing)</Label>
                  <Select value={createCategoryId || "none"} onValueChange={(v) => setCreateCategoryId(v === "none" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No selection</SelectItem>
                      {createCategoryList.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 md:col-span-12">
                  <Label>Or create category (name)</Label>
                  <Input
                    value={createCategoryName}
                    onChange={(e) => {
                      setCreateCategoryName(e.target.value);
                      if (e.target.value.trim()) setCreateCategoryId("");
                    }}
                    placeholder="e.g. Utilities, Rent, VAT, Lab income"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    If you type a name here, we’ll create (or reuse) a matching category.
                  </div>
                </div>

                <div className="space-y-1 md:col-span-12">
                  <Label>Description</Label>
                  <Input value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} placeholder="Optional notes" />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setOpenCreate(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={() => void createEntry()} disabled={!canCreate || saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={() => void fetchEntries()} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="rounded-md border p-3 space-y-3">
          <div className="text-sm font-medium">Filters</div>

          <div className="grid gap-3 md:grid-cols-12">
            <div className="space-y-1 md:col-span-3">
              <Label>Date from</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label>Date to</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            <div className="space-y-1 md:col-span-3">
              <Label>Type</Label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
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
              <Select value={filterCategoryId} onValueChange={(v) => setFilterCategoryId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {filteredCategoryOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} <span className="text-muted-foreground">({c.kind})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 md:col-span-12">
              <Label>Search (description)</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to filter (then Refresh)" />
            </div>

            <div className="md:col-span-12 flex justify-end">
              <Button variant="outline" onClick={() => void fetchEntries()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Apply
              </Button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Income</div>
            <div className="text-sm font-medium">{formatMoney(currencyHint, totals.income)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Expenses</div>
            <div className="text-sm font-medium">{formatMoney(currencyHint, totals.expense)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Payroll</div>
            <div className="text-sm font-medium">{formatMoney(currencyHint, totals.payroll)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Net</div>
            <div className="text-sm font-medium">{formatMoney(currencyHint, totals.net)}</div>
          </div>
        </div>

        {/* Ledger list */}
        <div className="rounded-md border overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-muted-foreground border-b">
            <div className="col-span-3">Date</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-3">Category</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-2">Description</div>
          </div>

          {loading ? (
            <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : entries.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No entries in this range.</div>
          ) : (
            <div className="divide-y">
              {entries.map((e) => {
                const cat = e.category_id ? categories.find((c) => c.id === e.category_id)?.name : null;
                return (
                  <div key={e.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm">
                    <div className="col-span-3 font-mono">{new Date(e.occurred_at).toLocaleDateString()}</div>
                    <div className="col-span-2 flex items-center gap-2">
                      {iconForType(e.entry_type)}
                      <span>{labelForType(e.entry_type)}</span>
                    </div>
                    <div className="col-span-3 truncate">{cat || <span className="text-muted-foreground">—</span>}</div>
                    <div className="col-span-2 text-right font-medium">{formatMoney(e.currency, e.amount_cents)}</div>
                    <div className="col-span-2 truncate text-muted-foreground">{e.description || ""}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Tip: For now, type search updates require “Apply”. Next step adds live filtering + pagination + entry details drawer.
        </div>
      </CardContent>
    </Card>
  );
}
