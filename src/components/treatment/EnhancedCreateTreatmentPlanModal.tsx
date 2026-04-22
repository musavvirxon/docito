// src/components/treatment/EnhancedCreateTreatmentPlanModal.tsx
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import { EnhancedDentalChart } from "@/components/dental/EnhancedDentalChart";
import { isDentalSpecialty } from "@/lib/clinicalSpecialties";
import { cn } from "@/lib/utils";
import {
  MedicationsSection,
  ReferralsSection,
  TestsSection,
  type MedicationItem,
  type ReferralItem,
  type TestItem,
} from "./PlanSideSections";
import { Switch } from "@/components/ui/switch";

const DURATION_OPTIONS_MINUTES = [10, 15, 20, 30, 45, 60, 75, 90, 105, 120, 150, 180];

const formatDuration = (minutes: number) => {
  if (!minutes || minutes <= 0) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const formatCurrency = (amount: number) => {
  const n = Number(amount);
  const safe = Number.isFinite(n) ? n : 0;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(safe);
  } catch {
    return `$${safe.toFixed(2)}`;
  }
};

const procedureFormSchema = z.object({
  procedure_id: z.string().min(1, "Select a procedure"),
  appointment_date: z.date().optional(),
  appointment_time: z.string().optional(),
  duration_minutes: z.number().int().min(1).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  notes: z.string().optional(),
  tooth_numbers: z.array(z.number()).optional(),
  cost: z.number().optional(), // ✅ UNIT cost (per-tooth if tooth_based)
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
  cost?: number; // ✅ UNIT cost override (per tooth if tooth_based)
  follow_up_required?: boolean;
}

interface AvailabilitySlot {
  start_at: string; // "YYYY-MM-DDTHH:MM"
  end_at: string;
  available: boolean;
  reason?: string;
}

/** ✅ Day meta to show working hours, breaks, blocked, holiday/day off */
interface DayAvailabilityMeta {
  date: string;
  is_holiday: boolean;
  is_working_day: boolean;
  working_hours?: { start_time: string; end_time: string };
  breaks: Array<{ start_time: string; end_time: string; name?: string }>;
  blocked: Array<{ start_time: string; end_time: string; reason?: string }>;
}

const EnhancedCreateTreatmentPlanModal = ({
  open,
  onOpenChange,
  onSuccess,
  preSelectedPatientId,
  initialTemplateData,
}: EnhancedCreateTreatmentPlanModalProps) => {
  const { user } = useAuth();
  const { t } = useTranslation("dashboard");
  const { procedures } = useProcedures();
  const { profile } = useDoctorProfile();

  const [loading, setLoading] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  const [procedureItems, setProcedureItems] = useState<ProcedureItem[]>([]);
  const [editingProcedureIndex, setEditingProcedureIndex] = useState<number | null>(null);

  const [currentProcedure, setCurrentProcedure] = useState<ProcedureItem>({
    procedure_id: "",
    priority: "medium",
    duration_minutes: 30,
    cost: undefined,
  });

  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  // ✅ NEW: Medications / Referrals / Tests sections
  const [medicationsEnabled, setMedicationsEnabled] = useState(false);
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [referralsEnabled, setReferralsEnabled] = useState(false);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [testsEnabled, setTestsEnabled] = useState(false);
  const [tests, setTests] = useState<TestItem[]>([]);

  const [selectedPatientName, setSelectedPatientName] = useState<string>("");
  const [selectedPatientSource, setSelectedPatientSource] = useState<"registered" | "doctor_added" | null>(null);

  // Backend-driven slots
  const [daySlots, setDaySlots] = useState<AvailabilitySlot[]>([]);
  const [loadingDaySlots, setLoadingDaySlots] = useState(false);

  // ✅ NEW: day meta (breaks/blocked/day off)
  const [dayMeta, setDayMeta] = useState<DayAvailabilityMeta | null>(null);

  const [holidayDates, setHolidayDates] = useState<Date[]>([]);

  const isDentist = isDentalSpecialty(profile?.specialty);

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

  const getProcById = (procedureId: string) => procedures.find((p) => p.id === procedureId);

  const currentSelectedProc = useMemo(() => {
    return currentProcedure.procedure_id ? getProcById(currentProcedure.procedure_id) : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProcedure.procedure_id, procedures]);

  const currentIsToothBased =
    isDentist && String(currentSelectedProc?.type || "").toLowerCase() === "tooth_based";

  const currentUnitCost = useMemo(() => {
    const fromState = currentProcedure.cost;
    if (typeof fromState === "number" && Number.isFinite(fromState)) return fromState;
    const fallback = Number(currentSelectedProc?.default_cost ?? currentSelectedProc?.price ?? 0);
    return Number.isFinite(fallback) ? fallback : 0;
  }, [currentProcedure.cost, currentSelectedProc?.default_cost, currentSelectedProc?.price]);

  // For dentists: cost = unit × teeth (if teeth selected), otherwise unit cost
  const currentHasTeeth = isDentist && selectedTeeth.length > 0;
  const currentQty = currentHasTeeth ? selectedTeeth.length : 1;
  const currentLineTotal = currentHasTeeth ? currentUnitCost * selectedTeeth.length : currentUnitCost;

  const getItemPricing = (item: ProcedureItem) => {
    const proc = getProcById(item.procedure_id);
    const hasTeeth = isDentist && (item.tooth_numbers?.length || 0) > 0;

    const unit = Number(item.cost ?? proc?.default_cost ?? proc?.price ?? 0);
    const unitSafe = Number.isFinite(unit) ? unit : 0;

    const qty = hasTeeth ? item.tooth_numbers!.length : 1;
    const lineTotal = unitSafe * qty;

    return { proc, toothBased: hasTeeth, unit: unitSafe, qty, lineTotal };
  };

  useEffect(() => {
    if (preSelectedPatientId) {
      form.setValue("patient_ref", preSelectedPatientId);
      form.setValue("patient_id", preSelectedPatientId);
      form.setValue("doctor_patient_id", "");
      setSelectedPatientSource("registered");
    }
  }, [preSelectedPatientId, form]);

  // Populate from template
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
          duration_minutes: Number(p.duration_minutes || 30),
          cost: typeof p.cost === "number" ? Number(p.cost) : undefined,
        }));

        setProcedureItems(templateProcedures);

        form.setValue(
          "procedures",
          templateProcedures.map((p) => ({
            procedure_id: p.procedure_id,
            appointment_date: p.appointment_date,
            appointment_time: p.appointment_time,
            duration_minutes: p.duration_minutes,
            priority: p.priority,
            notes: p.notes,
            tooth_numbers: p.tooth_numbers,
            cost: p.cost,
          })) as any,
          { shouldValidate: false, shouldDirty: false }
        );
      }
    }
  }, [initialTemplateData, open, form]);

  // Reset when closing
  useEffect(() => {
    if (!open) {
      form.reset();
      setProcedureItems([]);
      form.setValue("procedures", [] as any, { shouldValidate: false, shouldDirty: false });
      setCurrentProcedure({ procedure_id: "", priority: "medium", duration_minutes: 30, cost: undefined });
      setSelectedTeeth([]);
      setSelectedPatientName("");
      setSelectedPatientSource(null);
      setDaySlots([]);
      setLoadingDaySlots(false);
      setMedicationsEnabled(false);
      setMedications([]);
      setReferralsEnabled(false);
      setReferrals([]);
      setTestsEnabled(false);
      setTests([]);
      setHolidayDates([]);
      setDayMeta(null);
    }
  }, [open, form]);

  // Load holidays (used to disable holiday days in calendar picker)
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

  // ✅ Load availability + meta from backend (doctor hours + clinic hours + breaks + blocked + overrides)
  useEffect(() => {
    const loadDaySlots = async () => {
      if (saveAsTemplate) {
        setDaySlots([]);
        setDayMeta(null);
        return;
      }

      if (!profile?.id) {
        setDaySlots([]);
        setDayMeta(null);
        return;
      }

      if (!currentProcedure.appointment_date) {
        setDaySlots([]);
        setDayMeta(null);
        return;
      }

      setLoadingDaySlots(true);
      setDayMeta(null);

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
            return_meta: true,
            procedure_duration_minutes: duration,
          },
        });

        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);

        const slots = ((data as any)?.slots ?? []) as AvailabilitySlot[];
        setDaySlots(slots);

        const metaForDay = (data as any)?.meta?.[dateStr] as DayAvailabilityMeta | undefined;
        setDayMeta(metaForDay ?? null);
      } catch (e: any) {
        console.error("Failed to load availability:", e);
        setDaySlots([]);
        setDayMeta(null);
      } finally {
        setLoadingDaySlots(false);
      }
    };

    loadDaySlots();
  }, [
    saveAsTemplate,
    profile?.id,
    profile?.practice_id,
    currentProcedure.appointment_date,
    currentProcedure.duration_minutes,
  ]);

  // ✅ Totals (cost uses tooth multiplier; duration remains per procedure instance)
  useEffect(() => {
    let cost = 0;
    let duration = 0;

    procedureItems.forEach((item) => {
      const { proc, toothBased, unit, qty, lineTotal } = getItemPricing(item);

      cost += lineTotal;
      duration += Number(item.duration_minutes ?? (proc as any)?.duration_minutes ?? 30);
    });

    setTotalCost(cost);
    setTotalDuration(duration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedureItems, procedures, isDentist]);

  // ✅ derive times from backend slots only
  const timeOptions = useMemo(() => {
    if (!daySlots.length) return [];

    const seen = new Set<string>();
    return daySlots
      .map((s) => {
        const time = s.start_at?.slice(11, 16); // HH:MM
        if (!time || seen.has(time)) return null;
        seen.add(time);
        return { time, available: Boolean(s.available), reason: s.reason };
      })
      .filter(Boolean) as Array<{ time: string; available: boolean; reason?: string }>;
  }, [daySlots]);

  const handleAddProcedure = () => {
    if (!currentProcedure.procedure_id) {
      toast.error("Please select a procedure");
      return;
    }

    const unit = Number(
      currentProcedure.cost ??
        getProcById(currentProcedure.procedure_id)?.default_cost ??
        getProcById(currentProcedure.procedure_id)?.price ??
        0
    );
    const unitSafe = Number.isFinite(unit) ? unit : 0;

    const procedureToAdd: ProcedureItem = {
      ...currentProcedure,
      duration_minutes: Number(currentProcedure.duration_minutes || 30),
      cost: unitSafe,
      tooth_numbers: isDentist && selectedTeeth.length > 0 ? [...selectedTeeth] : undefined,
    };

    let nextItems: ProcedureItem[];

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

    // Keep RHF in sync
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
        cost: p.cost,
      })) as any,
      { shouldValidate: false, shouldDirty: true }
    );

    setCurrentProcedure({ procedure_id: "", priority: "medium", duration_minutes: 30, cost: undefined });
    setSelectedTeeth([]);
    setDaySlots([]);
    setDayMeta(null);
  };

  const handleEditProcedure = (index: number) => {
    const proc = procedureItems[index];
    setCurrentProcedure(proc);
    setSelectedTeeth(proc.tooth_numbers || []);
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
        cost: p.cost,
      })) as any,
      { shouldValidate: false, shouldDirty: true }
    );
  };

  const getProcedureName = (procedureId: string) => getProcById(procedureId)?.name || "Unknown";

  // --- Booking helpers (create appointment + link via appointment_id) ---
  const assertSlotAvailable = async (date: Date, timeHHMM: string, durationMinutes: number) => {
    if (!profile?.id) throw new Error("Doctor profile not loaded");

    const dateStr = format(date, "yyyy-MM-dd");
    const duration = Number(durationMinutes || 30);

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
    const matched = slots.find((s) => (s.start_at?.slice(11, 16) || "") === timeHHMM);

    if (!matched) throw new Error("Selected time is not returned by availability (check working hours).");
    if (!matched.available) throw new Error(matched.reason || "Selected time is not available");
  };

  const insertAppointmentWithFallback = async (payload: any) => {
    const { data, error } = await supabase.from("appointments").insert(payload).select("id").single();
    if (!error) return data.id as string;

    const msg = (error as any)?.message || "";
    const retry = { ...payload };

    if (msg.includes("procedure_id")) delete retry.procedure_id;
    if (msg.includes("practice_id")) delete retry.practice_id;

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
    const {
      doctorId,
      patient_id,
      doctor_patient_id,
      date,
      startTimeHHMM,
      procedureId,
      procedureName,
      durationMinutes,
      treatmentPlanTitle,
    } = args;

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

    return await insertAppointmentWithFallback(payload);
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

      const { data: doctorData, error: doctorError } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (doctorError || !doctorData) throw new Error("Doctor profile not found");

      // Template save
      if (saveAsTemplate) {
        const { error: templateError } = await supabase.from("treatment_plan_templates").insert({
          doctor_id: doctorData.id,
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
              cost: typeof p.cost === "number" ? Number(p.cost) : undefined, // ✅ keep unit overrides
            })),
            priority: values.priority ?? "medium",
          },
        });

        if (templateError) throw templateError;

        toast.success("Template saved successfully");
        onSuccess?.();
        handleClose();
        return;
      }

      const expiresAt = values.doctor_patient_id
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data: planData, error: planError } = await (supabase as any)
        .from("treatment_plans")
        .insert({
          doctor_id: doctorData.id,
          patient_id: values.patient_id || null,
          doctor_patient_id: values.doctor_patient_id || null,
          title: values.title,
          notes: values.description,
          status: "draft",
          total_cost: totalCost,
          priority: values.priority ?? "medium",
          expires_at: expiresAt,
          medications: medicationsEnabled ? medications.filter((m) => m.name?.trim()) : [],
          referrals: referralsEnabled ? referrals.filter((r) => r.specialty?.trim()) : [],
          tests: testsEnabled ? tests.filter((t) => t.test_name?.trim()) : [],
        })
        .select()
        .single();

      if (planError || !planData) throw planError;

      const createdAppointmentIds: string[] = [];

      try {
        const proceduresToInsert: any[] = [];

        for (let index = 0; index < procedureItems.length; index++) {
          const item = procedureItems[index];
          const proc = getProcById(item.procedure_id);

          const hasDate = Boolean(item.appointment_date);
          const hasTime = Boolean(item.appointment_time);

          if (hasDate !== hasTime) {
            throw new Error("For a scheduled procedure you must select BOTH date and time.");
          }

          const durationMinutes = Number(item.duration_minutes ?? proc?.duration_minutes ?? 30);

          let appointmentId: string | null = null;

          if (hasDate && hasTime) {
            appointmentId = await createAppointmentFromPlan({
              doctorId: doctorData.id,
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

          const unit = Number(item.cost ?? proc?.default_cost ?? proc?.price ?? 0);
          const unitSafe = Number.isFinite(unit) ? unit : 0;

          proceduresToInsert.push({
            treatment_plan_id: planData.id,
            procedure_id: item.procedure_id,
            sequence_order: index + 1,

            scheduled_date: item.appointment_date ? format(item.appointment_date, "yyyy-MM-dd") : null,
            duration_minutes: durationMinutes,

            status: "pending",
            notes: item.notes || null,
            tooth_numbers: item.tooth_numbers ?? null,

            // ✅ store UNIT cost; backend multiplies for tooth_based when computing plan totals
            cost: unitSafe,

            priority: item.priority ?? "medium",
            appointment_id: appointmentId,

            // ✅ NEW: follow-up tracking
            follow_up_required: !!item.follow_up_required,
            follow_up_appointment_id: item.follow_up_required && appointmentId ? null : null,
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
            const { proc, toothBased, unit, qty, lineTotal } = getItemPricing(item);
            const d = Number(item.duration_minutes ?? (proc as any)?.duration_minutes ?? 30);

            const toothStr =
              toothBased && item.tooth_numbers?.length
                ? ` (Teeth: ${item.tooth_numbers.join(", ")})`
                : "";

            const costStr = toothBased
              ? `${formatCurrency(unit)} × ${qty} = ${formatCurrency(lineTotal)}`
              : `${formatCurrency(lineTotal)}`;

            const scheduleStr = item.appointment_date
              ? ` (Scheduled: ${format(item.appointment_date, "PPP")}${item.appointment_time ? ` at ${item.appointment_time}` : ""})`
              : "";

            return `- ${proc?.name || "Procedure"}${toothStr}: ${costStr} (${formatDuration(d)})${scheduleStr}`;
          })
          .join("\n");

        const notificationMessage = `
A new treatment plan "${values.title}" has been created for you.

📋 Procedures:
${procedureDetails}

💰 Total Estimated Cost: ${formatCurrency(totalCost)}
⏱️ Total Duration: ${totalDuration} minutes

⚠️ Important: Final costs may vary depending on findings during the procedure or if additional treatment is required.

Please review and confirm the treatment plan in your dashboard.
        `.trim();

        const { data: notifData, error: notifError } = await (supabase as any).rpc("send_notification_to_user", {
          p_recipient_user_id: values.patient_id,
          p_notification_type: "treatment_plan",
          p_title: "New Treatment Plan Created",
          p_message: notificationMessage,
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
    form.setValue("procedures", [] as any, { shouldValidate: false, shouldDirty: false });
    setCurrentProcedure({ procedure_id: "", priority: "medium", duration_minutes: 30, cost: undefined });
    setSelectedTeeth([]);
    setEditingProcedureIndex(null);
    setSaveAsTemplate(false);
    setSelectedPatientName("");
    setSelectedPatientSource(null);
    setDaySlots([]);
    setLoadingDaySlots(false);
    setHolidayDates([]);
    setDayMeta(null);
    onOpenChange(false);
  };

  const priorityColors: Record<NonNullable<ProcedureItem["priority"]>, string> = {
    low: "bg-blue-500/10 text-blue-500",
    medium: "bg-yellow-500/10 text-yellow-500",
    high: "bg-orange-500/10 text-orange-500",
    urgent: "bg-red-500/10 text-red-500",
  };

  const isPatientSelected = Boolean(watchedPatientId || watchedDoctorPatientId);

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
                          This patient is not signed up yet. The treatment plan will be kept for <b>7 days</b>.
                        </p>
                      )}

                      <FormMessage />
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
            </div>

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

            <div className="space-y-4">
              <h3 className="font-semibold">Add Procedures *</h3>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  {/* Dental Chart inside procedure section for dentists */}
                  {isDentist && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select Teeth</label>
                      <p className="text-xs text-muted-foreground">
                        Select teeth the procedure applies to. Cost = unit cost × number of teeth selected.
                      </p>
                      <EnhancedDentalChart
                        selectedTeeth={selectedTeeth}
                        onToothSelect={(toothNumber) => {
                          setSelectedTeeth((prev) =>
                            prev.includes(toothNumber)
                              ? prev.filter((t) => t !== toothNumber)
                              : [...prev, toothNumber]
                          );
                        }}
                        isEditable={true}
                      />
                      {selectedTeeth.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedTeeth.length} {selectedTeeth.length === 1 ? "tooth" : "teeth"} selected: {selectedTeeth.sort((a, b) => a - b).join(", ")}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Procedure/Service *</label>
                      <Select
                        value={currentProcedure.procedure_id}
                        onValueChange={(value) => {
                          const proc = getProcById(value);
                          const defaultUnit = Number(proc?.default_cost ?? proc?.price ?? 0);
                          const unitSafe = Number.isFinite(defaultUnit) ? defaultUnit : 0;

                          setCurrentProcedure((prev) => ({
                            ...prev,
                            procedure_id: value,
                            duration_minutes: Number(prev.duration_minutes ?? (proc as any)?.duration_minutes ?? 30),
                            cost: unitSafe,
                          }));

                          // Reset tooth selection when switching procedure
                          setSelectedTeeth([]);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select procedure" />
                        </SelectTrigger>
                        <SelectContent>
                          {procedures
                            .filter((proc) => {
                              const cost = Number(proc.default_cost ?? proc.price ?? 0);
                              return cost > 0;
                            })
                            .map((proc) => (
                              <SelectItem key={proc.id} value={proc.id}>
                                {proc.name} - {formatCurrency(Number(proc.default_cost ?? proc.price ?? 0))} •{" "}
                                {formatDuration(Number((proc as any).duration_minutes || 30))}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
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
                      <p className="text-xs text-muted-foreground">
                        Defaults from procedure, but you can override for this plan.
                      </p>
                    </div>

                    {/* ✅ Unit cost override */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Unit Cost (USD)
                        {isDentist && selectedTeeth.length > 0 ? (
                          <span className="ml-2 text-xs text-muted-foreground">(per tooth)</span>
                        ) : null}
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={Number.isFinite(currentProcedure.cost as any) ? String(currentProcedure.cost) : String(currentUnitCost)}
                        onChange={(e) => {
                          const v = e.target.value;
                          const n = v === "" ? undefined : Number(v);
                          setCurrentProcedure((prev) => ({
                            ...prev,
                            cost: typeof n === "number" && Number.isFinite(n) ? n : undefined,
                          }));
                        }}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Stored as <b>unit cost</b>. When teeth are selected, total = unit × number of teeth.
                      </p>
                    </div>

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
                              onSelect={(date) => {
                                setCurrentProcedure({
                                  ...currentProcedure,
                                  appointment_date: date as Date,
                                  appointment_time: undefined,
                                });
                              }}
                              disabled={(date) =>
                                date < new Date() ||
                                holidayDates.some((h) => h.toDateString() === date.toDateString())
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

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
                                No available slots (check doctor + clinic working hours)
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>

                        {/* ✅ Visible blocked/day off/breaks info */}
                        <div className="mt-3 rounded-lg border p-3 bg-muted/30">
                          {!dayMeta ? (
                            <p className="text-sm text-muted-foreground">Loading day info…</p>
                          ) : dayMeta.is_holiday ? (
                            <p className="text-sm font-medium text-destructive">
                              This day is a holiday. No appointments can be booked.
                            </p>
                          ) : !dayMeta.is_working_day ? (
                            <p className="text-sm font-medium text-amber-700">
                              Day off (not a working day). No appointments can be booked.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              <div className="text-sm">
                                <span className="font-medium">Working hours:</span>{" "}
                                {dayMeta.working_hours?.start_time} – {dayMeta.working_hours?.end_time}
                              </div>

                              <div className="text-sm">
                                <span className="font-medium">Breaks:</span>
                                {dayMeta.breaks?.length ? (
                                  <ul className="mt-1 space-y-1 text-muted-foreground">
                                    {dayMeta.breaks.map((b, i) => (
                                      <li key={i}>
                                        • {b.start_time} – {b.end_time} {b.name ? `(${b.name})` : "(Break)"}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-muted-foreground"> None</span>
                                )}
                              </div>

                              <div className="text-sm">
                                <span className="font-medium">Blocked:</span>
                                {dayMeta.blocked?.length ? (
                                  <ul className="mt-1 space-y-1 text-muted-foreground">
                                    {dayMeta.blocked.map((b, i) => (
                                      <li key={i}>
                                        • {b.start_time} – {b.end_time} {b.reason ? `(${b.reason})` : "(Blocked)"}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-muted-foreground"> None</span>
                                )}
                              </div>

                              <p className="text-xs text-muted-foreground">
                                Times inside breaks/blocked ranges appear in the time list as disabled with a reason.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea
                      value={currentProcedure.notes || ""}
                      onChange={(e) => setCurrentProcedure({ ...currentProcedure, notes: e.target.value })}
                      placeholder="Procedure-specific notes..."
                    />
                  </div>

                  {/* Follow-up toggle */}
                  <div className="flex items-start justify-between gap-3 rounded-lg border bg-muted/30 p-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {t("doctor.treatmentPlan.followUpRequired", "Requires follow-up appointment")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          "doctor.treatmentPlan.followUpHint",
                          "If on, doctor will be prompted to book a follow-up before finishing the appointment."
                        )}
                      </p>
                    </div>
                    <Switch
                      checked={!!currentProcedure.follow_up_required}
                      onCheckedChange={(v) =>
                        setCurrentProcedure((prev) => ({ ...prev, follow_up_required: !!v }))
                      }
                    />
                  </div>

                  {/* Pricing preview */}
                  {currentProcedure.procedure_id && (
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            {currentHasTeeth ? (
                              <>
                                Unit {formatCurrency(currentUnitCost)} × {selectedTeeth.length} {selectedTeeth.length === 1 ? "tooth" : "teeth"}
                              </>
                            ) : (
                              <>Unit {formatCurrency(currentUnitCost)}</>
                            )}
                          </div>
                          <div className="font-bold text-primary">
                            {formatCurrency(currentLineTotal)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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

            {procedureItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Added Procedures ({procedureItems.length})</h3>
                </div>

                {procedureItems.map((item, index) => {
                  const { toothBased, unit, qty, lineTotal } = getItemPricing(item);

                  return (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="font-medium">{getProcedureName(item.procedure_id)}</span>

                              <Badge variant="outline">
                                {toothBased
                                  ? `${formatCurrency(unit)} × ${qty} teeth = ${formatCurrency(lineTotal)}`
                                  : `${formatCurrency(lineTotal)}`}
                              </Badge>

                              <Badge variant="secondary">{formatDuration(Number(item.duration_minutes || 30))}</Badge>
                              {item.priority && <Badge className={priorityColors[item.priority]}>{item.priority}</Badge>}
                              {item.follow_up_required && (
                                <Badge variant="outline" className="border-primary/40 text-primary">
                                  Follow-up required
                                </Badge>
                              )}
                            </div>

                            {item.tooth_numbers && item.tooth_numbers.length > 0 && (
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-sm text-muted-foreground">🦷 FDI:</span>
                                {item.tooth_numbers.map((t) => (
                                  <Badge key={t} variant="secondary" className="text-xs px-1.5 py-0.5">
                                    {t}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {item.appointment_date && (
                              <p className="text-sm text-muted-foreground">
                                📅 {format(item.appointment_date, "PPP")}
                                {item.appointment_time && ` at ${item.appointment_time}`}
                              </p>
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
                  );
                })}

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
                          <strong className="text-lg text-primary">{formatCurrency(totalCost)}</strong>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {!saveAsTemplate && (
                  <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-700">Cost Disclaimer</AlertTitle>
                    <AlertDescription className="text-amber-600 text-sm">
                      The total cost shown is an estimate. Final costs may vary based on findings during the procedure,
                      additional treatments required, or changes in the treatment plan.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {!saveAsTemplate && (
              <div className="space-y-4">
                <Separator />
                <div>
                  <h3 className="font-semibold text-lg">Additional plan items</h3>
                  <p className="text-sm text-muted-foreground">
                    Toggle on the sections you'd like to include in this treatment plan. They appear in the patient PDF.
                  </p>
                </div>

                <MedicationsSection
                  enabled={medicationsEnabled}
                  onEnabledChange={setMedicationsEnabled}
                  items={medications}
                  onChange={setMedications}
                />

                <ReferralsSection
                  enabled={referralsEnabled}
                  onEnabledChange={setReferralsEnabled}
                  items={referrals}
                  onChange={setReferrals}
                />

                <TestsSection
                  enabled={testsEnabled}
                  onEnabledChange={setTestsEnabled}
                  items={tests}
                  onChange={setTests}
                />
              </div>
            )}

            {!saveAsTemplate && watchedPatientId && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Patient Notification</AlertTitle>
                <AlertDescription className="text-sm">
                  {selectedPatientName || "The patient"} will receive a detailed notification including procedures,
                  schedule (if set), total estimate and disclaimer.
                </AlertDescription>
              </Alert>
            )}

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
