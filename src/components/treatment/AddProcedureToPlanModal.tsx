import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ToothSelector from "@/components/procedure/ToothSelector";

const formSchema = z.object({
  procedure_id: z.string().min(1, "Select a procedure"),
  cost: z.number().optional(), // ✅ UNIT cost (per tooth if tooth_based)
  notes: z.string().optional(),
});

interface Procedure {
  id: string;
  name: string;
  category: string | null;
  type: string | null;
  default_cost?: number | null;
  price?: number | null;
  notes?: string | null;
}

interface AddProcedureToPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treatmentPlanId: string;
  onSuccess: () => void;
}

const AddProcedureToPlanModal = ({
  open,
  onOpenChange,
  treatmentPlanId,
  onSuccess,
}: AddProcedureToPlanModalProps) => {
  const [loading, setLoading] = useState(false);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      procedure_id: "",
      cost: undefined,
      notes: "",
    },
  });

  const watchedCost = form.watch("cost");

  useEffect(() => {
    if (open) fetchProcedures();
  }, [open]);

  const fetchProcedures = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("procedures")
        .select("id,name,category,type,default_cost,price,notes")
        .eq("dentist_id", user.id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setProcedures((data || []) as any);
    } catch (error: any) {
      toast.error("Failed to load procedures: " + error.message);
    }
  };

  const filteredProcedures = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return procedures.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q)
    );
  }, [procedures, searchTerm]);

  const handleProcedureSelect = (procedure: Procedure) => {
    setSelectedProcedure(procedure);
    form.setValue("procedure_id", procedure.id);
    form.setValue("cost", Number(procedure.default_cost ?? procedure.price ?? 0));
    form.setValue("notes", "");
    setSelectedTeeth([]);
  };

  const isToothBased = selectedProcedure?.type === "tooth_based";
  const qty = isToothBased ? (selectedTeeth.length || 0) : 1;

  const unitCost = Number(
    watchedCost ??
      selectedProcedure?.default_cost ??
      selectedProcedure?.price ??
      0
  );

  const lineTotal = isToothBased ? unitCost * qty : unitCost;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!selectedProcedure) return;

    if (selectedProcedure.type === "tooth_based" && selectedTeeth.length === 0) {
      toast.error("Please select at least one tooth for this procedure.");
      return;
    }

    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("treatment_plan_procedures")
        .select("sequence_order")
        .eq("treatment_plan_id", treatmentPlanId)
        .order("sequence_order", { ascending: false })
        .limit(1);

      const nextSequence =
        existing && existing.length > 0 ? (existing[0].sequence_order || 0) + 1 : 1;

      const payload = {
        treatment_plan_id: treatmentPlanId,
        procedure_id: values.procedure_id,
        tooth_numbers: selectedProcedure.type === "tooth_based" ? selectedTeeth : null,
        cost: Number(values.cost ?? selectedProcedure.default_cost ?? selectedProcedure.price ?? 0), // ✅ UNIT cost
        notes: values.notes || null,
        sequence_order: nextSequence,
        status: "pending",
      };

      const { error } = await supabase
        .from("treatment_plan_procedures")
        .insert([payload]);

      if (error) throw error;

      toast.success("Procedure added to treatment plan");
      form.reset();
      setSelectedProcedure(null);
      setSelectedTeeth([]);
      setSearchTerm("");
      onSuccess();
    } catch (error: any) {
      toast.error("Failed to add procedure: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedProcedure(null);
    setSelectedTeeth([]);
    setSearchTerm("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? handleClose() : onOpenChange(true))}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Procedure to Treatment Plan</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Procedure Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Select Procedure</h3>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search procedures..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
              {filteredProcedures.map((p) => (
                <Card
                  key={p.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedProcedure?.id === p.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => handleProcedureSelect(p)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{p.name}</h4>
                      <span className="text-sm font-medium text-primary">
                        ${Number(p.default_cost ?? p.price ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {p.category && (
                        <Badge variant="outline" className="text-xs">
                          {p.category}
                        </Badge>
                      )}
                      {p.type && (
                        <Badge variant="outline" className="text-xs">
                          {p.type}
                        </Badge>
                      )}
                    </div>
                    {p.notes && (
                      <p className="text-sm text-muted-foreground mt-2 truncate">
                        {p.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {selectedProcedure && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Cost */}
                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Unit Cost Override (USD)
                        {isToothBased && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (per tooth)
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any notes for this procedure..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tooth Selection */}
                {isToothBased && (
                  <div>
                    <FormLabel>Tooth Selection</FormLabel>
                    <div className="mt-2">
                      <ToothSelector
                        selectedTeeth={selectedTeeth}
                        onSelectionChange={setSelectedTeeth}
                      />
                    </div>
                  </div>
                )}

                {/* Pricing Preview */}
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Unit cost</span>
                      <span className="font-medium">${unitCost.toFixed(2)}</span>
                    </div>

                    {isToothBased && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Quantity (teeth)</span>
                        <span className="font-medium">{qty}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-base pt-2 border-t">
                      <span className="font-semibold">Line total</span>
                      <span className="font-bold text-primary">
                        ${lineTotal.toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || (isToothBased && selectedTeeth.length === 0)}
                  >
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
