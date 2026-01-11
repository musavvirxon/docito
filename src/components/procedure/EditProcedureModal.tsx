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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ToothSelector from "./ToothSelector";
import { CalendarPlus, Plus, Trash2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Procedure name is required"),
  category: z.string().min(1, "Category is required"),
  type: z.string().min(1, "Type is required"),
  default_cost: z.number().min(0, "Cost must be a positive number").refine(val => val !== undefined, "Cost is required"),
  notes: z.string().optional(),
  tooth_range: z.array(z.number()).optional(),
  has_followup: z.boolean().default(false),
  followup_count: z.number().min(1).max(10).optional(),
  followup_interval_days: z.number().min(1).max(365).optional(),
  followup_intervals_days: z.array(z.number()).optional(),
});

interface Procedure {
  id: string;
  name: string;
  category: string;
  type: string;
  default_cost: number;
  notes?: string;
  tooth_range?: number[];
  has_followup?: boolean;
  followup_count?: number;
  followup_interval_days?: number;
  followup_intervals_days?: number[];
}

interface EditProcedureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  procedure: Procedure;
  onSuccess: () => void;
  categories?: { value: string; label: string }[];
  types?: { value: string; label: string }[];
}

const EditProcedureModal = ({ 
  open, 
  onOpenChange, 
  procedure, 
  onSuccess,
  categories = [],
  types = []
}: EditProcedureModalProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>(procedure.tooth_range || []);
  const [hasFollowup, setHasFollowup] = useState(procedure.has_followup || false);
  const [useDifferentIntervals, setUseDifferentIntervals] = useState(
    (procedure.followup_intervals_days?.length || 0) > 0
  );
  const [individualIntervals, setIndividualIntervals] = useState<number[]>(
    procedure.followup_intervals_days || []
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: procedure.name,
      category: procedure.category,
      type: procedure.type,
      default_cost: procedure.default_cost || undefined,
      notes: procedure.notes || "",
      tooth_range: procedure.tooth_range || [],
      has_followup: procedure.has_followup || false,
      followup_count: procedure.followup_count || 1,
      followup_interval_days: procedure.followup_interval_days || 7,
      followup_intervals_days: procedure.followup_intervals_days || [],
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
      has_followup: procedure.has_followup || false,
      followup_count: procedure.followup_count || 1,
      followup_interval_days: procedure.followup_interval_days || 7,
      followup_intervals_days: procedure.followup_intervals_days || [],
    });
    setSelectedTeeth(procedure.tooth_range || []);
    setHasFollowup(procedure.has_followup || false);
    setUseDifferentIntervals((procedure.followup_intervals_days?.length || 0) > 0);
    setIndividualIntervals(procedure.followup_intervals_days || []);
  }, [procedure, form]);

  // Update individual intervals when followup count changes
  useEffect(() => {
    const count = form.watch("followup_count") || 1;
    if (useDifferentIntervals && individualIntervals.length !== count) {
      const defaultInterval = form.watch("followup_interval_days") || 7;
      const newIntervals = Array.from({ length: count }, (_, i) => 
        individualIntervals[i] || defaultInterval
      );
      setIndividualIntervals(newIntervals);
    }
  }, [form.watch("followup_count"), useDifferentIntervals]);

  const handleIntervalChange = (index: number, value: number) => {
    const newIntervals = [...individualIntervals];
    newIntervals[index] = value;
    setIndividualIntervals(newIntervals);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const updateData: any = {
        name: values.name,
        category: values.category as any,
        type: values.type as any,
        default_cost: values.default_cost || null,
        notes: values.notes || null,
        tooth_range: selectedTeeth.length > 0 ? selectedTeeth : null,
        has_followup: hasFollowup,
        followup_count: hasFollowup ? values.followup_count : null,
        followup_interval_days: hasFollowup && !useDifferentIntervals ? values.followup_interval_days : null,
        followup_intervals_days: hasFollowup && useDifferentIntervals ? individualIntervals : null,
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
                        {categories.map((option) => (
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
                        {types.map((option) => (
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
                  <FormLabel>Default Cost (USD)*</FormLabel>
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

            {/* Follow-up Section */}
            <Card className="border-blue-200 bg-blue-50/30 dark:bg-blue-950/20">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarPlus className="w-4 h-4 text-blue-600" />
                    <Label htmlFor="followup-toggle" className="font-medium cursor-pointer">
                      Schedule Follow-up Appointments
                    </Label>
                  </div>
                  <Switch
                    id="followup-toggle"
                    checked={hasFollowup}
                    onCheckedChange={(checked) => {
                      setHasFollowup(checked);
                      form.setValue("has_followup", checked);
                    }}
                  />
                </div>

                {hasFollowup && (
                  <div className="space-y-4 pt-2">
                    <FormField
                      control={form.control}
                      name="followup_count"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Follow-ups</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="10"
                              value={field.value ?? 1}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center gap-2">
                      <Switch
                        id="different-intervals-toggle"
                        checked={useDifferentIntervals}
                        onCheckedChange={(checked) => {
                          setUseDifferentIntervals(checked);
                          if (checked) {
                            const count = form.watch("followup_count") || 1;
                            const defaultInterval = form.watch("followup_interval_days") || 7;
                            setIndividualIntervals(Array.from({ length: count }, () => defaultInterval));
                          }
                        }}
                      />
                      <Label htmlFor="different-intervals-toggle" className="text-sm cursor-pointer">
                        Use different intervals between visits
                      </Label>
                    </div>

                    {!useDifferentIntervals ? (
                      <FormField
                        control={form.control}
                        name="followup_interval_days"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Days Between Appointments</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                max="365"
                                value={field.value ?? 7}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 7)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <div className="space-y-3">
                        <Label>Days Between Each Visit</Label>
                        {individualIntervals.map((interval, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground w-24">
                              Visit {index + 1} → {index + 2}:
                            </span>
                            <Input
                              type="number"
                              min="1"
                              max="365"
                              value={interval}
                              onChange={(e) => handleIntervalChange(index, parseInt(e.target.value) || 7)}
                              className="w-24"
                            />
                            <span className="text-sm text-muted-foreground">days</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {hasFollowup && form.watch("followup_count") && (
                      <p className="text-sm text-muted-foreground">
                        {form.watch("followup_count")} follow-up appointment(s) will be suggested
                        {useDifferentIntervals 
                          ? " with custom intervals between each visit."
                          : `, each ${form.watch("followup_interval_days") || 7} day(s) after the previous one.`
                        }
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

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