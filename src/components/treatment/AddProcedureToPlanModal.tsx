import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ToothSelector from "@/components/procedure/ToothSelector";

const formSchema = z.object({
  procedure_id: z.string().min(1, "Please select a procedure"),
  custom_cost: z.number().min(0, "Cost must be positive").optional(),
  custom_notes: z.string().optional(),
  tooth_numbers: z.array(z.number()).optional(),
});

interface Procedure {
  id: string;
  name: string;
  category: string;
  type: string;
  default_cost?: number;
  notes?: string;
  tooth_range?: number[];
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
  onSuccess 
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
      custom_cost: undefined,
      custom_notes: "",
      tooth_numbers: [],
    },
  });

  useEffect(() => {
    if (open) {
      fetchProcedures();
    }
  }, [open]);

  const fetchProcedures = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("procedures")
        .select("*")
        .eq("dentist_id", user.id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setProcedures(data || []);
    } catch (error: any) {
      toast.error("Failed to load procedures: " + error.message);
    }
  };

  const filteredProcedures = procedures.filter(proc =>
    proc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proc.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProcedureSelect = (procedure: Procedure) => {
    setSelectedProcedure(procedure);
    form.setValue("procedure_id", procedure.id);
    form.setValue("custom_cost", procedure.default_cost);
    setSelectedTeeth(procedure.tooth_range || []);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      // Get the current count of procedures to set sequence order
      const { data: existingProcedures } = await supabase
        .from("treatment_plan_procedures")
        .select("sequence_order")
        .eq("treatment_plan_id", treatmentPlanId)
        .order("sequence_order", { ascending: false })
        .limit(1);

      const nextSequenceOrder = existingProcedures && existingProcedures.length > 0 
        ? existingProcedures[0].sequence_order + 1 
        : 1;

      const procedureData = {
        treatment_plan_id: treatmentPlanId,
        procedure_id: values.procedure_id,
        tooth_numbers: selectedTeeth.length > 0 ? selectedTeeth : null,
        custom_cost: values.custom_cost || null,
        custom_notes: values.custom_notes || null,
        sequence_order: nextSequenceOrder,
        status: "planned" as any,
      };

      const { error } = await supabase
        .from("treatment_plan_procedures")
        .insert([procedureData]);

      if (error) throw error;

      toast.success("Procedure added to treatment plan");
      form.reset();
      setSelectedProcedure(null);
      setSelectedTeeth([]);
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Procedure to Treatment Plan</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Procedure Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Select Procedure</h3>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search procedures..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
              {filteredProcedures.map((procedure) => (
                <Card 
                  key={procedure.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedProcedure?.id === procedure.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleProcedureSelect(procedure)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{procedure.name}</h4>
                      {procedure.default_cost && (
                        <span className="text-sm font-medium text-primary">
                          ${procedure.default_cost}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {procedure.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {procedure.type}
                      </Badge>
                    </div>
                    {procedure.notes && (
                      <p className="text-sm text-muted-foreground mt-2 truncate">
                        {procedure.notes}
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
                {/* Procedure Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Procedure Details</h3>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium">{selectedProcedure.name}</h4>
                      <div className="flex gap-2 mt-2">
                        <Badge>{selectedProcedure.category}</Badge>
                        <Badge variant="outline">{selectedProcedure.type}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Custom Cost */}
                <FormField
                  control={form.control}
                  name="custom_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost Override (USD)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={selectedProcedure.default_cost?.toString() || "0.00"}
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Custom Notes */}
                <FormField
                  control={form.control}
                  name="custom_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any specific notes for this procedure in this treatment plan..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tooth Selection */}
                {selectedProcedure.type === "tooth_based" && (
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