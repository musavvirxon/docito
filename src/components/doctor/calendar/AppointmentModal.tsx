// File: src/components/doctor/calendar/AppointmentModal.tsx
import { memo, useState, useCallback, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  Clock,
  Phone,
  Mail,
  FileText,
  Pill,
  Video,
  MessageSquare,
  CheckCircle,
  XCircle,
  Edit,
  ArrowRightLeft,
  Stethoscope,
  DollarSign,
  ClipboardList,
  CalendarPlus,
  Check,
  Trash2,
  Plus,
  Save,
  RefreshCw,
  Copy,
  Layers,
} from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import CancelAppointmentDialog from "./CancelAppointmentDialog";
import { RescheduleAppointmentModal } from "@/components/appointments/RescheduleAppointmentModal";
import type { CalendarAppointment } from "./types";

interface AppointmentProcedure {
  id: string;
  procedure_id: string | null;
  procedure_name?: string;
  status: string | null;
  estimated_cost: number | null;
  procedure_notes: string | null;
}

interface TreatmentPlan {
  id: string;
  title: string;
  status: string | null;
  total_cost: number | null;
  created_at: string;
}

type ClinicalItemType = "procedure" | "medication" | "treatment_plan";

type ClinicalItem = {
  id: string;
  appointment_id: string;
  doctor_id: string;
  patient_id: string | null;
  doctor_patient_id: string | null;
  item_type: ClinicalItemType;
  title: string;
  details: any;
  created_at: string;
  updated_at: string;
};

type ClinicalTemplate = {
  id: string;
  doctor_id: string;
  item_type: ClinicalItemType;
  title: string;
  details: any;
  created_at: string;
  updated_at: string;
};

interface AppointmentModalProps {
  appointment: CalendarAppointment | null;
  isOpen: boolean;
  onClose: () => void;
  onStartVisit?: () => void;
  onAddNote?: () => void;
  onAddPrescription?: () => void;
  onMarkComplete?: () => void;
  onReschedule?: () => void;
  onCancel?: () => void;
  onMessage?: () => void;
}

const statusColors: Record<string, string> = {
  confirmed: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  pending: "bg-amber-500/10 text-amber-600 border-amber-200",
  completed: "bg-muted text-muted-foreground border-border",
  canceled: "bg-destructive/10 text-destructive border-destructive/20",
  "no-show": "bg-amber-500/10 text-amber-600 border-amber-200",
  in_progress: "bg-green-500/10 text-green-600 border-green-200",
};

const procedureStatusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600",
  completed: "bg-emerald-500/10 text-emerald-600",
  cancelled: "bg-destructive/10 text-destructive",
  in_progress: "bg-blue-500/10 text-blue-600",
  draft: "bg-muted text-muted-foreground",
};

