// src/components/treatment/EnhancedCreateTreatmentPlanModal.tsx
import { useEffect, useMemo, useState } from "react";
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

import { CalendarIcon, Plus, Trash2, Save, Send, Clock, DollarSign, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useDoctorProfile } from "@/hooks/useDoctorProfile";
import PatientSelector from "@/components/patient/PatientSelector";
import { EnhancedDentalChart } from "@/components/dental";
import { cn } from "@/lib/utils";

const DURATION_OPTIONS_MINUTES = [10, 15, 20, 30, 45, 60, 75, 90, 105, 120, 150, 180];

const formatDuration = (minutes: number) => {
  if (!minutes || minutes <= 0) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

type ProcedureRow = Database["public"]["Tables"]["procedures"]["Row"];

interface AvailabilitySlot {
  start_at: string; // "YYYY-MM-DDTHH:MM"
  end_at: string;
  available: boolean;
  reason?: string;
}

const procedureFormSchema = z.object({
  procedure_id: z.string().min(1, "Select a procedure"),
  appointment_date: z.date().optional(),
  appointment_time: z.string().optional(),
  duration_minutes: z.number().int().min(1).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  notes: z.string().optional(),
  tooth_numbers: z.array(z.number()).optional(),
});

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  patient_ref: z.string().optional(),
  patient_id: z.string().optional(),
  doctor_patient_id: z.string().optional(),
  procedures: z.array(procedureFormSchema).optional(),
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
  duration_minutes?: number;
  priority?: "low" | "medium" | "high" | "urgent";
  notes?: string;
  tooth_numbers?: number[];
}

