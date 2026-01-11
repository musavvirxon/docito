import { useState, useEffect, useMemo } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarIcon, Plus, Trash2, Save, Send, Clock, DollarSign, AlertTriangle, Info } from "lucide-react";
import { format, parseISO } from "date-fns";
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
  appointment_time: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  notes: z.string().optional(),
  tooth_numbers: z.array(z.number()).optional(),
});

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  // UI-bound value; real DB columns are patient_id OR doctor_patient_id
  patient_ref: z.string().optional(),
  patient_id: z.string().optional(),
  doctor_patient_id: z.string().optional(),
  procedures: z.array(procedureFormSchema).min(1, "Add at least one procedure"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});

interface EnhancedCreateTreatmentPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preSelectedPatientId?: string;
  preSelectedAppointmentId?: string;
  initialTemplateData?: {
    title?: string;
    description?: string;
    procedures?: any[];
    medications?: any[];
    estimated_duration_weeks?: number;
    priority?: string;
  };
}

interface ProcedureItem {
  procedure_id: string;
  appointment_date?: Date;
  appointment_time?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  notes?: string;
  tooth_numbers?: number[];
}

interface AvailabilitySlot {
  start_at: string;
  end_at: string;
  available: boolean;
  reason?: string;
}

const timeSlots = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
];

const EnhancedCreateTreatmentPlanModal = ({
  open,
  onOpenChange,
  onSuccess,
  preSelectedPatientId,
  initialTemplateData,
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

  const [selectedPatientName, setSelectedPatientName] = useState<string>("");
  const [selectedPatientSource, setSelectedPatientSource] = useState<"registered" | "doctor_added" | null>(null);

  const [daySlots, setDaySlots] = useState<AvailabilitySlot[]>([]);
  const [loadingDaySlots, setLoadingDaySlots] = useState(false);
  const [holidayDates, setHolidayDates] = useState<Date[]>([]);

  const isDentist =
    profile?.specialty?.toLowerCase().includes("dent") || profile?.specialty?.toLowerCase().includes("oral");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      patient_ref: preSelectedPatientId || "",
      patient_id: preSelectedPatientId || "",
      doctor_patient_id: "",
      procedures: [],
      priority: "medium",
    },
  });

  const watchedPatientId = form.watch("patient_id");
  const watchedDoctorPatientId = form.watch("doctor_patient_id");

  useEffect(() => {
    if (preSelectedPatientId) {
      form.setValue("patient_ref", preSelectedPatientId);
      form.setValue("patient_id", preSelectedPatientId);
      form.setValue("doctor_patient_id", "");
      setSelectedPatientSource("registered");
    }
  }, [preSelectedPatientId, form]);

  // Populate form with template data when provided
  useEffect(() => {
    if (initialTemplateData && open) {
      if (initialTemplateData.title) form.setValue("title", initialTemplateData.title);
      if (initialTemplateData.description) form.setValue("description", initialTemplateData.description);
      if (initialTemplateData.priority) form.setValue("priority", initialTemplateData.priority as any);

      if (initialTemplateData.procedures && initialTemplateData.procedures.length > 0) {
        const templateProcedures: ProcedureItem[] = initialTemplateData.procedures.map((p: any) => ({
          procedure_id: p.procedure_id || p.procedure?.id || "",
          priority: p.priority || "medium",
          notes: p.notes || "",
          tooth_numbers: p.tooth_numbers || [],
        }));
        setProcedureItems(templateProcedures);
      }
    }
  }, [initialTemplateData, open, form]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setProcedureItems([]);
      setCurrentProcedure({ procedure_id: "", priority: "medium" });
      setSelectedTeeth([]);
      setSelectedPatientName("");
      setSelectedPatientSource(null);
      setDaySlots([]);
      setLoadingDaySlots(false);
      setHolidayDates([]);
    }
  }, [open, form]);

  // Load holidays and highlight them red in calendar
  useEffect(() => {
    const loadHolidays = async () => {
      if (!open || !profile?.id) {
        setHolidayDates([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("schedule_settings")
          .select("holidays")
          .eq("doctor_id", profile.id)
          .maybeSingle();

        if (error) throw error;
        const holidays = (data?.holidays as string[]) ?? [];
        setHolidayDates(holidays.map((d) => parseISO(d)));
      } catch (e) {
        console.error("Failed to load holidays:", e);
        setHolidayDates([]);
      }
    };

    loadHolidays();
  }, [open, profile?.id]);

  // Load availability for selected date to show booked/blocked slots as unavailable
  useEffect(() => {
    const loadDaySlots = async () => {
      if (saveAsTemplate) {
        setDaySlots([]);
        return;
      }

      if (!profile?.id) {
        setDaySlots([]);
        return;
      }

      if (!currentProcedure.appointment_date) {
        setDaySlots([]);
        return;
      }

      setLoadingDaySlots(true);
      try {
        const dateStr = format(currentProcedure.appointment_date, "yyyy-MM-dd");
        const { data, error } = await supabase.functions.invoke("get-availability", {
          body: {
            provider_id: profile.id,
            entity_id: profile.practice_id ?? undefined,
            from: dateStr,
            to: dateStr,
          },
        });

        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);

        setDaySlots(((data as any)?.slots ?? []) as AvailabilitySlot[]);
      } catch (e: any) {
        console.error("Failed to load availability:", e);
        // fall back to static timeSlots
        setDaySlots([]);
      } finally {
        setLoadingDaySlots(false);
      }
    };

    loadDaySlots();
  }, [saveAsTemplate, profile?.id, profile?.practice_id, currentProcedure.appointment_date]);

  useEffect(() => {
    // Calculate total cost and duration
    let cost = 0;
    let duration = 0;

    procedureItems.forEach((item) => {
      const procedure = procedures.find((p) => p.id === item.procedure_id);
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

    const procedureToAdd: ProcedureItem = {
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

  const getProcedureName = (procedureId: string) => procedures.find((p) => p.id === procedureId)?.name || "Unknown";
  const getProcedureCost = (procedureId: string) => procedures.find((p) => p.id === procedureId)?.default_cost || 0;

  const createAppointment = async (
    doctorId: string,
    opts: { patient_id?: string | null; doctor_patient_id?: string | null },
    date: Date,
    time: string,
    procedureName: string,
    durationMinutes: number
  ) => {
    const [hours, minutes] = time.split(":").map(Number);
    const endHours = hours + Math.floor((minutes + durationMinutes) / 60);
    const endMinutes = (minutes + durationMinutes) % 60;
    const endTime = `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;

    const payload: any = {
      doctor_id: doctorId,
      appointment_date: format(date, "yyyy-MM-dd"),
      start_time: time,
      end_time: endTime,
      status: "confirmed",
      notes: `Treatment Plan Procedure: ${procedureName}`,
    };

    if (opts.patient_id) {
      payload.patient_id = opts.patient_id;
      payload.doctor_patient_id = null;
    } else if (opts.doctor_patient_id) {
      payload.patient_id = null;
      payload.doctor_patient_id = opts.doctor_patient_id;
    } else {
      throw new Error("Missing patient reference for appointment");
    }

    const { data, error } = await supabase.from("appointments").insert(payload).select().single();
    if (error) throw error;
    return data;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (procedureItems.length === 0) {
      toast.error("Please add at least one procedure");
      return;
    }

    // Validate patient is selected when not saving as template
    if (!saveAsTemplate && !values.patient_id && !values.doctor_patient_id) {
      toast.error("Please select a patient for the treatment plan");
      return;
    }

    // Safety: enforce exactly one patient reference
    if (!saveAsTemplate && values.patient_id && values.doctor_patient_id) {
      toast.error("Please select only one patient");
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
        const { error: templateError } = await supabase.from("treatment_plan_templates").insert({
          doctor_id: doctorData.id,
          name: values.title,
          description: values.description,
          category: "custom",
          is_public: false,
          template_data: {
            procedures: procedureItems.map((p) => ({
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

      // Create treatment plan (doctor_patient_id plans will expire in 7 days via DB trigger/function)
      const { data: planData, error: planError } = await supabase
        .from("treatment_plans")
        .insert([
          {
            doctor_id: doctorData.id,
            patient_id: values.patient_id || null,
            doctor_patient_id: values.doctor_patient_id || null,
            title: values.title,
            notes: values.description,
            status: "draft",
            total_cost: totalCost,
            priority: values.priority,
          },
        ])
        .select()
        .maybeSingle();

      if (planError || !planData) throw planError;

      // Add procedures to treatment plan and create appointments if scheduled
      const proceduresToInsert = await Promise.all(
        procedureItems.map(async (item, index) => {
          const procedure = procedures.find((p) => p.id === item.procedure_id);
          let appointmentId = null;

          // Create appointment if date and time are specified
          if (item.appointment_date && item.appointment_time && (values.patient_id || values.doctor_patient_id)) {
            try {
              const appointment = await createAppointment(
                doctorData.id,
                { patient_id: values.patient_id || null, doctor_patient_id: values.doctor_patient_id || null },
                item.appointment_date,
                item.appointment_time,
                procedure?.name || "Procedure",
                procedure?.duration_minutes || 30
              );
              appointmentId = appointment.id;
            } catch (err) {
              console.error("Failed to create appointment:", err);
            }
          }

          return {
            treatment_plan_id: planData.id,
            procedure_id: item.procedure_id,
            sequence_order: index + 1,
            scheduled_date: item.appointment_date ? format(item.appointment_date, "yyyy-MM-dd") : null,
            status: "pending",
            priority: item.priority,
            notes: item.notes,
            tooth_numbers: item.tooth_numbers,
            cost: procedure?.default_cost || 0,
            // NOTE: appointmentId is currently unused in insert object.
            // If your schema supports it, add: appointment_id: appointmentId
          };
        })
      );

      const { error: proceduresError } = await supabase.from("treatment_plan_procedures").insert(proceduresToInsert);
      if (proceduresError) throw proceduresError;

      // Build detailed notification message for registered patient
      const procedureDetails = procedureItems
        .map((item) => {
          const proc = procedures.find((p) => p.id === item.procedure_id);
          return `- ${proc?.name || "Procedure"}: $${proc?.default_cost || 0}${
            item.appointment_date
              ? ` (Scheduled: ${format(item.appointment_date, "PPP")}${item.appointment_time ? ` at ${item.appointment_time}` : ""})`
              : ""
          }`;
        })
        .join("\n");

      const notificationMessage = `
A new treatment plan "${values.title}" has been created for you.

📋 Procedures:
${procedureDetails}

💰 Total Estimated Cost: $${totalCost.toFixed(2)}
⏱️ Total Duration: ${totalDuration} minutes

⚠️ Important: Please note that the final cost may vary depending on findings during the procedure or if additional treatment is required.

Please review and confirm the treatment plan in your dashboard.
      `.trim();

      // Send notification only to REGISTERED patients
      if (values.patient_id) {
        const { data: notifData, error: notifError } = await supabase.rpc("send_notification_to_user", {
          recipient_user_id: values.patient_id,
          notification_type: "treatment_plan",
          title: "New Treatment Plan Created",
          message: notificationMessage,
          data: { treatment_plan_id: planData.id, total_cost: totalCost },
        });

        if (notifError) throw notifError;
        if ((notifData as any)?.error) throw new Error((notifData as any).error);

        toast.success("Treatment plan created and patient notified");
      } else {
        toast.success(
          values.doctor_patient_id
            ? "Treatment plan created. It will be kept for 7 days and will appear in the patient's account if they sign up with the same phone number."
            : "Treatment plan created successfully"
        );
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
    setSelectedPatientName("");
    setSelectedPatientSource(null);
    setDaySlots([]);
    setLoadingDaySlots(false);
    onOpenChange(false);
  };

  const priorityColors: Record<NonNullable<ProcedureItem["priority"]>, string> = {
    low: "bg-blue-500/10 text-blue-500",
    medium: "bg-yellow-500/10 text-yellow-500",
    high: "bg-orange-500/10 text-orange-500",
    urgent: "bg-red-500/10 text-red-500",
  };

  const timeOptions = useMemo(() => {
    // If availability wasn't loaded, fall back to static options
    if (!daySlots.length) {
      return timeSlots.map((time) => ({ time, available: true as const }));
    }

    const seen = new Set<string>();
    const options = daySlots
      .map((s) => {
        const time = s.start_at?.slice(11, 16);
        if (!time || seen.has(time)) return null;
        seen.add(time);
        return { time, available: Boolean(s.available), reason: s.reason };
      })
      .filter(Boolean) as Array<{ time: string; available: boolean; reason?: string }>;

    return options.length ? options : timeSlots.map((time) => ({ time, available: true as const }));
  }, [daySlots]);

  const isPatientSelected = Boolean(watchedPatientId || watchedDoctorPatientId);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Keep internal reset logic only for close
        if (!next) handleClose();
        else onOpenChange(true);
      }}
    >
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

              {/* Patient Selection - Required when not template */}
              {!saveAsTemplate && (
                <FormField
                  control={form.control}
                  name="patient_ref"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient *</FormLabel>
                      <FormControl>
                        {/* ✅ EXACT SNIPPET YOU PROVIDED (kept) */}
                        <PatientSelector
                          value={field.value}
                          onSelect={(patient) => {
                            field.onChange(patient.id);
                            setSelectedPatientName(patient.name);
                            setSelectedPatientSource(patient.source);

                            if (patient.source === "doctor_added") {
                              form.setValue("doctor_patient_id", patient.id);
                              form.setValue("patient_id", "");
                            } else {
                              form.setValue("patient_id", patient.id);
                              form.setValue("doctor_patient_id", "");
                            }
                          }}
                          placeholder="Search by name, email, or phone"
                          required={!saveAsTemplate}
                        />
                      </FormControl>

                      {selectedPatientSource === "doctor_added" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          This patient is not signed up yet. The treatment plan will be kept for <b>7 days</b>. If they
                          sign up (or add the same phone number to their profile) within that time, the plan and their
                          medical/dental history will be restored in their account.
                        </p>
                      )}

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
                    <FormLabel>Overall Priority</FormLabel>
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional details about the treatment plan..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Add Procedure Section */}
            <div className="space-y-4">
              <h3 className="font-semibold">Add Procedures *</h3>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Procedure Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Procedure/Service *</label>
                      <Select
                        value={currentProcedure.procedure_id}
                        onValueChange={(value) => setCurrentProcedure({ ...currentProcedure, procedure_id: value })}
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

                    {/* Priority */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Priority</label>
                      <Select
                        value={currentProcedure.priority}
                        onValueChange={(value: any) => setCurrentProcedure({ ...currentProcedure, priority: value })}
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

                    {/* Date Selection */}
                    {!saveAsTemplate && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Schedule Date</label>
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
                              onSelect={(date) => setCurrentProcedure({ ...currentProcedure, appointment_date: date as Date })}
                              holidayDates={holidayDates}
                              disabled={(date) => date < new Date() || holidayDates.some(h => h.toDateString() === date.toDateString())}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    {/* Time Selection - only show if date is selected */}
                    {!saveAsTemplate && currentProcedure.appointment_date && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Schedule Time</label>
                        <Select
                          value={currentProcedure.appointment_time}
                          onValueChange={(value) => setCurrentProcedure({ ...currentProcedure, appointment_time: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select time">
                              {currentProcedure.appointment_time ? (
                                <span className="flex items-center">
                                  <Clock className="w-4 h-4 mr-2" />
                                  {currentProcedure.appointment_time}
                                </span>
                              ) : (
                                "Select time"
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {loadingDaySlots ? (
                              <SelectItem value="__loading" disabled>
                                Loading availability...
                              </SelectItem>
                            ) : timeOptions.length ? (
                              timeOptions.map(({ time, available, reason }) => (
                                <SelectItem key={time} value={time} disabled={!available}>
                                  {time}
                                  {!available ? ` — ${reason || "Unavailable"}` : ""}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__none" disabled>
                                No time slots available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea
                      value={currentProcedure.notes || ""}
                      onChange={(e) => setCurrentProcedure({ ...currentProcedure, notes: e.target.value })}
                      placeholder="Procedure-specific notes..."
                    />
                  </div>

                  {/* Tooth Selector for Dentists */}
                  {isDentist && <ToothSelector selectedTeeth={selectedTeeth} onSelectionChange={setSelectedTeeth} />}

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
                </div>

                {procedureItems.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{getProcedureName(item.procedure_id)}</span>
                            <Badge variant="outline">${getProcedureCost(item.procedure_id)}</Badge>
                            {item.priority && <Badge className={priorityColors[item.priority]}>{item.priority}</Badge>}
                          </div>

                          {item.appointment_date && (
                            <p className="text-sm text-muted-foreground">
                              📅 {format(item.appointment_date, "PPP")}
                              {item.appointment_time && ` at ${item.appointment_time}`}
                            </p>
                          )}

                          {item.tooth_numbers && item.tooth_numbers.length > 0 && (
                            <p className="text-sm text-muted-foreground">🦷 Teeth: {item.tooth_numbers.join(", ")}</p>
                          )}

                          {item.notes && <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>}
                        </div>

                        <div className="flex gap-2">
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleEditProcedure(index)}>
                            Edit
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveProcedure(index)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Cost Summary Card */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-muted-foreground" />
                          <span className="text-sm">Total Duration:</span>
                          <strong>{totalDuration} min</strong>
                        </div>
                        <Separator orientation="vertical" className="h-6" />
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-primary" />
                          <span className="text-sm">Total Estimated Cost:</span>
                          <strong className="text-lg text-primary">${totalCost.toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Cost Warning Alert */}
                {!saveAsTemplate && (
                  <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-700">Cost Disclaimer</AlertTitle>
                    <AlertDescription className="text-amber-600 text-sm">
                      The total cost shown is an estimate. Final costs may vary based on findings during the procedure,
                      additional treatments required, or changes in the treatment plan. The patient will be notified of
                      this when receiving the plan.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Patient Info Alert (registered only) */}
            {!saveAsTemplate && watchedPatientId && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Patient Notification</AlertTitle>
                <AlertDescription className="text-sm">
                  {selectedPatientName || "The patient"} will receive a detailed notification including:
                  <ul className="list-disc list-inside mt-1 text-muted-foreground">
                    <li>Complete list of procedures with individual costs</li>
                    <li>Scheduled appointment dates and times (if set)</li>
                    <li>Total estimated cost and duration</li>
                    <li>Important disclaimer about potential cost changes</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={loading || procedureItems.length === 0 || (!saveAsTemplate && !isPatientSelected)}
              >
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
                    Create & Send Plan
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
