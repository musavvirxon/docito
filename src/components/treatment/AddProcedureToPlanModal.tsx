// src/components/treatment/AddProcedureToPlanModal.tsx
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Loader2 } from "lucide-react";
import { EnhancedDentalChart } from "@/components/dental";

type ProcedureRow = Database["public"]["Tables"]["procedures"]["Row"];

const formSchema = z.object({
  procedure_id: z.string().min(1, "Please select a procedure"),
  // unit cost override (per tooth for tooth_based procedures)
  unit_cost: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().nonnegative().optional()
  ),
  notes: z.string().optional(),
});

interface AddProcedureToPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treatmentPlanId: string;
  onSuccess?: () => void;
}

export default function AddProcedureToPlanModal({
  open,
  onOpenChange,
  treatmentPlanId,
  onSuccess,
}: AddProcedureToPlanModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingProcedures, setLoadingProcedures] = useState(false);
  const [procedures, setProcedures] = useState<ProcedureRow[]>([]);
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      procedure_id: "",
      unit_cost: undefined,
      notes: "",
    },
  });

  const selectedProcedureId = form.watch("procedure_id");
  const selectedProcedure = useMemo(
    () => procedures.find((p) => p.id === selectedProcedureId) || null,
    [procedures, selectedProcedureId]
  );

  const isToothBased = selectedProcedure?.type === "tooth_based";
  const unitCost = Number(form.watch("unit_cost") ?? selectedProcedure?.default_cost ?? 0);
  const quantity = isToothBased ? selectedTeeth.length : 1;
  const lineCost = unitCost * (isToothBased ? quantity : 1);

  // Load procedures for THIS treatment plan's doctor
  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setLoadingProcedures(true);
      try {
        // 1) Get plan.doctor_id (doctors.id)
        const { data: plan, error: planErr } = await supabase
          .from("treatment_plans")
          .select("doctor_id")
          .eq("id", treatmentPlanId)
          .single();

        if (planErr) throw planErr;

        const doctorId = plan?.doctor_id;

        const tryFetch = async (ownerColumn: "dentist_id" | "doctor_id", activeColumn?: "is_active" | "active") => {
          let q = supabase.from("procedures").select("*").order("name");
          if (doctorId) q = q.eq(ownerColumn as any, doctorId);
          if (activeColumn) q = q.eq(activeColumn as any, true);
          const { data, error } = await q;
          return { data: (data as ProcedureRow[]) || [], error };
        };

        // Try the most common schema first (dentist_id + is_active)
        let res = await tryFetch("dentist_id", "is_active");
        if (res.error && String((res.error as any).message || "").toLowerCase().includes("is_active")) {
          res = await tryFetch("dentist_id", "active");
        }
        if (res.error) {
          // Legacy schema might use doctor_id on procedures
          res = await tryFetch("doctor_id", "is_active");
          if (res.error && String((res.error as any).message || "").toLowerCase().includes("is_active")) {
            res = await tryFetch("doctor_id", "active");
          }
        }
        if (res.error) {
          // Last fallback: fetch without active filter
          res = await tryFetch("dentist_id");
        }
        if (res.error) throw res.error;

        const cleaned = (res.data || []).filter((p: any) => p.is_active !== false && p.active !== false);
        setProcedures(cleaned);
      } catch (e: any) {
        console.error(e);
        setProcedures([]);
        toast.error(e?.message || "Failed to load procedures");
      } finally {
        setLoadingProcedures(false);
      }
    };

    load();
  }, [open, treatmentPlanId]);

  // When procedure changes: default unit cost to procedure.default_cost and clear teeth if not tooth based
  useEffect(() => {
    if (!open) return;

    if (selectedProcedure) {
      form.setValue("unit_cost", Number(selectedProcedure.default_cost || 0), { shouldValidate: true });
      if (selectedProcedure.type !== "tooth_based") setSelectedTeeth([]);
    } else {
      form.setValue("unit_cost", undefined, { shouldValidate: false });
      setSelectedTeeth([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProcedureId, open]);

  const resetAndClose = () => {
    form.reset();
    setSelectedTeeth([]);
    onOpenChange(false);
  };

  const toggleTooth = (tooth: number) => {
    setSelectedTeeth((prev) => (prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth]));
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (!values.procedure_id) return;

      const proc = procedures.find((p) => p.id === values.procedure_id);
      const toothBased = proc?.type === "tooth_based";

      if (toothBased && selectedTeeth.length === 0) {
        toast.error("Please select at least one tooth for this procedure");
        return;
      }

      setLoading(true);

      const unit = Number(values.unit_cost ?? proc?.default_cost ?? 0);
      const qty = toothBased ? selectedTeeth.length : 1;
      const cost = unit * (toothBased ? qty : 1);

      // sequence_order = last+1
      const { data: lastRow } = await supabase
        .from("treatment_plan_procedures")
        .select("sequence_order")
        .eq("treatment_plan_id", treatmentPlanId)
        .order("sequence_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextSequence = Number((lastRow as any)?.sequence_order ?? 0) + 1;

      const { error: insErr } = await supabase.from("treatment_plan_procedures").insert({
        treatment_plan_id: treatmentPlanId,
        procedure_id: values.procedure_id,
        tooth_numbers: toothBased ? selectedTeeth : null,
        cost,
        notes: values.notes || null,
        status: "pending",
        sequence_order: nextSequence,
      } as any);

      if (insErr) throw insErr;

      // Recompute plan total_cost
      const { data: rows, error: sumErr } = await supabase
        .from("treatment_plan_procedures")
        .select("cost")
        .eq("treatment_plan_id", treatmentPlanId);

      if (sumErr) throw sumErr;

      const total = (rows || []).reduce((acc: number, r: any) => acc + Number(r.cost || 0), 0);
      await supabase.from("treatment_plans").update({ total_cost: total }).eq("id", treatmentPlanId);

      toast.success("Procedure added to treatment plan");
      onSuccess?.();
      resetAndClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to add procedure");
    } finally {
      setLoading(false);
    }
  };

  const selectedTeethLabel = selectedTeeth.length
    ? [...selectedTeeth].sort((a, b) => a - b).join(", ")
    : "—";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetAndClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Procedure to Treatment Plan</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="procedure_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Procedure *</FormLabel>
                    <FormControl>
                      <select
                        className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                        value={field.value}
                        onChange={field.onChange}
                        disabled={loadingProcedures || procedures.length === 0}
                      >
                        <option value="">
                          {loadingProcedures
                            ? "Loading procedures..."
                            : procedures.length
                              ? "Select a procedure"
                              : "No procedures found"}
                        </option>
                        {procedures.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} • ${Number(p.default_cost || 0).toFixed(2)} • {Number(p.duration_minutes || 30)} min
                            {p.type === "tooth_based" ? " • per tooth" : ""}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedProcedure && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{selectedProcedure.category || "general"}</Badge>
                  <Badge variant="outline">{selectedProcedure.type || "single_visit"}</Badge>
                  {isToothBased && <Badge variant="outline">Tooth-based pricing</Badge>}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unit_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Cost Override (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={selectedProcedure ? String(selectedProcedure.default_cost || 0) : "0"}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">For tooth-based procedures, this is the price **per tooth**.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <div className="text-sm font-medium">Calculated Price</div>
                  <div className="rounded-md border p-3">
                    {selectedProcedure ? (
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span>Unit</span>
                          <span>${unitCost.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Quantity</span>
                          <span>{isToothBased ? `${quantity} tooth${quantity === 1 ? "" : "es"}` : "1"}</span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between font-medium">
                          <span>Total</span>
                          <span>${lineCost.toFixed(2)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Select a procedure to see price</div>
                    )}
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any notes for this item..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedProcedure && isToothBased && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Select Teeth *</div>
                  <EnhancedDentalChart selectionOnly isEditable selectedTeeth={selectedTeeth} onToothSelect={toggleTooth} />
                  <p className="text-xs text-muted-foreground">Selected: {selectedTeethLabel}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetAndClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || loadingProcedures || !selectedProcedure}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Plan
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
