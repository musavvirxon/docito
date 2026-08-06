import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCurrency } from "@/hooks/useCurrency";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Treatment plan the completed procedure belongs to (used to resolve patient/practice). */
  planId: string;
  /** treatment_plan_procedures.id — stored on the charge for traceability. */
  planProcedureId?: string | null;
  procedureName?: string | null;
  toothNumbers?: number[] | null;
  /** Pre-filled amount when a price list value is available. */
  suggestedAmount?: number | null;
  onCreated?: () => void;
}

/**
 * Confirmation prompt shown when a treatment-plan procedure is marked completed.
 * Never records a charge silently — the clinician confirms the amount first.
 */
export function CreateChargeFromProcedureDialog({
  open,
  onOpenChange,
  planId,
  planProcedureId,
  procedureName,
  toothNumbers,
  suggestedAmount,
  onCreated,
}: Props) {
  const { t } = useTranslation("finance");
  const { currency } = useCurrency();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const teeth = (toothNumbers ?? []).filter(Boolean);
    setDescription(
      [procedureName || t("procedure"), teeth.length ? `#${teeth.join(", #")}` : ""]
        .filter(Boolean)
        .join(" "),
    );
    setAmount(suggestedAmount && suggestedAmount > 0 ? String(suggestedAmount) : "");
  }, [open, procedureName, JSON.stringify(toothNumbers ?? []), suggestedAmount]);

  const handleSave = async () => {
    const n = Number(amount);
    if (!description.trim() || !Number.isFinite(n) || n <= 0) {
      toast.error(t("enterAmount"));
      return;
    }
    setSaving(true);
    try {
      const { data: plan } = await (supabase as any)
        .from("treatment_plans")
        .select("patient_id, practice_id")
        .eq("id", planId)
        .maybeSingle();

      const { error } = await (supabase as any).from("billing_transactions").insert({
        patient_id: plan?.patient_id ?? null,
        user_id: plan?.patient_id ?? null,
        practice_id: plan?.practice_id ?? null,
        amount: Math.round(n),
        amount_cents: Math.round(n * 100),
        currency: (currency || "uzs").toLowerCase(),
        transaction_type: "charge",
        status: "pending",
        description: description.trim(),
        metadata: {
          source: "treatment_plan_procedure",
          treatment_plan_id: planId,
          treatment_plan_procedure_id: planProcedureId ?? null,
          tooth_numbers: toothNumbers ?? null,
        },
      });
      if (error) throw error;
      toast.success(t("saveSuccess"));
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      toast.error(e?.message || t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("ledger.addCharge", "Add charge")}</DialogTitle>
          <DialogDescription>
            {t(
              "ledger.chargeFromProcedure",
              "This procedure was marked completed. Confirm the amount to record a charge.",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("description")}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("enterDescription")}
            />
          </div>
          <div>
            <Label>{t("amount")}</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("enterAmount")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("ledger.skipCharge", "Not now")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateChargeFromProcedureDialog;
