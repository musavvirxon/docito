// File: src/components/staff/CompensationProfilesPanel.tsx
// Step 36: Admin UI to create/update staff compensation profiles

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, Save, Plus, Users } from "lucide-react";

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";

type ProfileRow = {
  id: string;
  entity_type: FinanceEntityType;
  entity_id: string;
  staff_user_id: string;

  compensation_type: "salary" | "hourly" | "commission";
  pay_frequency: "hourly" | "daily" | "weekly" | "monthly" | "per_event";

  currency: string;

  salary_amount_cents: number;
  hourly_rate_cents: number;

  commission_bps: number;
  commission_category_id: string | null;
  commission_requires_paid: boolean;

  effective_from: string;
  effective_to: string | null;

  is_active: boolean;
  notes: string | null;
  created_at: string;
};

type CategoryRow = {
  id: string;
  name: string;
  kind: "income" | "expense" | "payroll";
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
  if (!s) return 0;
  const normalized = s.replace(/,/g, ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return Math.round(n * 100);
}

function parseBps(input: string) {
  const s = String(input || "").trim();
  if (!s) return 0;
  const n = Number(s.replace(/,/g, "."));
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  if (n > 100) return null;
  return Math.round(n * 100); // percent to bps
}

function bpsToPercentString(bps: number) {
  const v = (Number(bps || 0) || 0) / 100;
  return v.toFixed(2);
}

export default function CompensationProfilesPanel(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  // Create form
  const [staffUserId, setStaffUserId] = useState("");
  const [compType, setCompType] = useState<ProfileRow["compensation_type"]>("salary");
  const [payFreq, setPayFreq] = useState<ProfileRow["pay_frequency"]>("monthly");
  const [currency, setCurrency] = useState("USD");
  const [salaryAmount, setSalaryAmount] = useState(""); // major
  const [hourlyRate, setHourlyRate] = useState(""); // major
  const [commissionPct, setCommissionPct] = useState(""); // percent string
  const [commissionCategoryId, setCommissionCategoryId] = useState<string>("");
  const [commissionRequiresPaid, setCommissionRequiresPaid] = useState(true);

  const canCreate = useMemo(() => {
    if (!entityId) return false;
    if (!staffUserId.trim()) return false;
    // basic uuid check
    if (!/^[0-9a-f-]{36}$/i.test(staffUserId.trim())) return false;

    if (!currency.trim()) return false;

    if (compType === "salary") {
      const cents = parseMoneyToCents(salaryAmount);
      return cents !== null && cents >= 0;
    }
    if (compType === "hourly") {
      const cents = parseMoneyToCents(hourlyRate);
      return cents !== null && cents >= 0;
    }
    if (compType === "commission") {
      const bps = parseBps(commissionPct);
      return bps !== null && bps >= 0 && bps <= 10000;
    }
    return false;
  }, [compType, commissionPct, currency, entityId, hourlyRate, salaryAmount, staffUserId]);

  const fetchAll = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const [{ data: prof, error: pErr }, { data: cats, error: cErr }] = await Promise.all([
        supabase
          .from("staff_compensation_profiles")
          .select(
            "id,entity_type,entity_id,staff_user_id,compensation_type,pay_frequency,currency,salary_amount_cents,hourly_rate_cents,commission_bps,commission_category_id,commission_requires_paid,effective_from,effective_to,is_active,notes,created_at",
          )
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .order("created_at", { ascending: false }),
        supabase
          .from("finance_categories")
          .select("id,name,kind")
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .order("kind", { ascending: true })
          .order("name", { ascending: true }),
      ]);

      if (pErr) throw pErr;
      if (cErr) throw cErr;

      setProfiles((prof || []) as ProfileRow[]);
      setCategories((cats || []) as CategoryRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load compensation profiles");
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    if (!canCreate) return;
    setSaving(true);
    try {
      const { data: userResp, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userResp?.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const payload: any = {
        entity_type: entityType,
        entity_id: entityId,
        staff_user_id: staffUserId.trim(),
        compensation_type: compType,
        pay_frequency: payFreq,
        currency: currency.trim().toUpperCase(),
        salary_amount_cents: 0,
        hourly_rate_cents: 0,
        commission_bps: 0,
        commission_category_id: null,
        commission_requires_paid: Boolean(commissionRequiresPaid),
        effective_from: new Date().toISOString().slice(0, 10),
        is_active: true,
        created_by: uid,
      };

      if (compType === "salary") {
        const cents = parseMoneyToCents(salaryAmount);
        if (cents === null) throw new Error("Invalid salary amount");
        payload.salary_amount_cents = cents;
      } else if (compType === "hourly") {
        const cents = parseMoneyToCents(hourlyRate);
        if (cents === null) throw new Error("Invalid hourly rate");
        payload.hourly_rate_cents = cents;
      } else {
        const bps = parseBps(commissionPct);
        if (bps === null) throw new Error("Invalid commission percent");
        payload.commission_bps = bps;
        payload.commission_category_id = commissionCategoryId.trim() ? commissionCategoryId.trim() : null;
      }

      // Enforce one active per staff via unique partial index; if violated, admin must deactivate old one first.
      const { error } = await supabase.from("staff_compensation_profiles").insert(payload);
      if (error) throw error;

      toast.success("Compensation profile created");
      setStaffUserId("");
      setSalaryAmount("");
      setHourlyRate("");
      setCommissionPct("");
      setCommissionCategoryId("");
      await fetchAll();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create profile");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: ProfileRow, next: boolean) => {
    setSaving(true);
    try {
      const patch = next
        ? { is_active: true, effective_to: null }
        : { is_active: false, effective_to: new Date().toISOString().slice(0, 10) };

      const { error } = await supabase.from("staff_compensation_profiles").update(patch).eq("id", p.id);
      if (error) throw error;

      toast.success(next ? "Activated" : "Deactivated");
      await fetchAll();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const renderTypeBadge = (p: ProfileRow) => {
    const t = p.compensation_type;
    if (t === "salary") return `Salary · ${formatMoney(p.currency, p.salary_amount_cents)}/${p.pay_frequency}`;
    if (t === "hourly") return `Hourly · ${formatMoney(p.currency, p.hourly_rate_cents)}/hour`;
    return `Commission · ${bpsToPercentString(p.commission_bps)}%`;
  };

  useEffect(() => {
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  return (
    <Card className="border-muted">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Staff compensation
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Define salary, hourly, or commission with payment frequency. Used for payroll generation.
          </div>
        </div>

        <Button variant="outline" onClick={() => void fetchAll()} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-md border p-4 space-y-3">
          <div className="text-sm font-medium">Create compensation profile</div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1 md:col-span-2">
              <Label>Staff user ID</Label>
              <Input placeholder="uuid" value={staffUserId} onChange={(e) => setStaffUserId(e.target.value)} />
              <div className="text-xs text-muted-foreground">Paste the staff user uuid (auth.users.id).</div>
            </div>

            <div className="space-y-1">
              <Label>Type</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={compType}
                onChange={(e) => setCompType(e.target.value as any)}
              >
                <option value="salary">Salary</option>
                <option value="hourly">Hourly</option>
                <option value="commission">Commission</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label>Pay frequency</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={payFreq}
                onChange={(e) => setPayFreq(e.target.value as any)}
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
                <option value="hourly">Hourly</option>
                <option value="per_event">Per event</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label>Currency</Label>
              <Input placeholder="USD" value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>

            {compType === "salary" ? (
              <div className="space-y-1 md:col-span-3">
                <Label>Salary amount ({currency.toUpperCase()})</Label>
                <Input inputMode="decimal" placeholder="1000.00" value={salaryAmount} onChange={(e) => setSalaryAmount(e.target.value)} />
              </div>
            ) : compType === "hourly" ? (
              <div className="space-y-1 md:col-span-3">
                <Label>Hourly rate ({currency.toUpperCase()})</Label>
                <Input inputMode="decimal" placeholder="10.00" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
              </div>
            ) : (
              <div className="grid gap-3 md:col-span-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>Commission %</Label>
                  <Input inputMode="decimal" placeholder="10" value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)} />
                  <div className="text-xs text-muted-foreground">0–100</div>
                </div>

                <div className="space-y-1">
                  <Label>Eligible income category</Label>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={commissionCategoryId}
                    onChange={(e) => setCommissionCategoryId(e.target.value)}
                  >
                    <option value="">All income</option>
                    {categories
                      .filter((c) => c.kind === "income")
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={commissionRequiresPaid}
                      onChange={(e) => setCommissionRequiresPaid(e.target.checked)}
                    />
                    Requires paid revenue
                  </Label>
                  <div className="text-xs text-muted-foreground">If true, commission will only be based on paid income.</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void createProfile()} disabled={!canCreate || saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </Button>
          </div>
        </div>

        {profiles.length === 0 ? (
          <div className="text-sm text-muted-foreground">No compensation profiles yet.</div>
        ) : (
          <div className="space-y-2">
            {profiles.map((p) => (
              <div key={p.id} className="rounded-md border p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-medium">{renderTypeBadge(p)}</div>
                  <div className="text-xs text-muted-foreground">
                    staff: <span className="font-mono">{p.staff_user_id}</span> · active:{" "}
                    <span className="font-medium">{p.is_active ? "yes" : "no"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.is_active ? (
                    <Button variant="outline" onClick={() => void toggleActive(p, false)} disabled={saving} className="gap-2">
                      <Save className="h-4 w-4" />
                      Deactivate
                    </Button>
                  ) : (
                    <Button onClick={() => void toggleActive(p, true)} disabled={saving} className="gap-2">
                      <Save className="h-4 w-4" />
                      Activate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-md border p-3 bg-muted/20">
          <div className="text-sm font-medium">Notes</div>
          <div className="text-xs text-muted-foreground mt-1 space-y-1">
            <div>• Only one active profile per staff per entity is allowed.</div>
            <div>• Salary: paid by frequency (monthly/weekly/daily). Hourly: calculated from attendance minutes.</div>
            <div>• Commission: calculated from finance income entries (optionally only paid).</div>
            <div>• Next step will generate payroll items automatically from profiles + attendance + income.</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
