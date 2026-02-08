// File: src/components/financial/CompensationProfilesPanel.tsx

import { useMemo, useState } from "react";
import { Plus, RefreshCw, Pencil, Trash2, Settings2 } from "lucide-react";
import { toast } from "sonner";

import type { FinanceEntityType } from "@/components/financial/FinanceHub";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useCompensationProfiles, type CompensationProfileRow } from "@/hooks/useCompensationProfiles";
import CompensationProfileDialog, { type CompensationProfileDraft } from "@/components/financial/CompensationProfileDialog";

type CompType = "salary" | "hourly";

const formatCurrency = (cents: number | null | undefined, currency: string = "USD") => {
  const v = Number(cents || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(v);
  } catch {
    return `${v.toFixed(2)} ${currency}`;
  }
};

interface Props {
  entityType: FinanceEntityType;
  entityId: string;
}

export default function CompensationProfilesPanel({ entityType, entityId }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CompensationProfileRow | null>(null);

  const { rows, loading, refresh } = useCompensationProfiles({ entityType, entityId });

  const currency = useMemo(() => {
    const any = rows.find((r) => r.currency)?.currency;
    return (any || "USD").toUpperCase();
  }, [rows]);

  const handleCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const handleEdit = (row: CompensationProfileRow) => {
    setEditing(row);
    setOpen(true);
  };

  const handleDelete = async (row: CompensationProfileRow) => {
    const ok = window.confirm("Deactivate this profile? (Recommended) Click Cancel to keep it.\n\nNote: Delete is permanent.");
    if (!ok) return;

    try {
      // safer: deactivate instead of delete
      const { error } = await supabase
        .from("staff_compensation_profiles")
        .update({ is_active: false })
        .eq("id", row.id);

      if (error) throw error;

      toast.success("Profile deactivated");
      await refresh();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to update profile");
    }
  };

  const handleSave = async (draft: CompensationProfileDraft) => {
    const payload: any = {
      entity_type: entityType,
      entity_id: entityId,
      user_id: draft.userId,
      compensation_type: draft.compensationType,
      payout_frequency: draft.payoutFrequency,
      effective_from: draft.effectiveFrom,
      is_active: draft.isActive,
      notes: draft.notes || null,
    };

    // store currency for display / future use (not enforced by DB; kept in metadata-style column? none exists)
    // we store currency by writing finance entries separately; still useful in UI; keep it in notes only.
    // Do not add schema changes here.

    if (draft.compensationType === "salary") {
      payload.salary_amount_cents = draft.salaryAmountCents;
      payload.salary_period = draft.salaryPeriod;
      payload.hourly_rate_cents = null;
    } else {
      payload.hourly_rate_cents = draft.hourlyRateCents;
      payload.salary_amount_cents = null;
      payload.salary_period = null;
    }

    try {
      if (editing?.id) {
        const { error } = await supabase.from("staff_compensation_profiles").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Compensation updated");
      } else {
        const { error } = await supabase.from("staff_compensation_profiles").insert(payload);
        if (error) throw error;
        toast.success("Compensation created");
      }

      setOpen(false);
      setEditing(null);
      await refresh();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save compensation profile");
      throw e;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-base font-semibold">Compensation profiles</h3>
          <Badge variant="secondary">Per staff member</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading} className="gap-2">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Add profile
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active profiles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[240px]">User</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[220px]">Rate</TableHead>
                  <TableHead className="w-[140px]">Payout</TableHead>
                  <TableHead className="w-[140px]">Effective</TableHead>
                  <TableHead className="w-[120px]">Active</TableHead>
                  <TableHead className="text-right w-[110px]">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      Loading profiles…
                    </TableCell>
                  </TableRow>
                )}

                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No profiles yet. Add one to enable payroll generation.
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  rows.map((r) => {
                    const t = r.compensation_type as CompType;
                    const rate =
                      t === "salary"
                        ? `${formatCurrency(r.salary_amount_cents, currency)} / ${r.salary_period || "monthly"}`
                        : `${formatCurrency(r.hourly_rate_cents, currency)} / hour`;

                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm font-medium">{r.user_id}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {t}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{rate}</TableCell>
                        <TableCell className="text-sm capitalize">{r.payout_frequency}</TableCell>
                        <TableCell className="text-sm">{r.effective_from}</TableCell>
                        <TableCell className="text-sm">{r.is_active ? "Yes" : "No"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(r)} aria-label="Edit">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(r)} aria-label="Deactivate">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CompensationProfileDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
        initialRow={editing}
        currencyDefault={currency}
        onSave={handleSave}
      />
    </div>
  );
}