function safeJsonStringify(v: any) {
  try {
    return JSON.stringify(v ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const AppointmentModal = memo(
  ({
    appointment,
    isOpen,
    onClose,
    onStartVisit,
    onAddNote,
    onAddPrescription,
    onMarkComplete,
    onReschedule,
    onCancel,
  }: AppointmentModalProps) => {
    const { t, i18n } = useTranslation("dashboard");
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("details");
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [isRescheduling] = useState(false);
    const isRTL = i18n.language === "ar";

    // Procedures and treatment plans
    const [appointmentProcedures, setAppointmentProcedures] = useState<AppointmentProcedure[]>([]);
    const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
    const [loadingProcedures, setLoadingProcedures] = useState(false);
    const [loadingPlans, setLoadingPlans] = useState(false);

    // Clinical items + templates (Edge Function: appointment-clinical-items)
    const [clinicalLoading, setClinicalLoading] = useState(false);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [clinicalItems, setClinicalItems] = useState<ClinicalItem[]>([]);
    const [templates, setTemplates] = useState<ClinicalTemplate[]>([]);

    const [newItemType, setNewItemType] = useState<ClinicalItemType>("procedure");
    const [newItemTitle, setNewItemTitle] = useState("");
    const [newItemDetailsText, setNewItemDetailsText] = useState("{}");

    const [newTplType, setNewTplType] = useState<ClinicalItemType>("procedure");
    const [newTplTitle, setNewTplTitle] = useState("");
    const [newTplDetailsText, setNewTplDetailsText] = useState("{}");

    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editItemType, setEditItemType] = useState<ClinicalItemType>("procedure");
    const [editItemTitle, setEditItemTitle] = useState("");
    const [editItemDetailsText, setEditItemDetailsText] = useState("{}");

    const [editingTplId, setEditingTplId] = useState<string | null>(null);
    const [editTplType, setEditTplType] = useState<ClinicalItemType>("procedure");
    const [editTplTitle, setEditTplTitle] = useState("");
    const [editTplDetailsText, setEditTplDetailsText] = useState("{}");

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

    const initials =
      appointment?.patient_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "P";

    const isActiveAppointment = appointment?.status === "confirmed";
    const isToday =
      appointment?.appointment_date
        ? new Date(appointment.appointment_date).toDateString() === new Date().toDateString()
        : false;

    const appointmentId = appointment?.id ?? "";

    const getAccessToken = useCallback(async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    }, []);

    const invokeClinical = useCallback(
      async (body: any) => {
        const token = await getAccessToken();
        if (!token) throw new Error("Not authenticated");
        const { data, error } = await supabase.functions.invoke("appointment-clinical-items", {
          body,
          headers: { Authorization: `Bearer ${token}` },
        });
        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error || "Request failed");
        return data?.data;
      },
      [getAccessToken],
    );

    const refreshClinical = useCallback(async () => {
      if (!appointmentId) return;
      setClinicalLoading(true);
      try {
        const data = await invokeClinical({ action: "list", appointment_id: appointmentId });
        setClinicalItems((data ?? []) as ClinicalItem[]);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? "Failed to load clinical items");
        setClinicalItems([]);
      } finally {
        setClinicalLoading(false);
      }
    }, [appointmentId, invokeClinical]);

    const refreshTemplates = useCallback(async () => {
      setTemplatesLoading(true);
      try {
        const data = await invokeClinical({ action: "list_templates" });
        setTemplates((data ?? []) as ClinicalTemplate[]);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? "Failed to load templates");
        setTemplates([]);
      } finally {
        setTemplatesLoading(false);
      }
    }, [invokeClinical]);

    const resetNewItem = useCallback(() => {
      setNewItemType("procedure");
      setNewItemTitle("");
      setNewItemDetailsText("{}");
    }, []);

    const resetNewTpl = useCallback(() => {
      setNewTplType("procedure");
      setNewTplTitle("");
      setNewTplDetailsText("{}");
    }, []);

    // Fetch procedures for this appointment
    useEffect(() => {
      if (!appointment?.id || !isOpen) return;

      const fetchProcedures = async () => {
        setLoadingProcedures(true);
        try {
          const { data, error } = await (supabase as any)
            .from("appointment_procedures")
            .select(
              `
            id,
            procedure_id,
            status,
            estimated_cost,
            procedure_notes,
            procedures:procedure_id(name, category)
          `,
            )
            .eq("appointment_id", appointment.id);

          if (error) throw error;

          const procs: AppointmentProcedure[] = (data || []).map((p: any) => ({
            id: p.id,
            procedure_id: p.procedure_id,
            procedure_name: p.procedures?.name || "Unknown Procedure",
            status: p.status,
            estimated_cost: p.estimated_cost,
            procedure_notes: p.procedure_notes,
          }));

          setAppointmentProcedures(procs);
        } catch (err) {
          console.error("Error fetching procedures:", err);
        } finally {
          setLoadingProcedures(false);
        }
      };

      fetchProcedures();
    }, [appointment?.id, isOpen]);

    // Fetch treatment plans for this patient
    useEffect(() => {
      if (!appointment || !isOpen) return;

      const patientId = appointment.patient_id || appointment.doctor_patient_id;
      if (!patientId) return;

      const fetchTreatmentPlans = async () => {
        setLoadingPlans(true);
        try {
          const column = appointment.patient_id ? "patient_id" : "doctor_patient_id";
          const { data, error } = await (supabase as any)
            .from("treatment_plans")
            .select("id, title, status, total_cost, created_at")
            .eq(column, patientId)
            .order("created_at", { ascending: false })
            .limit(10);

          if (error) throw error;
          setTreatmentPlans(data || []);
        } catch (err) {
          console.error("Error fetching treatment plans:", err);
        } finally {
          setLoadingPlans(false);
        }
      };

      fetchTreatmentPlans();
    }, [appointment, isOpen]);

    // Fetch clinical items + templates when modal opens
    useEffect(() => {
      if (!isOpen || !appointmentId) return;
      refreshClinical();
      refreshTemplates();
      // reset edit state when opening
      setEditingItemId(null);
      setEditingTplId(null);
      setNewItemDetailsText("{}");
      setNewTplDetailsText("{}");
    }, [isOpen, appointmentId, refreshClinical, refreshTemplates]);

    const handleMarkProcedureDone = useCallback(async (procedureId: string) => {
      try {
        const { error } = await (supabase as any).from("appointment_procedures").update({ status: "completed" }).eq("id", procedureId);
        if (error) throw error;

        setAppointmentProcedures((prev) => prev.map((p) => (p.id === procedureId ? { ...p, status: "completed" } : p)));
        toast.success("Procedure marked as completed");
      } catch (err: any) {
        toast.error(err?.message || "Failed to update procedure");
      }
    }, []);

    const handleBookFollowUp = useCallback(() => {
      if (!appointment) return;
      const patientKey = appointment.patient_id ? `reg:${appointment.patient_id}` : `dp:${appointment.doctor_patient_id}`;
      navigate(`/doctor-dashboard?section=calendar&patient=${encodeURIComponent(patientKey)}&followupOf=${encodeURIComponent(appointment.id)}`);
      onClose();
    }, [appointment, navigate, onClose]);

    const handleCancelAppointment = useCallback(
      async (reason?: string) => {
        if (!appointment) return;

        try {
          const { error } = await supabase
            .from("appointments")
            .update({
              status: "canceled" as any,
              notes: reason ? `${appointment.notes || ""}\n[Cancellation reason]: ${reason}`.trim() : appointment.notes,
            })
            .eq("id", appointment.id);

          if (error) throw error;

          toast.success(t("doctor.calendar.cancelSuccess", "Appointment cancelled successfully"));
          setIsCancelDialogOpen(false);
          onCancel?.();
          onClose();
        } catch (error) {
          console.error("Error cancelling appointment:", error);
          toast.error("Failed to cancel appointment");
        }
      },
      [appointment, t, onCancel, onClose],
    );

    const handleReschedule = useCallback(() => {
      if (!appointment) return;
      setIsRescheduleModalOpen(true);
    }, [appointment]);

    const handleRescheduleComplete = useCallback(() => {
      setIsRescheduleModalOpen(false);
      onReschedule?.();
      onClose();
    }, [onReschedule, onClose]);

    const handleMessage = useCallback(async () => {
      if (!appointment?.patient_id) {
        toast.error("Patient information not available");
        return;
      }

      try {
        const { data: existing, error: e1 } = await supabase
          .from("conversations")
          .select("id")
          .eq("context_type", "visit")
          .eq("context_id", appointment.id)
          .maybeSingle();

        if (e1) throw e1;

        if (existing?.id) {
          navigate(`/messages?c=${existing.id}`);
          onClose();
          return;
        }

        const { data: conversationId, error } = await supabase.rpc("create_direct_conversation" as any, {
          target_user_id: appointment.patient_id,
        } as any);

        if (error) throw error;

        navigate(`/messages?c=${conversationId}`);
        onClose();
      } catch (error) {
        console.error("Error creating conversation:", error);
        toast.error("Failed to start conversation");
      }
    }, [appointment, navigate, onClose]);

    const clinicalItemsSorted = useMemo(() => {
      const list = Array.isArray(clinicalItems) ? clinicalItems.slice() : [];
      list.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
      return list;
    }, [clinicalItems]);

    const templatesSorted = useMemo(() => {
      const list = Array.isArray(templates) ? templates.slice() : [];
      list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
      return list;
    }, [templates]);

    const beginEditItem = useCallback((it: ClinicalItem) => {
      setEditingItemId(it.id);
      setEditItemType(it.item_type);
      setEditItemTitle(it.title ?? "");
      setEditItemDetailsText(safeJsonStringify(it.details));
    }, []);

    const cancelEditItem = useCallback(() => {
      setEditingItemId(null);
      setEditItemType("procedure");
      setEditItemTitle("");
      setEditItemDetailsText("{}");
    }, []);

    const saveEditItem = useCallback(async () => {
      if (!editingItemId) return;

      const parsed = safeJsonParse(editItemDetailsText);
      if (parsed === null) {
        toast.error("Invalid JSON in details");
        return;
      }

      try {
        await invokeClinical({
          action: "update",
          id: editingItemId,
          item_type: editItemType,
          title: editItemTitle.trim(),
          details: parsed,
        });
        toast.success("Clinical item updated");
        cancelEditItem();
        await refreshClinical();
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? "Failed to update item");
      }
    }, [editingItemId, editItemDetailsText, editItemTitle, editItemType, invokeClinical, cancelEditItem, refreshClinical]);

    const deleteItem = useCallback(
      async (id: string) => {
        const ok = window.confirm("Delete this clinical item?");
        if (!ok) return;

        try {
          await invokeClinical({ action: "delete", id });
          toast.success("Clinical item deleted");
          await refreshClinical();
        } catch (e: any) {
          console.error(e);
          toast.error(e?.message ?? "Failed to delete item");
        }
      },
      [invokeClinical, refreshClinical],
    );

    const createItem = useCallback(async () => {
      if (!appointmentId) return;
      const title = newItemTitle.trim();
      if (!title) {
        toast.error("Title is required");
        return;
      }

      const parsed = safeJsonParse(newItemDetailsText);
      if (parsed === null) {
        toast.error("Invalid JSON in details");
        return;
      }

      try {
        await invokeClinical({
          action: "create",
          appointment_id: appointmentId,
          item_type: newItemType,
          title,
          details: parsed,
        });
        toast.success("Clinical item added");
        resetNewItem();
        await refreshClinical();
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? "Failed to add item");
      }
    }, [appointmentId, newItemTitle, newItemDetailsText, newItemType, invokeClinical, resetNewItem, refreshClinical]);

    const saveAsTemplate = useCallback(
      async (itemId: string, defaultTitle: string) => {
        const templateTitle = window.prompt("Template title (optional):", defaultTitle || "");
        try {
          await invokeClinical({
            action: "save_as_template",
            id: itemId,
            template_title: templateTitle && templateTitle.trim() ? templateTitle.trim() : undefined,
          });
          toast.success("Saved as template");
          await refreshTemplates();
        } catch (e: any) {
          console.error(e);
          toast.error(e?.message ?? "Failed to save template");
        }
      },
      [invokeClinical, refreshTemplates],
    );

    const beginEditTemplate = useCallback((tpl: ClinicalTemplate) => {
      setEditingTplId(tpl.id);
      setEditTplType(tpl.item_type);
      setEditTplTitle(tpl.title ?? "");
      setEditTplDetailsText(safeJsonStringify(tpl.details));
    }, []);

    const cancelEditTemplate = useCallback(() => {
      setEditingTplId(null);
      setEditTplType("procedure");
      setEditTplTitle("");
      setEditTplDetailsText("{}");
    }, []);

    const saveEditTemplate = useCallback(async () => {
      if (!editingTplId) return;

      const parsed = safeJsonParse(editTplDetailsText);
      if (parsed === null) {
        toast.error("Invalid JSON in template details");
        return;
      }

      try {
        await invokeClinical({
          action: "update_template",
          id: editingTplId,
          item_type: editTplType,
          title: editTplTitle.trim(),
          details: parsed,
        });
        toast.success("Template updated");
        cancelEditTemplate();
        await refreshTemplates();
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? "Failed to update template");
      }
    }, [editingTplId, editTplDetailsText, editTplTitle, editTplType, invokeClinical, cancelEditTemplate, refreshTemplates]);

    const deleteTemplate = useCallback(
      async (id: string) => {
        const ok = window.confirm("Delete this template?");
        if (!ok) return;

        try {
          await invokeClinical({ action: "delete_template", id });
          toast.success("Template deleted");
          await refreshTemplates();
        } catch (e: any) {
          console.error(e);
          toast.error(e?.message ?? "Failed to delete template");
        }
      },
      [invokeClinical, refreshTemplates],
    );

    const createTemplate = useCallback(async () => {
      const title = newTplTitle.trim();
      if (!title) {
        toast.error("Template title is required");
        return;
      }

      const parsed = safeJsonParse(newTplDetailsText);
      if (parsed === null) {
        toast.error("Invalid JSON in template details");
        return;
      }

      try {
        await invokeClinical({
          action: "create_template",
          item_type: newTplType,
          title,
          details: parsed,
        });
        toast.success("Template created");
        resetNewTpl();
        await refreshTemplates();
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? "Failed to create template");
      }
    }, [newTplTitle, newTplDetailsText, newTplType, invokeClinical, resetNewTpl, refreshTemplates]);

    const useTemplateForAppointment = useCallback(
      async (tpl: ClinicalTemplate) => {
        if (!appointmentId) return;

        try {
          await invokeClinical({
            action: "create",
            appointment_id: appointmentId,
            item_type: tpl.item_type,
            title: tpl.title,
            details: tpl.details ?? {},
          });
          toast.success("Added from template");
          await refreshClinical();
        } catch (e: any) {
          console.error(e);
          toast.error(e?.message ?? "Failed to add from template");
        }
      },
      [appointmentId, invokeClinical, refreshClinical],
    );

    if (!appointment) return null;

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-background shadow-lg">
                  <AvatarImage src={appointment.patient_avatar || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                    {appointment.patient_name}
                    {appointment.source === "referral" && (
                      <Badge variant="secondary" className="text-xs">
                        <ArrowRightLeft className="h-3 w-3 mr-1" />
                        Referral
                      </Badge>
                    )}
                  </DialogTitle>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(appointment.appointment_date), "EEEE, MMMM d, yyyy")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {appointment.start_time} - {appointment.end_time}
                    </span>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className={cn("capitalize text-sm", statusColors[appointment.status] || "")}>
                {appointment.status}
              </Badge>
            </div>
          </DialogHeader>

          {isActiveAppointment && isToday && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-2 pt-4">
              <Button onClick={onStartVisit} className="gap-2">
                <Video className="h-4 w-4" />
                {t("doctor.calendar.startVisit", "Start Visit")}
              </Button>
              <Button variant="outline" onClick={onAddNote} className="gap-2">
                <FileText className="h-4 w-4" />
                {t("doctor.calendar.addNote", "Add Note")}
              </Button>
              <Button variant="outline" onClick={onAddPrescription} className="gap-2">
                <Pill className="h-4 w-4" />
                {t("doctor.calendar.addPrescription", "Add Prescription")}
              </Button>
              <Button variant="outline" onClick={onMarkComplete} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                {t("doctor.calendar.markComplete", "Mark Complete")}
              </Button>
            </motion.div>
          )}

          <Separator className="my-4" />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full justify-start flex-wrap">
              <TabsTrigger value="details">{t("doctor.calendar.details", "Details")}</TabsTrigger>

              <TabsTrigger value="clinical" className="gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" />
                Clinical Items
                {clinicalItems.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {clinicalItems.length}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger value="procedures" className="gap-1.5">
                <Stethoscope className="h-3.5 w-3.5" />
                Procedures
                {appointmentProcedures.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {appointmentProcedures.length}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger value="treatment-plans" className="gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" />
                Treatment Plans
              </TabsTrigger>

              <TabsTrigger value="patient">{t("doctor.calendar.patient", "Patient")}</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <TabsContent value="details" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">{t("doctor.calendar.appointmentType", "Type")}</span>
                    <p className="font-medium capitalize flex items-center gap-2">
                      {appointment.appointment_type === "video" && <Video className="h-4 w-4" />}
                      {(appointment.appointment_type === "chat" || appointment.appointment_type === "messaging") && (
                        <MessageSquare className="h-4 w-4" />
                      )}
                      {appointment.appointment_type || "In-Person"}
                    </p>
                  </div>

                  {appointment.procedure_name && (
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">{t("doctor.calendar.procedure", "Procedure")}</span>
                      <p className="font-medium">{appointment.procedure_name}</p>
                      {appointment.procedure_cost != null && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          {formatCurrency(appointment.procedure_cost)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {appointment.notes && (
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {t("doctor.calendar.notes", "Notes")}
                    </span>
                    <div className="p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">{appointment.notes}</div>
                  </div>
                )}

                {appointment.status === "pending" && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-300">
                    Waiting for patient acceptance. You can start after it becomes <b>confirmed</b>.
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleBookFollowUp} className="gap-2">
                    <CalendarPlus className="h-4 w-4" />
                    Book Follow-up
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="clinical" className="mt-4 space-y-4">
                <Card className="border-border/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="font-medium flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add clinical item
                      </div>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => refreshClinical()} disabled={clinicalLoading}>
                        <RefreshCw className={cn("h-4 w-4", clinicalLoading && "animate-spin")} />
                        Refresh
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Type</div>
                        <Select value={newItemType} onValueChange={(v) => setNewItemType(v as ClinicalItemType)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="procedure">procedure</SelectItem>
                            <SelectItem value="medication">medication</SelectItem>
                            <SelectItem value="treatment_plan">treatment_plan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <div className="text-sm text-muted-foreground">Title</div>
                        <Input value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} placeholder="e.g. Ibuprofen 200mg" />
                      </div>

                      <div className="space-y-2 md:col-span-3">
                        <div className="text-sm text-muted-foreground">Details (JSON)</div>
                        <Textarea
                          value={newItemDetailsText}
                          onChange={(e) => setNewItemDetailsText(e.target.value)}
                          className="min-h-[100px] font-mono text-xs"
                          placeholder='{"dose":"200mg","frequency":"BID"}'
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button className="gap-2" onClick={createItem} disabled={clinicalLoading}>
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="border-border/50">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="font-medium flex items-center gap-2">
                          <ClipboardList className="h-4 w-4" />
                          Items
                        </div>
                        {clinicalLoading && <div className="text-xs text-muted-foreground">Loading...</div>}
                      </div>

                      {clinicalItemsSorted.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-6 text-center">No clinical items yet.</div>
                      ) : (
                        <div className="space-y-3">
                          {clinicalItemsSorted.map((it) => {
                            const isEditing = editingItemId === it.id;
                            return (
                              <div key={it.id} className="rounded-lg border p-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className="font-medium truncate">{it.title}</div>
                                      <Badge variant="secondary" className="capitalize">
                                        {it.item_type}
                                      </Badge>
                                    </div>
                                    {!isEditing && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {it.created_at ? format(new Date(it.created_at), "MMM d, yyyy h:mm a") : ""}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1.5"
                                      onClick={() => saveAsTemplate(it.id, it.title)}
                                      title="Save as template"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>

                                    {!isEditing ? (
                                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => beginEditItem(it)}>
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    ) : (
                                      <Button size="sm" variant="outline" className="gap-1.5" onClick={saveEditItem}>
                                        <Save className="h-4 w-4" />
                                      </Button>
                                    )}

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1.5 text-destructive hover:text-destructive"
                                      onClick={() => deleteItem(it.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                {isEditing ? (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                      <div className="space-y-2">
                                        <div className="text-sm text-muted-foreground">Type</div>
                                        <Select value={editItemType} onValueChange={(v) => setEditItemType(v as ClinicalItemType)}>
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="procedure">procedure</SelectItem>
                                            <SelectItem value="medication">medication</SelectItem>
                                            <SelectItem value="treatment_plan">treatment_plan</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div className="space-y-2 md:col-span-2">
                                        <div className="text-sm text-muted-foreground">Title</div>
                                        <Input value={editItemTitle} onChange={(e) => setEditItemTitle(e.target.value)} />
                                      </div>

                                      <div className="space-y-2 md:col-span-3">
                                        <div className="text-sm text-muted-foreground">Details (JSON)</div>
                                        <Textarea
                                          value={editItemDetailsText}
                                          onChange={(e) => setEditItemDetailsText(e.target.value)}
                                          className="min-h-[120px] font-mono text-xs"
                                        />
                                      </div>
                                    </div>

                                    <div className="flex justify-end gap-2">
                                      <Button variant="outline" size="sm" onClick={cancelEditItem}>
                                        Cancel
                                      </Button>
                                      <Button size="sm" onClick={saveEditItem} className="gap-2">
                                        <Save className="h-4 w-4" />
                                        Save
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-md p-2">
                                    {safeJsonStringify(it.details)}
                                  </pre>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-border/50">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="font-medium flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          Templates
                        </div>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => refreshTemplates()} disabled={templatesLoading}>
                          <RefreshCw className={cn("h-4 w-4", templatesLoading && "animate-spin")} />
                          Refresh
                        </Button>
                      </div>

                      <div className="rounded-lg border p-3 space-y-3">
                        <div className="font-medium text-sm">Create template</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Type</div>
                            <Select value={newTplType} onValueChange={(v) => setNewTplType(v as ClinicalItemType)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="procedure">procedure</SelectItem>
                                <SelectItem value="medication">medication</SelectItem>
                                <SelectItem value="treatment_plan">treatment_plan</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <div className="text-sm text-muted-foreground">Title</div>
                            <Input value={newTplTitle} onChange={(e) => setNewTplTitle(e.target.value)} placeholder="e.g. Standard post-op plan" />
                          </div>

                          <div className="space-y-2 md:col-span-3">
                            <div className="text-sm text-muted-foreground">Details (JSON)</div>
                            <Textarea
                              value={newTplDetailsText}
                              onChange={(e) => setNewTplDetailsText(e.target.value)}
                              className="min-h-[100px] font-mono text-xs"
                              placeholder='{"steps":["..."]}'
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button size="sm" className="gap-2" onClick={createTemplate} disabled={templatesLoading}>
                            <Plus className="h-4 w-4" />
                            Create
                          </Button>
                        </div>
                      </div>

                      {templatesLoading ? (
                        <div className="text-sm text-muted-foreground">Loading templates...</div>
                      ) : templatesSorted.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-4 text-center">No templates yet.</div>
                      ) : (
                        <div className="space-y-3">
                          {templatesSorted.map((tpl) => {
                            const isEditing = editingTplId === tpl.id;

                            return (
                              <div key={tpl.id} className="rounded-lg border p-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className="font-medium truncate">{tpl.title}</div>
                                      <Badge variant="secondary" className="capitalize">
                                        {tpl.item_type}
                                      </Badge>
                                    </div>
                                    {!isEditing && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {tpl.created_at ? format(new Date(tpl.created_at), "MMM d, yyyy") : ""}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => useTemplateForAppointment(tpl)}>
                                      <Plus className="h-4 w-4" />
                                    </Button>

                                    {!isEditing ? (
                                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => beginEditTemplate(tpl)}>
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    ) : (
                                      <Button size="sm" variant="outline" className="gap-1.5" onClick={saveEditTemplate}>
                                        <Save className="h-4 w-4" />
                                      </Button>
                                    )}

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1.5 text-destructive hover:text-destructive"
                                      onClick={() => deleteTemplate(tpl.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                {isEditing ? (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                      <div className="space-y-2">
                                        <div className="text-sm text-muted-foreground">Type</div>
                                        <Select value={editTplType} onValueChange={(v) => setEditTplType(v as ClinicalItemType)}>
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="procedure">procedure</SelectItem>
                                            <SelectItem value="medication">medication</SelectItem>
                                            <SelectItem value="treatment_plan">treatment_plan</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div className="space-y-2 md:col-span-2">
                                        <div className="text-sm text-muted-foreground">Title</div>
                                        <Input value={editTplTitle} onChange={(e) => setEditTplTitle(e.target.value)} />
                                      </div>

                                      <div className="space-y-2 md:col-span-3">
                                        <div className="text-sm text-muted-foreground">Details (JSON)</div>
                                        <Textarea
                                          value={editTplDetailsText}
                                          onChange={(e) => setEditTplDetailsText(e.target.value)}
                                          className="min-h-[120px] font-mono text-xs"
                                        />
                                      </div>
                                    </div>

                                    <div className="flex justify-end gap-2">
                                      <Button variant="outline" size="sm" onClick={cancelEditTemplate}>
                                        Cancel
                                      </Button>
                                      <Button size="sm" onClick={saveEditTemplate} className="gap-2">
                                        <Save className="h-4 w-4" />
                                        Save
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-md p-2">
                                    {safeJsonStringify(tpl.details)}
                                  </pre>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="procedures" className="mt-4 space-y-4">
                {loadingProcedures ? (
                  <div className="text-center py-8 text-muted-foreground">Loading procedures...</div>
                ) : appointmentProcedures.length === 0 ? (
                  <div className="text-center py-8">
                    <Stethoscope className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No procedures assigned to this appointment</p>
                    <Button variant="outline" size="sm" className="mt-4 gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Add Procedure
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointmentProcedures.map((proc) => (
                      <Card key={proc.id} className="border-border/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{proc.procedure_name}</h4>
                                <Badge variant="outline" className={cn("text-xs capitalize", procedureStatusColors[proc.status || "pending"])}>
                                  {proc.status || "pending"}
                                </Badge>
                              </div>
                              {proc.estimated_cost != null && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <DollarSign className="h-3.5 w-3.5" />
                                  {formatCurrency(proc.estimated_cost)}
                                </p>
                              )}
                              {proc.procedure_notes && <p className="text-sm text-muted-foreground">{proc.procedure_notes}</p>}
                            </div>
                            {proc.status !== "completed" && (
                              <Button size="sm" variant="outline" onClick={() => handleMarkProcedureDone(proc.id)} className="gap-1.5">
                                <Check className="h-4 w-4" />
                                Mark Done
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="treatment-plans" className="mt-4 space-y-4">
                {loadingPlans ? (
                  <div className="text-center py-8 text-muted-foreground">Loading treatment plans...</div>
                ) : treatmentPlans.length === 0 ? (
                  <div className="text-center py-8">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No treatment plans for this patient</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 gap-2"
                      onClick={() => {
                        navigate("/doctor-dashboard?section=treatment-planning");
                        onClose();
                      }}
                    >
                      <ClipboardList className="h-4 w-4" />
                      Create Treatment Plan
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {treatmentPlans.map((plan) => (
                      <Card
                        key={plan.id}
                        className="border-border/50 cursor-pointer hover:border-primary/30 transition-colors"
                        onClick={() => {
                          navigate(`/doctor-dashboard?section=treatment-planning&plan=${plan.id}`);
                          onClose();
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="font-medium">{plan.title}</h4>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                                <Badge variant="outline" className={cn("text-xs capitalize", procedureStatusColors[plan.status || "draft"])}>
                                  {plan.status || "draft"}
                                </Badge>
                                {plan.total_cost != null && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="h-3.5 w-3.5" />
                                    {formatCurrency(plan.total_cost)}
                                  </span>
                                )}
                                <span>{format(new Date(plan.created_at), "MMM d, yyyy")}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="patient" className="mt-4 space-y-4">
                <div className="space-y-3">
                  {appointment.patient_phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{appointment.patient_phone}</p>
                      </div>
                    </div>
                  )}
                  {appointment.patient_email && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{appointment.patient_email}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Button variant="outline" onClick={handleMessage} className="w-full gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {t("doctor.calendar.sendMessage", "Send Message")}
                </Button>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <Separator className="my-4" />
          <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
            <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
              {(appointment.status === "confirmed" || appointment.status === "pending") && (
                <>
                  <Button variant="outline" onClick={handleReschedule} disabled={isRescheduling} className="gap-2">
                    <Edit className="h-4 w-4" />
                    {t("doctor.calendar.reschedule", "Reschedule")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsCancelDialogOpen(true)}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <XCircle className="h-4 w-4" />
                    {t("doctor.calendar.cancel", "Cancel")}
                  </Button>
                </>
              )}
            </div>
            <Button variant="ghost" onClick={onClose}>
              {t("doctor.calendar.close", "Close")}
            </Button>
          </div>
        </DialogContent>

        <CancelAppointmentDialog
          isOpen={isCancelDialogOpen}
          onClose={() => setIsCancelDialogOpen(false)}
          onConfirm={handleCancelAppointment}
          patientName={appointment.patient_name}
        />

        <RescheduleAppointmentModal
          isOpen={isRescheduleModalOpen}
          onClose={() => setIsRescheduleModalOpen(false)}
          appointmentId={appointment.id}
          doctorId={appointment.doctor_id}
          patientName={appointment.patient_name}
          currentDate={appointment.appointment_date}
          currentTime={appointment.start_time}
          onRescheduled={handleRescheduleComplete}
        />
      </Dialog>
    );
  },
);

AppointmentModal.displayName = "AppointmentModal";

export default AppointmentModal;
