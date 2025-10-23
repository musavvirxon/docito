import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2, Save, Send, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProcedures } from "@/hooks/useProcedures";
import { useDoctorProfile } from "@/hooks/useDoctorProfile";
import PatientSelector from "@/components/patient/PatientSelector";
import ToothSelector from "@/components/procedure/ToothSelector";
import { cn } from "@/lib/utils";

const procedureFormSchema = z.object({
  procedure_id: z.string().min(1, "Select a procedure"),
  appointment_date: z.date().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  notes: z.string().optional(),
  tooth_numbers: z.array(z.number()).optional(),
});

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  patient_id: z.string().optional(),
  procedures: z.array(procedureFormSchema).min(1, "Add at least one procedure"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});

interface EnhancedCreateTreatmentPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preSelectedPatientId?: string;
  preSelectedAppointmentId?: string;
}

interface ProcedureItem {
  procedure_id: string;
  appointment_date?: Date;
  priority?: "low" | "medium" | "high" | "urgent";
  notes?: string;
  tooth_numbers?: number[];
}

const EnhancedCreateTreatmentPlanModal = ({
  open,
  onOpenChange,
  onSuccess,
  preSelectedPatientId,
}: EnhancedCreateTreatmentPlanModalProps) => {
  const { user } = useAuth();
  const { procedures } = useProcedures();
  const { profile } = useDoctorProfile();
  const [loading, setLoading] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [procedureItems, setProcedureItems] = useState<ProcedureItem[]>([]);
  const [editingProcedureIndex, setEditingProcedureIndex] = useState<number | null>(null);
  const [currentProcedure, setCurrentProcedure] = useState<ProcedureItem>({
    procedure_id: "",
    priority: "medium",
  });
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  const isDentist = profile?.specialty?.toLowerCase().includes("dent") || 
                    profile?.specialty?.toLowerCase().includes("oral");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      patient_id: preSelectedPatientId || "",
      procedures: [],
      priority: "medium",
    },
  });

  useEffect(() => {
    if (preSelectedPatientId) {
      form.setValue("patient_id", preSelectedPatientId);
    }
  }, [preSelectedPatientId, form]);

  useEffect(() => {
    // Calculate total cost and duration
    let cost = 0;
    let duration = 0;
    
    procedureItems.forEach(item => {
      const procedure = procedures.find(p => p.id === item.procedure_id);
      if (procedure) {
        cost += Number(procedure.default_cost || 0);
        duration += Number(procedure.duration_minutes || 30);
      }
    });
    
    setTotalCost(cost);
    setTotalDuration(duration);
  }, [procedureItems, procedures]);

  const handleAddProcedure = () => {
    if (!currentProcedure.procedure_id) {
      toast.error("Please select a procedure");
      return;
    }

    const procedureToAdd = {
      ...currentProcedure,
      tooth_numbers: selectedTeeth.length > 0 ? selectedTeeth : undefined,
    };

    if (editingProcedureIndex !== null) {
      const updated = [...procedureItems];
      updated[editingProcedureIndex] = procedureToAdd;
      setProcedureItems(updated);
      setEditingProcedureIndex(null);
    } else {
      setProcedureItems([...procedureItems, procedureToAdd]);
    }

    // Reset
    setCurrentProcedure({ procedure_id: "", priority: "medium" });
    setSelectedTeeth([]);
  };

  const handleEditProcedure = (index: number) => {
    const procedure = procedureItems[index];
    setCurrentProcedure(procedure);
    setSelectedTeeth(procedure.tooth_numbers || []);
    setEditingProcedureIndex(index);
  };

  const handleRemoveProcedure = (index: number) => {
    setProcedureItems(procedureItems.filter((_, i) => i !== index));
  };

  const getProcedureName = (procedureId: string) => {
    return procedures.find(p => p.id === procedureId)?.name || "Unknown";
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (procedureItems.length === 0) {
      toast.error("Please add at least one procedure");
      return;
    }

    setLoading(true);

    try {
      if (!user) throw new Error("User not authenticated");

      // Get doctor ID
      const { data: doctorData, error: doctorError } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (doctorError || !doctorData) throw new Error("Doctor profile not found");

      if (saveAsTemplate) {
        // Save as template without patient and dates
        const { error: templateError } = await supabase
          .from("treatment_plan_templates")
          .insert({
            name: values.title,
            description: values.description,
            category: "custom",
            is_public: false,
            created_by: user.id,
            template_data: {
              procedures: procedureItems.map(p => ({
                procedure_id: p.procedure_id,
                priority: p.priority,
                notes: p.notes,
                tooth_numbers: p.tooth_numbers,
              })),
              priority: values.priority,
            },
          });

        if (templateError) throw templateError;
        toast.success("Template saved successfully");
        handleClose();
        return;
      }

      // Create treatment plan
      const { data: planData, error: planError } = await supabase
        .from("treatment_plans")
        .insert([{
          doctor_id: doctorData.id,
          patient_id: values.patient_id || null,
          title: values.title,
          notes: values.description,
          status: values.patient_id ? "draft" : "template",
          total_cost: totalCost,
          priority: values.priority,
        }])
        .select()
        .single();

      if (planError || !planData) throw planError;

      // Add procedures to treatment plan
      const proceduresToInsert = procedureItems.map((item, index) => ({
        treatment_plan_id: planData.id,
        procedure_id: item.procedure_id,
        sequence_order: index + 1,
        scheduled_date: item.appointment_date || null,
        status: "pending",
        priority: item.priority,
        notes: item.notes,
        tooth_numbers: item.tooth_numbers,
        cost: procedures.find(p => p.id === item.procedure_id)?.default_cost || 0,
      }));

      const { error: proceduresError } = await supabase
        .from("treatment_plan_procedures")
        .insert(proceduresToInsert);

      if (proceduresError) throw proceduresError;

      // Send notification and email if patient is selected
      if (values.patient_id) {
        await supabase.rpc("send_notification_to_user", {
          recipient_user_id: values.patient_id,
          notification_type: "treatment_plan",
          title: "New Treatment Plan Created",
          message: `A new treatment plan "${values.title}" has been created for you.`,
          data: { treatment_plan_id: planData.id },
        });

        toast.success("Treatment plan created and patient notified");
      } else {
        toast.success("Treatment plan created successfully");
      }

      handleClose();
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating treatment plan:", error);
      toast.error(error.message || "Failed to create treatment plan");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setProcedureItems([]);
    setCurrentProcedure({ procedure_id: "", priority: "medium" });
    setSelectedTeeth([]);
    setEditingProcedureIndex(null);
    setSaveAsTemplate(false);
    onOpenChange(false);
  };

  const priorityColors = {
    low: "bg-blue-500/10 text-blue-500",
    medium: "bg-yellow-500/10 text-yellow-500",
    high: "bg-orange-500/10 text-orange-500",
    urgent: "bg-red-500/10 text-red-500",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Treatment Plan</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Save as Template Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                <span className="text-sm font-medium">Save as Template</span>
              </div>
              <Button
                type="button"
                variant={saveAsTemplate ? "default" : "outline"}
                size="sm"
                onClick={() => setSaveAsTemplate(!saveAsTemplate)}
              >
                {saveAsTemplate ? "Template Mode" : "Plan Mode"}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Treatment Plan Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Treatment Plan Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Comprehensive Dental Care" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Patient Selection */}
              {!saveAsTemplate && (
                <FormField
                  control={form.control}
                  name="patient_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient (Optional)</FormLabel>
                      <FormControl>
                        <PatientSelector
                          value={field.value}
                          onSelect={(patient) => field.onChange(patient.id)}
                          placeholder="Select patient or leave empty"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Overall Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overall Priority (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details about the treatment plan..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Add Procedure Section */}
            <div className="space-y-4">
              <h3 className="font-semibold">Add Procedures</h3>
              
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Procedure Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Procedure/Service *</label>
                      <Select
                        value={currentProcedure.procedure_id}
                        onValueChange={(value) =>
                          setCurrentProcedure({ ...currentProcedure, procedure_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select procedure" />
                        </SelectTrigger>
                        <SelectContent>
                          {procedures.map((proc) => (
                            <SelectItem key={proc.id} value={proc.id}>
                              {proc.name} - ${proc.default_cost || 0}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Selection */}
                    {!saveAsTemplate && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Date (Optional)</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !currentProcedure.appointment_date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {currentProcedure.appointment_date ? (
                                format(currentProcedure.appointment_date, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={currentProcedure.appointment_date}
                              onSelect={(date) =>
                                setCurrentProcedure({ ...currentProcedure, appointment_date: date })
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    {/* Priority */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Priority (Optional)</label>
                      <Select
                        value={currentProcedure.priority}
                        onValueChange={(value: any) =>
                          setCurrentProcedure({ ...currentProcedure, priority: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes (Optional)</label>
                    <Textarea
                      value={currentProcedure.notes || ""}
                      onChange={(e) =>
                        setCurrentProcedure({ ...currentProcedure, notes: e.target.value })
                      }
                      placeholder="Procedure-specific notes..."
                    />
                  </div>

                  {/* Tooth Selector for Dentists */}
                  {isDentist && (
                    <ToothSelector
                      selectedTeeth={selectedTeeth}
                      onSelectionChange={setSelectedTeeth}
                    />
                  )}

                  <Button
                    type="button"
                    onClick={handleAddProcedure}
                    className="w-full"
                    variant={editingProcedureIndex !== null ? "default" : "outline"}
                  >
                    {editingProcedureIndex !== null ? (
                      <>Update Procedure</>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Procedure
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Procedures List */}
            {procedureItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Added Procedures ({procedureItems.length})</h3>
                  <div className="text-sm space-x-4">
                    <span>Duration: <strong>{totalDuration} min</strong></span>
                    <span>Cost: <strong>${totalCost.toFixed(2)}</strong></span>
                  </div>
                </div>

                {procedureItems.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{getProcedureName(item.procedure_id)}</span>
                            {item.priority && (
                              <Badge className={priorityColors[item.priority]}>
                                {item.priority}
                              </Badge>
                            )}
                          </div>
                          {item.appointment_date && (
                            <p className="text-sm text-muted-foreground">
                              📅 {format(item.appointment_date, "PPP")}
                            </p>
                          )}
                          {item.tooth_numbers && item.tooth_numbers.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                              🦷 Teeth: {item.tooth_numbers.join(", ")}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProcedure(index)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveProcedure(index)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || procedureItems.length === 0}>
                {loading ? (
                  "Creating..."
                ) : saveAsTemplate ? (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Template
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Create Plan
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedCreateTreatmentPlanModal;
