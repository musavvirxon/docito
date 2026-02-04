import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EnhancedDentalChart } from "@/components/dental";

const formSchema = z.object({
  procedure_id: z.string().min(1, "Please select a procedure"),
  unit_cost_override: z.number().min(0).optional(),
  notes: z.string().optional(),
});

interface Procedure {
  id: string;
  name: string;
  category: string;
  type: string;
  default_cost?: number | null;
  notes?: string | null;
}

interface AddProcedureToPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treatmentPlanId: string;
  onSuccess: () => void;
}

const AddProcedureToPlanModal = ({ open, onOpenChange, treatmentPlanId, onSuccess }: AddProcedureToPlanModalProps) => {
  const [loading, setLoading] = useState(false);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [showChart, setShowChart] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      procedure_id: "",
      unit_cost_override: undefined,
      notes: "",
    },
  });

  const filteredProcedures = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return procedures;
    return procedures.filter((p) => (p.name || "").toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q));
  }, [procedures, searchTerm]);

  const unitCost = useMemo(() => {
    const override = form.getValues("unit_cost_override");
    if (typeof override === "number" && !Number.isNaN(override)) return override;
    return Number(selectedProcedure?.default_cost || 0);
  }, [selectedProcedure, form]);

  const teethQty = useMemo(() => {
    if (selectedProcedure?.type === "tooth_based" && selectedTeeth.length > 0) return selectedTeeth.length;
    return 1;
  }, [selectedProcedure?.type, selectedTeeth.length]);

  const totalCost = useMemo(() => Number(unitCost || 0) * Number(teethQty || 1), [unitCost, teethQty]);

  useEffect(() => {
    if (!open) return;

    const fetchProcedures = async () => {
      try {
        const { data: plan, error: planError } = await supabase
          .from("treatment_plans")
          .select("doctor_id")
          .eq("id", treatmentPlanId)
          .single();

        if (planError) throw planError;
        if (!plan?.doctor_id) {
          setProcedures([]);
          return;
        }

        let q = supabase.from("procedures").select("*").eq("doctor_id", plan.doctor_id);

        // try active=true; fallback to is_active=true if needed
        let { data, error } = await (q as any).eq("active", true).order("name");
        if (error && String((error as any)?.message || "").toLowerCase().includes("active")) {
          const res2 = await (supabase as any)
            .from("procedures")
            .select("*")
            .eq("doctor_id", plan.doctor_id)
            .eq("is_active", true)
            .order("name");
          data = res2.data;
          error = res2.error;
        }
        if (error) throw error;

        setProcedures((data || []) as Procedure[]);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ? `Failed to load procedures: ${e.message}` : "Failed to load procedures");
        setProcedures([]);
      }
    };

    fetchProcedures();
  }, [open, treatmentPlanId]);

  const toggleTooth = (toothNumber: number) => {
    setSelectedTeeth((prev) => (prev.includes(toothNumber) ? prev.filter((t) => t !== toothNumber) : [...prev, toothNumber]));
  };

  const handleProcedureSelect = (procedure: Procedure) => {
    setSelectedProcedure(procedure);
    form.setValue("procedure_id", procedure.id, { shouldValidate: true });
    setSelectedTeeth([]);
    form.setValue("unit_cost_override", undefined);
  };

  const refreshPlanTotalCost = async () => {
    const { data, error } = await supabase
      .from("treatment_plan_procedures")
      .select("cost")
      .eq("treatment_plan_id", treatmentPlanId);

    if (error) throw error;

    const sum = (data || []).reduce((acc: number, row: any) => acc + Number(row?.cost || 0), 0);
    const { error: updErr } = await supabase.from("treatment_plans").update({ total_cost: sum }).eq("id", treatmentPlanId);
    if (updErr) throw updErr;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!selectedProcedure) return toast.error("Please select a procedure");

    if (selectedProcedure.type === "tooth_based" && selectedTeeth.length === 0) {
      return toast.error("Please select at least one tooth");
    }

    setLoading(true);

    try {
      const { data: existing, error: seqErr } = await supabase
        .from("treatment_plan_procedures")
        .select("sequence_order")
        .eq("treatment_plan_id", treatmentPlanId)
        .order("sequence_order", { ascending: false })
        .limit(1);

      if (seqErr) throw seqErr;

      const nextSequenceOrder = existing && existing.length > 0 ? Number(existing[0].sequence_order || 0) + 1 : 1;

      const insertRow: any = {
        treatment_plan_id: treatmentPlanId,
        procedure_id: values.procedure_id,
        sequence_order: nextSequenceOrder,
        status: "pending",
        notes: values.notes || null,
        tooth_numbers: selectedProcedure.type === "tooth_based" ? (selectedTeeth.length ? selectedTeeth : null) : null,
        cost: totalCost,
      };

      const { error } = await supabase.from("treatment_plan_procedures").insert([insertRow]);
      if (error) throw error;

      await refreshPlanTotalCost();

      toast.success("Procedure added to treatment plan");
      form.reset();
      setSelectedProcedure(null);
      setSelectedTeeth([]);
      setSearchTerm("");
      setShowChart(false);
      onSuccess();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ? `Failed to add procedure: ${e.message}` : "Failed to add procedure");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedProcedure(null);
    setSelectedTeeth([]);
    setSearchTerm("");
    setShowChart(false);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Procedure to Treatment Plan</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Select Procedure</h3>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input placeholder="Search procedures..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
              {filteredProcedures.map((procedure) => (
                <Card
                  key={procedure.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedProcedure?.id === procedure.id ? "ring-2 ring-primary" : ""}`}
                  onClick={() => handleProcedureSelect(procedure)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{procedure.name}</h4>
                      <span className="text-sm font-medium text-primary">${Number(procedure.default_cost || 0)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {procedure.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {procedure.type}
                      </Badge>
                    </div>
                    {procedure.notes && <p className="text-sm text-muted-foreground mt-2 truncate">{procedure.notes}</p>}
                  </CardContent>
                </Card>
              ))}

              {filteredProcedures.length === 0 && <div className="text-sm text-muted-foreground">No procedures match your search.</div>}
            </div>
          </div>

          {selectedProcedure && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Procedure Details</h3>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-medium">{selectedProcedure.name}</h4>
                          <div className="flex gap-2 mt-2">
                            <Badge>{selectedProcedure.category}</Badge>
                            <Badge variant="outline">{selectedProcedure.type}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Unit</div>
                          <div className="font-semibold">${unitCost.toFixed(2)}</div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-sm">
                        <div className="text-muted-foreground">
                          Qty: <span className="font-medium text-foreground">{teethQty}</span>
                          {selectedProcedure.type === "tooth_based" ? " (teeth)" : ""}
                        </div>
                        <div>
                          Total: <span className="font-semibold">${totalCost.toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <FormField
                  control={form.control}
                  name="unit_cost_override"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Cost Override (USD)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={String(Number(selectedProcedure.default_cost || 0))}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">For tooth-based procedures, total cost = unit × number of selected teeth.</p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Any specific notes for this procedure in this treatment plan..." className="min-h-[80px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedProcedure.type === "tooth_based" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FormLabel>Tooth Selection</FormLabel>
                      <Button type="button" size="sm" variant="outline" onClick={() => setShowChart((v) => !v)}>
                        {showChart ? "Hide chart" : "Show chart"}
                      </Button>
                    </div>

                    {!showChart && selectedTeeth.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedTeeth
                          .slice()
                          .sort((a, b) => a - b)
                          .map((t) => (
                            <Badge key={t} variant="secondary" className="text-xs">
                              {t}
                            </Badge>
                          ))}
                      </div>
                    )}

                    {showChart && <EnhancedDentalChart selectionOnly isEditable selectedTeeth={selectedTeeth} onToothSelect={toggleTooth} />}
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Adding..." : "Add to Plan"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddProcedureToPlanModal;