const EnhancedCreateTreatmentPlanModal = ({
  open,
  onOpenChange,
  onSuccess,
  preSelectedPatientId,
  initialTemplateData,
}: EnhancedCreateTreatmentPlanModalProps) => {
  const { user } = useAuth();
  const { profile } = useDoctorProfile();

  const [procedures, setProcedures] = useState<ProcedureRow[]>([]);
  const [loadingProcedures, setLoadingProcedures] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  const [procedureItems, setProcedureItems] = useState<ProcedureItem[]>([]);
  const [editingProcedureIndex, setEditingProcedureIndex] = useState<number | null>(null);

  const [currentProcedure, setCurrentProcedure] = useState<ProcedureItem>({
    procedure_id: "",
    priority: "medium",
    duration_minutes: 30,
  });

  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  // Availability
  const [daySlots, setDaySlots] = useState<AvailabilitySlot[]>([]);
  const [loadingDaySlots, setLoadingDaySlots] = useState(false);
  const [holidayDates, setHolidayDates] = useState<Date[]>([]);

  const isDentist =
    (profile?.specialty || "").toLowerCase().includes("dent") || (profile?.specialty || "").toLowerCase().includes("oral");

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

  const selectedProcedure = useMemo(() => {
    if (!currentProcedure.procedure_id) return null;
    return procedures.find((p) => p.id === currentProcedure.procedure_id) || null;
  }, [currentProcedure.procedure_id, procedures]);

  const currentIsToothBased = selectedProcedure?.type === "tooth_based";

  const toggleTooth = (toothNumber: number) => {
    setSelectedTeeth((prev) => (prev.includes(toothNumber) ? prev.filter((t) => t !== toothNumber) : [...prev, toothNumber]));
  };

  // ✅ Load procedures for THIS doctor using dentist_id
  useEffect(() => {
    const fetchDoctorProcedures = async () => {
      if (!open || !profile?.id) {
        setProcedures([]);
        return;
      }

      setLoadingProcedures(true);
      try {
        const tryQuery = async (ownerColumn: "dentist_id" | "doctor_id", activeColumn?: "is_active" | "active") => {
          let q = supabase.from("procedures").select("*").eq(ownerColumn as any, profile.id).order("name");
          if (activeColumn) q = q.eq(activeColumn as any, true);
          const { data, error } = await q;
          return { data: (data as any[]) || [], error };
        };

        // dentist_id + is_active
        let res = await tryQuery("dentist_id", "is_active");
        // dentist_id + active (older)
        if (res.error && String((res.error as any).message || "").toLowerCase().includes("is_active")) {
          res = await tryQuery("dentist_id", "active");
        }
        // dentist_id without active filter
        if (res.error) {
          res = await tryQuery("dentist_id");
        }
        // legacy fallback doctor_id (if some environments still have it)
        if (res.error && String((res.error as any).message || "").toLowerCase().includes("dentist_id")) {
          res = await tryQuery("doctor_id", "is_active");
          if (res.error && String((res.error as any).message || "").toLowerCase().includes("is_active")) {
            res = await tryQuery("doctor_id", "active");
          }
          if (res.error) res = await tryQuery("doctor_id");
        }

        if (res.error) throw res.error;

        const cleaned = res.data.filter((p) => (p as any).is_active !== false && (p as any).active !== false);
        setProcedures(cleaned as any);
      } catch (e: any) {
        console.error("Failed to load procedures:", e);
        setProcedures([]);
      } finally {
        setLoadingProcedures(false);
      }
    };

    fetchDoctorProcedures();
  }, [open, profile?.id]);

  // Load holidays (optional)
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

  // Availability for selected day (optional)
  useEffect(() => {
    const loadDaySlots = async () => {
      if (!open || saveAsTemplate) {
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
        const duration = Number(currentProcedure.duration_minutes || 30);

        const { data, error } = await supabase.functions.invoke("get-availability", {
          body: {
            provider_id: profile.id,
            entity_id: profile.practice_id ?? undefined,
            from: dateStr,
            to: dateStr,
            include_breaks: true,
            return_meta: false,
            procedure_duration_minutes: duration,
          },
        });

        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);

        const slots = ((data as any)?.slots ?? []) as AvailabilitySlot[];
        setDaySlots(slots);
      } catch (e: any) {
        console.error("Failed to load availability:", e);
        setDaySlots([]);
      } finally {
        setLoadingDaySlots(false);
      }
    };

    loadDaySlots();
  }, [open, saveAsTemplate, profile?.id, profile?.practice_id, currentProcedure.appointment_date, currentProcedure.duration_minutes]);

  const timeOptions = useMemo(() => {
    if (!daySlots.length) return [];
    const seen = new Set<string>();
    return daySlots
      .map((s) => {
        const time = s.start_at?.slice(11, 16);
        if (!time || seen.has(time)) return null;
        seen.add(time);
        return { time, available: Boolean(s.available), reason: s.reason };
      })
      .filter(Boolean) as Array<{ time: string; available: boolean; reason?: string }>;
  }, [daySlots]);

  // Apply template data
  useEffect(() => {
    if (!open) return;
    if (!initialTemplateData) return;

    if (initialTemplateData.title) form.setValue("title", initialTemplateData.title);
    if (initialTemplateData.description) form.setValue("description", initialTemplateData.description);
    if (initialTemplateData.priority) form.setValue("priority", initialTemplateData.priority as any);

    if (Array.isArray(initialTemplateData.procedures) && initialTemplateData.procedures.length) {
      const nextItems: ProcedureItem[] = initialTemplateData.procedures.map((p: any) => ({
        procedure_id: p.procedure_id || p.procedure?.id || "",
        priority: p.priority || "medium",
        notes: p.notes || "",
        tooth_numbers: Array.isArray(p.tooth_numbers) ? p.tooth_numbers : [],
        duration_minutes: Number(p.duration_minutes || 30),
      }));

      setProcedureItems(nextItems);
      form.setValue(
        "procedures",
        nextItems.map((it) => ({
          procedure_id: it.procedure_id,
          appointment_date: it.appointment_date,
          appointment_time: it.appointment_time,
          duration_minutes: it.duration_minutes,
          priority: it.priority,
          notes: it.notes,
          tooth_numbers: it.tooth_numbers,
        })) as any,
        { shouldValidate: false, shouldDirty: false }
      );
    }
  }, [open, initialTemplateData, form]);

  // Reset when closing
  useEffect(() => {
    if (open) return;
    form.reset();
    setProcedureItems([]);
    setCurrentProcedure({ procedure_id: "", priority: "medium", duration_minutes: 30 });
    setSelectedTeeth([]);
    setEditingProcedureIndex(null);
    setSaveAsTemplate(false);
    setDaySlots([]);
    setLoadingDaySlots(false);
    setHolidayDates([]);
  }, [open, form]);

  // Totals with tooth-based multiplier
  useEffect(() => {
    let cost = 0;
    let duration = 0;

    procedureItems.forEach((item) => {
      const proc = procedures.find((p) => p.id === item.procedure_id);
      if (!proc) return;

      const unit = Number(proc.default_cost || 0);
      const qty = proc.type === "tooth_based" ? Number(item.tooth_numbers?.length || 0) : 1;
      cost += unit * (proc.type === "tooth_based" ? qty : 1);

      duration += Number(item.duration_minutes ?? proc.duration_minutes ?? 30);
    });

    setTotalCost(cost);
    setTotalDuration(duration);
  }, [procedureItems, procedures]);

  const getProcedureName = (procedureId: string) => procedures.find((p) => p.id === procedureId)?.name || "Unknown";
  const getProcedureUnitCost = (procedureId: string) => Number(procedures.find((p) => p.id === procedureId)?.default_cost || 0);

  const getProcedureLineCost = (item: ProcedureItem) => {
    const proc = procedures.find((p) => p.id === item.procedure_id);
    if (!proc) return 0;
    const unit = Number(proc.default_cost || 0);
    const qty = proc.type === "tooth_based" ? Number(item.tooth_numbers?.length || 0) : 1;
    return unit * (proc.type === "tooth_based" ? qty : 1);
  };

  const handleAddProcedure = () => {
    if (!currentProcedure.procedure_id) {
      toast.error("Please select a procedure");
      return;
    }

    const proc = procedures.find((p) => p.id === currentProcedure.procedure_id);
    const isToothBased = proc?.type === "tooth_based";

    if (isDentist && isToothBased && selectedTeeth.length === 0) {
      toast.error("Please select at least one tooth for this procedure");
      return;
    }

    const procedureToAdd: ProcedureItem = {
      ...currentProcedure,
      duration_minutes: Number(currentProcedure.duration_minutes || 30),
      tooth_numbers: isToothBased ? (selectedTeeth.length ? [...selectedTeeth] : undefined) : undefined,
    };

    let nextItems: ProcedureItem[] = [];

    if (editingProcedureIndex !== null) {
      const updated = [...procedureItems];
      updated[editingProcedureIndex] = procedureToAdd;
      nextItems = updated;
      setProcedureItems(updated);
      setEditingProcedureIndex(null);
    } else {
      nextItems = [...procedureItems, procedureToAdd];
      setProcedureItems(nextItems);
    }

    form.setValue(
      "procedures",
      nextItems.map((p) => ({
        procedure_id: p.procedure_id,
        appointment_date: p.appointment_date,
        appointment_time: p.appointment_time,
        duration_minutes: p.duration_minutes,
        priority: p.priority,
        notes: p.notes,
        tooth_numbers: p.tooth_numbers,
      })) as any,
      { shouldValidate: false, shouldDirty: true }
    );

    setCurrentProcedure({ procedure_id: "", priority: "medium", duration_minutes: 30 });
    setSelectedTeeth([]);
    setDaySlots([]);
  };

  const handleEditProcedure = (index: number) => {
    const item = procedureItems[index];
    setCurrentProcedure(item);
    setSelectedTeeth(item.tooth_numbers || []);
    setEditingProcedureIndex(index);
  };

  const handleRemoveProcedure = (index: number) => {
    const nextItems = procedureItems.filter((_, i) => i !== index);
    setProcedureItems(nextItems);

    form.setValue(
      "procedures",
      nextItems.map((p) => ({
        procedure_id: p.procedure_id,
        appointment_date: p.appointment_date,
        appointment_time: p.appointment_time,
        duration_minutes: p.duration_minutes,
        priority: p.priority,
        notes: p.notes,
        tooth_numbers: p.tooth_numbers,
      })) as any,
      { shouldValidate: false, shouldDirty: true }
    );
  };

  const assertSlotAvailable = async (date: Date, timeHHMM: string, durationMinutes: number) => {
    if (!profile?.id) return; // if profile isn't ready, skip strict check
    const dateStr = format(date, "yyyy-MM-dd");

    const { data, error } = await supabase.functions.invoke("get-availability", {
      body: {
        provider_id: profile.id,
        entity_id: profile.practice_id ?? undefined,
        from: dateStr,
        to: dateStr,
        include_breaks: true,
        return_meta: false,
        procedure_duration_minutes: durationMinutes,
      },
    });

    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);

    const slots = ((data as any)?.slots ?? []) as AvailabilitySlot[];
    const matched = slots.find((s) => (s.start_at?.slice(11, 16) || "") === timeHHMM);
    if (!matched) throw new Error("Selected time is not available for booking");
    if (!matched.available) throw new Error(matched.reason || "Selected time is not available");
  };

  const insertAppointment = async (payload: any) => {
    const { data, error } = await supabase.from("appointments").insert(payload).select("id").single();
    if (!error) return data.id as string;

    // fallback if schema differs somewhere
    const msg = (error as any)?.message || "";
    const retry = { ...payload };
    if (msg.includes("practice_id")) delete retry.practice_id;
    if (msg.includes("procedure_id")) delete retry.procedure_id;

    const { data: data2, error: error2 } = await supabase.from("appointments").insert(retry).select("id").single();
    if (error2) throw error2;
    return data2.id as string;
  };

  const createAppointmentFromPlan = async (args: {
    doctorId: string;
    patient_id: string | null;
    doctor_patient_id: string | null;
    date: Date;
    startTimeHHMM: string;
    procedureId: string | null;
    procedureName: string;
    durationMinutes: number;
    treatmentPlanTitle: string;
  }) => {
    const { doctorId, patient_id, doctor_patient_id, date, startTimeHHMM, procedureId, procedureName, durationMinutes, treatmentPlanTitle } =
      args;

    await assertSlotAvailable(date, startTimeHHMM, durationMinutes);

    const [hh, mm] = startTimeHHMM.split(":").map(Number);
    const startTotal = hh * 60 + mm;
    const endTotal = startTotal + durationMinutes;
    const endHH = Math.floor(endTotal / 60);
    const endMM = endTotal % 60;
    const endTimeHHMM = `${String(endHH).padStart(2, "0")}:${String(endMM).padStart(2, "0")}`;

    const payload: any = {
      doctor_id: doctorId,
      appointment_date: format(date, "yyyy-MM-dd"),
      start_time: startTimeHHMM,
      end_time: endTimeHHMM,
      status: "confirmed",
      notes: `Booked from Treatment Plan: "${treatmentPlanTitle}"\nProcedure: ${procedureName}`,
      procedure_id: procedureId,
      practice_id: profile?.practice_id ?? null,
    };

    if (patient_id) {
      payload.patient_id = patient_id;
      payload.doctor_patient_id = null;
    } else if (doctor_patient_id) {
      payload.patient_id = null;
      payload.doctor_patient_id = doctor_patient_id;
    } else {
      throw new Error("Missing patient reference for appointment");
    }

    return await insertAppointment(payload);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (procedureItems.length === 0) {
      toast.error("Please add at least one procedure");
      return;
    }

    if (!saveAsTemplate && !values.patient_id && !values.doctor_patient_id) {
      toast.error("Please select a patient for the treatment plan");
      return;
    }

    if (!saveAsTemplate && values.patient_id && values.doctor_patient_id) {
      toast.error("Please select only one patient");
      return;
    }

    setLoading(true);
    try {
      if (!user) throw new Error("User not authenticated");

      // Use profile.id as doctor_id if available, else fetch from doctors table
      let doctorId = profile?.id || null;
      if (!doctorId) {
        const { data, error } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
        if (error || !data?.id) throw new Error("Doctor profile not found");
        doctorId = data.id;
      }

      // Template mode
      if (saveAsTemplate) {
        const { error } = await supabase.from("treatment_plan_templates").insert({
          doctor_id: doctorId,
          name: values.title,
          description: values.description,
          category: "custom",
          is_public: false,
          template_data: {
            procedures: procedureItems.map((p) => ({
              procedure_id: p.procedure_id,
              priority: p.priority ?? "medium",
              notes: p.notes ?? "",
              tooth_numbers: p.tooth_numbers ?? [],
              duration_minutes: Number(p.duration_minutes || 30),
            })),
            priority: values.priority ?? "medium",
          },
        });

        if (error) throw error;

        toast.success("Template saved successfully");
        onSuccess?.();
        handleClose();
        return;
      }

      const expiresAt = values.doctor_patient_id ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null;

      const { data: planData, error: planError } = await supabase
        .from("treatment_plans")
        .insert({
          doctor_id: doctorId,
          patient_id: values.patient_id || null,
          doctor_patient_id: values.doctor_patient_id || null,
          title: values.title,
          notes: values.description,
          status: "draft",
          total_cost: totalCost,
          priority: values.priority ?? "medium",
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (planError || !planData) throw planError;

      const createdAppointmentIds: string[] = [];

      try {
        const proceduresToInsert: any[] = [];

        for (let index = 0; index < procedureItems.length; index++) {
          const item = procedureItems[index];
          const proc = procedures.find((p) => p.id === item.procedure_id);

          const hasDate = Boolean(item.appointment_date);
          const hasTime = Boolean(item.appointment_time);

          if (hasDate !== hasTime) {
            throw new Error("For a scheduled procedure you must select BOTH date and time.");
          }

          const durationMinutes = Number(item.duration_minutes ?? proc?.duration_minutes ?? 30);

          // ✅ Compute cost correctly (tooth_based multiplies by teeth count)
          const unit = Number(proc?.default_cost || 0);
          const qty = proc?.type === "tooth_based" ? Number(item.tooth_numbers?.length || 0) : 1;
          const lineCost = unit * (proc?.type === "tooth_based" ? qty : 1);

          let appointmentId: string | null = null;

          if (hasDate && hasTime) {
            appointmentId = await createAppointmentFromPlan({
              doctorId,
              patient_id: values.patient_id || null,
              doctor_patient_id: values.doctor_patient_id || null,
              date: item.appointment_date as Date,
              startTimeHHMM: item.appointment_time as string,
              procedureId: proc?.id || null,
              procedureName: proc?.name || "Procedure",
              durationMinutes,
              treatmentPlanTitle: values.title,
            });

            createdAppointmentIds.push(appointmentId);
          }

          proceduresToInsert.push({
            treatment_plan_id: planData.id,
            procedure_id: item.procedure_id,
            sequence_order: index + 1,

            scheduled_date: item.appointment_date ? format(item.appointment_date, "yyyy-MM-dd") : null,
            duration_minutes: durationMinutes,

            status: "pending",
            notes: item.notes || null,
            tooth_numbers: proc?.type === "tooth_based" ? (item.tooth_numbers ?? null) : null,

            // ✅ Correct pricing stored in DB
            cost: lineCost,

            priority: item.priority ?? "medium",
            appointment_id: appointmentId,
          });
        }

        const { error: proceduresError } = await supabase.from("treatment_plan_procedures").insert(proceduresToInsert);
        if (proceduresError) throw proceduresError;
      } catch (e) {
        try {
          await supabase.from("treatment_plans").delete().eq("id", planData.id);
        } catch {}
        if (createdAppointmentIds.length) {
          try {
            await supabase.from("appointments").delete().in("id", createdAppointmentIds);
          } catch {}
        }
        throw e;
      }

      // Notify registered patients only
      if (values.patient_id) {
        const procedureDetails = procedureItems
          .map((item) => {
            const proc = procedures.find((p) => p.id === item.procedure_id);
            const d = Number(item.duration_minutes ?? proc?.duration_minutes ?? 30);

            const unit = Number(proc?.default_cost || 0);
            const qty = proc?.type === "tooth_based" ? Number(item.tooth_numbers?.length || 0) : 1;
            const line = unit * (proc?.type === "tooth_based" ? qty : 1);

            const teethInfo =
              proc?.type === "tooth_based" && item.tooth_numbers?.length ? ` (Teeth: ${item.tooth_numbers.join(", ")})` : "";

            const scheduledInfo = item.appointment_date
              ? ` (Scheduled: ${format(item.appointment_date, "PPP")}${item.appointment_time ? ` at ${item.appointment_time}` : ""})`
              : "";

            return `- ${proc?.name || "Procedure"}: $${line.toFixed(2)} (${formatDuration(d)})${teethInfo}${scheduledInfo}`;
          })
          .join("\n");

        const message = `
A new treatment plan "${values.title}" has been created for you.

Procedures:
${procedureDetails}

Total Estimated Cost: $${totalCost.toFixed(2)}
Total Duration: ${totalDuration} minutes
        `.trim();

        const { data: notifData, error: notifError } = await (supabase as any).rpc("send_notification_to_user", {
          p_recipient_user_id: values.patient_id,
          p_notification_type: "treatment_plan",
          p_title: "New Treatment Plan Created",
          p_message: message,
          p_data: { treatment_plan_id: planData.id, total_cost: totalCost },
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
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create treatment plan");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setProcedureItems([]);
    form.setValue("procedures", [] as any, { shouldValidate: false, shouldDirty: false });
    setCurrentProcedure({ procedure_id: "", priority: "medium", duration_minutes: 30 });
    setSelectedTeeth([]);
    setEditingProcedureIndex(null);
    setSaveAsTemplate(false);
    setDaySlots([]);
    setLoadingDaySlots(false);
    setHolidayDates([]);
    onOpenChange(false);
  };

  const priorityColors: Record<NonNullable<ProcedureItem["priority"]>, string> = {
    low: "bg-blue-500/10 text-blue-500",
    medium: "bg-yellow-500/10 text-yellow-600",
    high: "bg-orange-500/10 text-orange-600",
    urgent: "bg-red-500/10 text-red-600",
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
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
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                <span className="text-sm font-medium">Save as Template</span>
              </div>
              <Button type="button" variant={saveAsTemplate ? "default" : "outline"} size="sm" onClick={() => setSaveAsTemplate(!saveAsTemplate)}>
                {saveAsTemplate ? "Template Mode" : "Plan Mode"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {!saveAsTemplate && (
                <FormField
                  control={form.control}
                  name="patient_ref"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient *</FormLabel>
                      <FormControl>
                        <PatientSelector
                          value={field.value}
                          onSelect={(patient) => {
                            field.onChange(patient.id);

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
                      <FormMessage />
                      {watchedDoctorPatientId ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          Doctor-added patient: plan will be kept for <b>7 days</b>.
                        </p>
                      ) : null}
                    </FormItem>
                  )}
                />
              )}

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

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional details about the treatment plan..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold">Add Procedures *</h3>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Procedure/Service *</label>
                      <Select
                        value={currentProcedure.procedure_id}
                        onValueChange={(value) => {
                          const proc = procedures.find((p) => p.id === value);
                          const nextDuration = Number(currentProcedure.duration_minutes ?? proc?.duration_minutes ?? 30);

                          setCurrentProcedure((prev) => ({
                            ...prev,
                            procedure_id: value,
                            duration_minutes: nextDuration,
                          }));

                          // Clear teeth if not tooth_based
                          if (proc?.type !== "tooth_based") setSelectedTeeth([]);

                          // Reset scheduling info when switching procedure
                          setDaySlots([]);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingProcedures ? "Loading..." : "Select procedure"} />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingProcedures ? (
                            <SelectItem value="__loading" disabled>
                              Loading...
                            </SelectItem>
                          ) : procedures.length ? (
                            procedures.map((proc) => (
                              <SelectItem key={proc.id} value={proc.id}>
                                {proc.name} • ${Number(proc.default_cost || 0).toFixed(2)} • {formatDuration(Number(proc.duration_minutes || 30))}
                                {proc.type === "tooth_based" ? " • per tooth" : ""}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="__none" disabled>
                              No procedures found
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>

                      {selectedProcedure ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Badge variant="secondary">{selectedProcedure.category || "general"}</Badge>
                          {selectedProcedure.type ? <Badge variant="outline">{selectedProcedure.type}</Badge> : null}
                          {selectedProcedure.type === "tooth_based" ? <Badge variant="outline">Tooth-based</Badge> : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Duration</label>
                      <Select
                        value={String(currentProcedure.duration_minutes || 30)}
                        onValueChange={(v) => setCurrentProcedure((prev) => ({ ...prev, duration_minutes: Number(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DURATION_OPTIONS_MINUTES.map((m) => (
                            <SelectItem key={m} value={String(m)}>
                              {formatDuration(m)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">You can override the default duration for this plan.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Priority</label>
                      <Select
                        value={currentProcedure.priority}
                        onValueChange={(value: any) => setCurrentProcedure((prev) => ({ ...prev, priority: value }))}
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

                    {!saveAsTemplate && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Schedule Date (optional)</label>
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
                              {currentProcedure.appointment_date ? format(currentProcedure.appointment_date, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={currentProcedure.appointment_date}
                              onSelect={(date) => {
                                setCurrentProcedure((prev) => ({
                                  ...prev,
                                  appointment_date: date as Date,
                                  appointment_time: undefined,
                                }));
                              }}
                              disabled={(date) =>
                                date < new Date() || holidayDates.some((h) => h.toDateString() === date.toDateString())
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    {!saveAsTemplate && currentProcedure.appointment_date && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Schedule Time (optional)</label>
                        <Select
                          value={currentProcedure.appointment_time}
                          onValueChange={(value) => setCurrentProcedure((prev) => ({ ...prev, appointment_time: value }))}
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
                                No available slots
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">If you choose date+time, an appointment will be created automatically.</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea
                      value={currentProcedure.notes || ""}
                      onChange={(e) => setCurrentProcedure((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Procedure-specific notes..."
                    />
                  </div>

                  {/* ✅ Tooth selection only when needed */}
                  {isDentist && currentIsToothBased && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Select Teeth *</div>
                      <EnhancedDentalChart selectionOnly isEditable selectedTeeth={selectedTeeth} onToothSelect={toggleTooth} />
                      <div className="text-xs text-muted-foreground">
                        Selected: {selectedTeeth.length ? [...selectedTeeth].sort((a, b) => a - b).join(", ") : "—"}
                      </div>
                    </div>
                  )}

                  <Button type="button" onClick={handleAddProcedure} className="w-full" variant={editingProcedureIndex !== null ? "default" : "outline"}>
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

            {/* Added procedures */}
            {procedureItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Added Procedures ({procedureItems.length})</h3>
                </div>

                {procedureItems.map((item, index) => {
                  const proc = procedures.find((p) => p.id === item.procedure_id);
                  const unit = getProcedureUnitCost(item.procedure_id);
                  const qty = proc?.type === "tooth_based" ? Number(item.tooth_numbers?.length || 0) : 1;
                  const line = getProcedureLineCost(item);

                  return (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="font-medium">{getProcedureName(item.procedure_id)}</span>
                              <Badge variant="outline">
                                Unit: ${unit.toFixed(2)}
                                {proc?.type === "tooth_based" ? " / tooth" : ""}
                              </Badge>
                              <Badge variant="secondary">{formatDuration(Number(item.duration_minutes || proc?.duration_minutes || 30))}</Badge>
                              {item.priority ? <Badge className={priorityColors[item.priority]}>{item.priority}</Badge> : null}
                              <Badge variant="default" className="ml-auto flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                ${line.toFixed(2)}
                              </Badge>
                            </div>

                            {proc?.type === "tooth_based" ? (
                              <div className="text-sm text-muted-foreground">
                                Quantity: <b>{qty}</b> tooth{qty === 1 ? "" : "es"}
                                {item.tooth_numbers?.length ? ` • Teeth: ${[...item.tooth_numbers].sort((a, b) => a - b).join(", ")}` : ""}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">Quantity: 1</div>
                            )}

                            {item.appointment_date && item.appointment_time ? (
                              <div className="text-sm text-muted-foreground mt-1">
                                Scheduled: <b>{format(item.appointment_date, "PPP")}</b> at <b>{item.appointment_time}</b>
                              </div>
                            ) : null}

                            {item.notes ? <div className="text-sm mt-2 whitespace-pre-wrap">{item.notes}</div> : null}
                          </div>

                          <div className="flex gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => handleEditProcedure(index)}>
                              Edit
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleRemoveProcedure(index)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                <div className="rounded-lg border p-4 bg-muted/30">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm">
                        Total Cost: <b>${totalCost.toFixed(2)}</b>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">
                        Total Duration: <b>{totalDuration} min</b>
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground ml-auto">
                      Tooth-based items are calculated as unit × teeth count.
                    </span>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>

              <Button type="submit" disabled={loading || loadingProcedures || procedures.length === 0}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
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
