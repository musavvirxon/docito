// File: src/components/financial/CompensationProfileDialog.tsx

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export type CompensationProfileRow = {
  id: string;
  user_id: string;
  compensation_type: "salary" | "hourly";
  salary_amount_cents: number | null;
  salary_period: "monthly" | "weekly" | "daily" | null;
  hourly_rate_cents: number | null;
  payout_frequency: "monthly" | "weekly" | "daily" | "each_time";
  effective_from: string;
  is_active: boolean;
  notes: string | null;
  currency?: string | null;
};

export type CompensationProfileDraft = {
  userId: string;
  compensationType: "salary" | "hourly";
  salaryAmountCents: number | null;
  salaryPeriod: "monthly" | "weekly" | "daily" | null;
  hourlyRateCents: number | null;
  payoutFrequency: "monthly" | "weekly" | "daily" | "each_time";
  effectiveFrom: string; // YYYY-MM-DD
  isActive: boolean;
  notes: string;
};

function parseMoneyToCents(v: string) {
  const n = Number(String(v || "").split(",").join("").trim());
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function centsToMoney(cents: number | null | undefined) {
  return ((Number(cents || 0) || 0) / 100).toFixed(2);
}

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialRow: CompensationProfileRow | null;
  currencyDefault: string;
  onSave: (draft: CompensationProfileDraft) => Promise<void>;
}

export default function CompensationProfileDialog({
  open,
  onOpenChange,
  initialRow,
  currencyDefault,
  onSave,
}: Props) {
  const isEdit = !!initialRow?.id;
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState("");
  const [compType, setCompType] = useState<"salary" | "hourly">("hourly");

  const [salaryAmount, setSalaryAmount] = useState("0.00");
  const [salaryPeriod, setSalaryPeriod] = useState<"monthly" | "weekly" | "daily">("monthly");

  const [hourlyRate, setHourlyRate] = useState("0.00");

  const [payoutFrequency, setPayoutFrequency] = useState<"monthly" | "weekly" | "daily" | "each_time">("monthly");
  const [effectiveFrom, setEffectiveFrom] = useState<string>(isoToday());
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;

    if (initialRow) {
      setUserId(initialRow.user_id);
      setCompType(initialRow.compensation_type);
      setSalaryAmount(centsToMoney(initialRow.salary_amount_cents));
      setSalaryPeriod((initialRow.salary_period || "monthly") as any);
      setHourlyRate(centsToMoney(initialRow.hourly_rate_cents));
      setPayoutFrequency(initialRow.payout_frequency);
      setEffectiveFrom(initialRow.effective_from || isoToday());
      setIsActive(Boolean(initialRow.is_active));
      setNotes(initialRow.notes || "");
      return;
    }

    setUserId("");
    setCompType("hourly");
    setSalaryAmount("0.00");
    setSalaryPeriod("monthly");
    setHourlyRate("0.00");
    setPayoutFrequency("monthly");
    setEffectiveFrom(isoToday());
    setIsActive(true);
    setNotes("");
  }, [open, initialRow]);

  const rateLabel = useMemo(() => {
    return compType === "salary" ? "Salary amount" : "Hourly rate";
  }, [compType]);

  const handleSubmit = async () => {
    const uid = userId.trim();
    if (!uid || !isUuid(uid)) {
      toast.error("User ID must be a valid UUID");
      return;
    }

    if (!effectiveFrom) {
      toast.error("Effective from date is required");
      return;
    }

    const salaryCents = compType === "salary" ? parseMoneyToCents(salaryAmount) : null;
    const hourlyCents = compType === "hourly" ? parseMoneyToCents(hourlyRate) : null;

    if (compType === "salary" && (!salaryCents || salaryCents <= 0)) {
      toast.error("Salary amount must be greater than 0");
      return;
    }

    if (compType === "hourly" && (!hourlyCents || hourlyCents <= 0)) {
      toast.error("Hourly rate must be greater than 0");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        userId: uid,
        compensationType: compType,
        salaryAmountCents: compType === "salary" ? salaryCents : null,
        salaryPeriod: compType === "salary" ? salaryPeriod : null,
        hourlyRateCents: compType === "hourly" ? hourlyCents : null,
        payoutFrequency,
        effectiveFrom,
        isActive,
        notes: notes?.trim() || "",
      });

      onOpenChange(false);
    } catch {
      // onSave shows toast
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-base">{isEdit ? "Edit compensation" : "Add compensation"}</DialogTitle>
            <Badge variant="secondary" className="capitalize">
              {compType}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Used by payroll generation. For now, enter the staff user UUID (we’ll add staff picker later).
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>User ID (UUID)</Label>
              <Input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={saving || isEdit}
                placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
              />
              <div className="text-xs text-muted-foreground">
                Currency is assumed as <span className="font-medium">{currencyDefault}</span> in payroll preview.
              </div>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={compType} onValueChange={(v) => setCompType(v as any)} disabled={saving}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payout frequency</Label>
              <Select value={payoutFrequency} onValueChange={(v) => setPayoutFrequency(v as any)} disabled={saving}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="each_time">Each time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{rateLabel}</Label>
              {compType === "salary" ? (
                <Input
                  value={salaryAmount}
                  onChange={(e) => setSalaryAmount(e.target.value)}
                  disabled={saving}
                  inputMode="decimal"
                  placeholder="0.00"
                />
              ) : (
                <Input
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  disabled={saving}
                  inputMode="decimal"
                  placeholder="0.00"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Effective from</Label>
              <Input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                disabled={saving}
              />
            </div>

            {compType === "salary" ? (
              <div className="space-y-2 sm:col-span-2">
                <Label>Salary period</Label>
                <Select value={salaryPeriod} onValueChange={(v) => setSalaryPeriod(v as any)} disabled={saving}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">
                  In Step 10 payroll preview, salary is paid as full amount (no proration yet).
                </div>
              </div>
            ) : null}

            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={saving}
                placeholder="Optional"
                rows={3}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Active</Label>
              <Select
                value={isActive ? "yes" : "no"}
                onValueChange={(v) => setIsActive(v === "yes")}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                Only active profiles are included in payroll generation.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
