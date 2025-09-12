import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ToothSelector from "./ToothSelector";

const formSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  type: z.string().optional(),
  default_cost: z.number().optional(),
  notes: z.string().optional(),
  tooth_range: z.array(z.number()).optional(),
});

interface Procedure {
  id: string;
  name: string;
  category: string;
  type: string;
  default_cost: number;
  notes?: string;
  tooth_range?: number[];
}

interface EditProcedureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  procedure: Procedure;
  onSuccess: () => void;
}

const EditProcedureModal = ({ open, onOpenChange, procedure, onSuccess }: EditProcedureModalProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>(procedure.tooth_range || []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: procedure.name,
      category: procedure.category,
      type: procedure.type,
      default_cost: procedure.default_cost || undefined,
      notes: procedure.notes || "",
      tooth_range: procedure.tooth_range || [],
    },
  });

  useEffect(() => {
    form.reset({
      name: procedure.name,
      category: procedure.category,
      type: procedure.type,
      default_cost: procedure.default_cost || undefined,
      notes: procedure.notes || "",
      tooth_range: procedure.tooth_range || [],
    });
    setSelectedTeeth(procedure.tooth_range || []);
  }, [procedure, form]);

  const categoryOptions = [
    { value: "restorative", label: "Restorative" },
    { value: "surgical", label: "Surgical" },
    { value: "orthodontic", label: "Orthodontic" },
    { value: "periodontal", label: "Periodontal" },
    { value: "endodontic", label: "Endodontic" },
    { value: "prosthodontic", label: "Prosthodontic" },
    { value: "oral_surgery", label: "Oral Surgery" },
    { value: "preventive", label: "Preventive" },
    { value: "cosmetic", label: "Cosmetic" },
    { value: "other", label: "Other" }
  ];

  const typeOptions = [
    { value: "tooth_based", label: "Tooth-based" },
    { value: "oral_cavity_region", label: "Oral Cavity Region" }
  ];

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const updateData = {
        name: values.name,
        category: values.category as any,
        type: values.type as any,
        default_cost: values.default_cost || null,
        notes: values.notes || null,
        tooth_range: selectedTeeth.length > 0 ? selectedTeeth : null,
      };

      const { error } = await supabase
        .from("procedures")
        .update(updateData)
        .eq("id", procedure.id);

      if (error) throw error;

      toast.success("Procedure updated successfully");
      onSuccess();
    } catch (error: any) {
      toast.error("Failed to update procedure: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Procedure</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Procedure Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Dental Crown" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category*</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type*</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {typeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="default_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Cost (USD)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional notes about this procedure..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("type") === "tooth_based" && (
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Procedure"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProcedureModal;