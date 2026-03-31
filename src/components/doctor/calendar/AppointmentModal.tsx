// Path: src/components/doctor/calendar/AppointmentModal.tsx
import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
  Layers,
  ChevronsUpDown,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import CancelAppointmentDialog from "./CancelAppointmentDialog";
import PatientInfoTab from "./PatientInfoTab";
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
  template_id: string | null;
  type: ClinicalItemType;
  name: string;
  description: string | null;
  quantity: number | null;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  cost: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type ClinicalTemplate = {
  id: string;
  doctor_id: string;
  type: ClinicalItemType;
  name: string;
  description: string | null;
  default_cost: number | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type CatalogProcedure = {
  id: string;
  name: string;
  category: string | null;
  cost: number | null;
  duration_minutes: number | null;
  active: boolean;
};

type CatalogTreatmentPlan = {
  id: string;
  title: string;
  status: string | null;
  total_cost: number | null;
  created_at: string | null;
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


function extractRequestedProcedureName(notes?: string | null): string | null {
  if (!notes) return null;
  const lines = notes.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = String(lines[i] || "").trim();
    const m = line.match(/^Requested\s+Procedure:\s*(.+)\s*$/i);
    if (m && m[1]) {
      const v = m[1].trim();
      return v ? v : null;
    }
  }
  return null;
}


function toNumberOrNull(v: string): number | null {
  const trimmed = (v ?? "").trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (Number.isNaN(n)) return null;
  return n;
}

function toIntOrNull(v: string): number | null {
  const trimmed = (v ?? "").trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (Number.isNaN(n)) return null;
  return Math.trunc(n);
}

function asItemType(v: unknown): ClinicalItemType {
  if (v === "procedure" || v === "medication" || v === "treatment_plan") return v;
  return "procedure";
}

function normalizeClinicalItem(row: any): ClinicalItem {
  return {
    id: String(row?.id ?? ""),
    appointment_id: String(row?.appointment_id ?? ""),
    doctor_id: String(row?.doctor_id ?? ""),
    patient_id: row?.patient_id ? String(row.patient_id) : null,
    doctor_patient_id: row?.doctor_patient_id ? String(row.doctor_patient_id) : null,
    template_id: row?.template_id ? String(row.template_id) : null,
    type: asItemType(row?.type ?? row?.item_type),
    name: String(row?.name ?? row?.title ?? ""),
    description: row?.description ?? null,
    quantity: row?.quantity ?? null,
    dosage: row?.dosage ?? null,
    frequency: row?.frequency ?? null,
    duration: row?.duration ?? null,
    cost: row?.cost ?? null,
    created_at: row?.created_at ?? null,
    updated_at: row?.updated_at ?? null,
  };
}

function normalizeTemplate(row: any): ClinicalTemplate {
  return {
    id: String(row?.id ?? ""),
    doctor_id: String(row?.doctor_id ?? ""),
    type: asItemType(row?.type ?? row?.item_type),
    name: String(row?.name ?? row?.title ?? ""),
    description: row?.description ?? null,
    default_cost: row?.default_cost ?? null,
    is_active: Boolean(row?.is_active ?? true),
    created_at: row?.created_at ?? null,
    updated_at: row?.updated_at ?? null,
  };
}

function normalizeCatalogProcedure(row: any): CatalogProcedure {
  return {
    id: String(row?.id ?? ""),
    name: String(row?.name ?? ""),
    category: row?.category ?? null,
    cost: row?.cost ?? row?.price ?? null,
    duration_minutes: row?.duration_minutes ?? row?.estimated_duration_minutes ?? null,
    active: Boolean(row?.active ?? row?.is_active ?? true),
  };
}

function normalizeCatalogPlan(row: any): CatalogTreatmentPlan {
  return {
    id: String(row?.id ?? ""),
    title: String(row?.title ?? ""),
    status: row?.status ?? null,
    total_cost: row?.total_cost ?? null,
    created_at: row?.created_at ?? null,
  };
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
    const tm = useCallback((key: string, fallback?: string) => t(`appointmentModal.${key}`, fallback ?? key), [t]);
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("details");
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [isRescheduling] = useState(false);
    const isRTL = i18n.language === "ar";

    // Existing appointment procedures + patient plans (non-edge, legacy views)
    const [appointmentProcedures, setAppointmentProcedures] = useState<AppointmentProcedure[]>([]);
    const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
    const [loadingProcedures, setLoadingProcedures] = useState(false);
    const [loadingPlans, setLoadingPlans] = useState(false);

    // Edge-backed clinical items (appointment) + templates + catalog
    const [clinicalLoading, setClinicalLoading] = useState(false);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [catalogLoading, setCatalogLoading] = useState(false);

    const [clinicalItems, setClinicalItems] = useState<ClinicalItem[]>([]);
    const [templates, setTemplates] = useState<ClinicalTemplate[]>([]);
    const [catalogProcedures, setCatalogProcedures] = useState<CatalogProcedure[]>([]);
    const [catalogPlans, setCatalogPlans] = useState<CatalogTreatmentPlan[]>([]);

    // Add UI (Catalog)
    const [catalogMode, setCatalogMode] = useState<"procedure" | "treatment_plan">("procedure");
    const [procedurePickerOpen, setProcedurePickerOpen] = useState(false);
    const [planPickerOpen, setPlanPickerOpen] = useState(false);
    const [selectedProcedureId, setSelectedProcedureId] = useState<string | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [catalogNotes, setCatalogNotes] = useState("");
    const [catalogCost, setCatalogCost] = useState("");

    // Add UI (Custom)
    const [customType, setCustomType] = useState<ClinicalItemType>("procedure");
    const [customName, setCustomName] = useState("");
    const [customDescription, setCustomDescription] = useState("");
    const [customQuantity, setCustomQuantity] = useState("");
    const [customDosage, setCustomDosage] = useState("");
    const [customFrequency, setCustomFrequency] = useState("");
    const [customDuration, setCustomDuration] = useState("");
    const [customCost, setCustomCost] = useState("");

    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [templateName, setTemplateName] = useState("");

    // Templates apply UI
    const [templateApplyOpen, setTemplateApplyOpen] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

    // Edit item UI
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editType, setEditType] = useState<ClinicalItemType>("procedure");
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editQuantity, setEditQuantity] = useState("");
    const [editDosage, setEditDosage] = useState("");
    const [editFrequency, setEditFrequency] = useState("");
    const [editDuration, setEditDuration] = useState("");
    const [editCost, setEditCost] = useState("");

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


const requestedProcedureName = useMemo(() => {
  if (!appointment) return null;
  return appointment.procedure_name || extractRequestedProcedureName(appointment.notes ?? null);
}, [appointment]);


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
        return data as any;
      },
      [getAccessToken],
    );

    const refreshClinicalItems = useCallback(async () => {
      if (!appointmentId) return;
      const res = await invokeClinical({ action: "list", appointment_id: appointmentId });
      const items = Array.isArray(res?.items) ? res.items.map(normalizeClinicalItem) : [];
      setClinicalItems(items);
    }, [appointmentId, invokeClinical]);

    const refreshTemplates = useCallback(async () => {
      const res = await invokeClinical({ action: "templates_list" });
      const list = Array.isArray(res?.templates) ? res.templates.map(normalizeTemplate) : [];
      setTemplates(list);
    }, [invokeClinical]);

    const refreshCatalog = useCallback(async () => {
      if (!appointmentId) return;
      const res = await invokeClinical({ action: "catalog_list", appointment_id: appointmentId, include_inactive: false, limit: 500 });
      const procedures = Array.isArray(res?.catalog?.procedures) ? res.catalog.procedures.map(normalizeCatalogProcedure) : [];
      const plans = Array.isArray(res?.catalog?.treatment_plans) ? res.catalog.treatment_plans.map(normalizeCatalogPlan) : [];
      setCatalogProcedures(procedures);
      setCatalogPlans(plans);
    }, [appointmentId, invokeClinical]);

    const refreshAllClinical = useCallback(async () => {
      if (!appointmentId) return;
      setClinicalLoading(true);
      setTemplatesLoading(true);
      setCatalogLoading(true);

      try {
        await Promise.all([refreshClinicalItems(), refreshTemplates(), refreshCatalog()]);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? tm("failedLoadClinical", "Failed to load clinical data"));
      } finally {
        setClinicalLoading(false);
        setTemplatesLoading(false);
        setCatalogLoading(false);
      }
    }, [appointmentId, refreshCatalog, refreshClinicalItems, refreshTemplates]);

    const resetCustomForm = useCallback(() => {
      setCustomType("procedure");
      setCustomName("");
      setCustomDescription("");
      setCustomQuantity("");
      setCustomDosage("");
      setCustomFrequency("");
      setCustomDuration("");
      setCustomCost("");
      setSaveAsTemplate(false);
      setTemplateName("");
    }, []);

    const resetCatalogForm = useCallback(() => {
      setCatalogMode("procedure");
      setSelectedProcedureId(null);
      setSelectedPlanId(null);
      setCatalogNotes("");
      setCatalogCost("");
    }, []);

    // Fetch procedures for this appointment (legacy)
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
            procedure_name: p.procedures?.name || tm("noProcedureFound", "Unknown Procedure"),
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

    // Fetch treatment plans for this patient (legacy)
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

    // Fetch edge clinical data on open
    useEffect(() => {
      if (!isOpen || !appointmentId) return;
      setEditingId(null);
      resetCustomForm();
      resetCatalogForm();
      setSelectedTemplateId(null);
      refreshAllClinical();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, appointmentId]);

    const handleMarkProcedureDone = useCallback(async (procedureId: string) => {
      try {
        const { error } = await (supabase as any)
          .from("appointment_procedures")
          .update({ status: "completed" })
          .eq("id", procedureId);
        if (error) throw error;

        setAppointmentProcedures((prev) => prev.map((p) => (p.id === procedureId ? { ...p, status: "completed" } : p)));
        toast.success(tm("procedureCompleted", "Procedure marked as completed"));
      } catch (err: any) {
        toast.error(err?.message || tm("failedUpdateProcedure", "Failed to update procedure"));
      }
    }, []);

    const handleBookFollowUp = useCallback(() => {
      if (!appointment) return;
      const patientKey = appointment.patient_id ? `reg:${appointment.patient_id}` : `dp:${appointment.doctor_patient_id}`;
      navigate(
        `/doctor-dashboard?section=calendar&patient=${encodeURIComponent(patientKey)}&followupOf=${encodeURIComponent(appointment.id)}`,
      );
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
          toast.error(tm("failedCancelAppointment", "Failed to cancel appointment"));
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
        toast.error(tm("patientInfoUnavailable", "Patient information not available"));
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
        toast.error(tm("failedStartConversation", "Failed to start conversation"));
      }
    }, [appointment, navigate, onClose]);

    const clinicalItemsSorted = useMemo(() => {
      const list = Array.isArray(clinicalItems) ? clinicalItems.slice() : [];
      list.sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
      return list;
    }, [clinicalItems]);

    const templatesSorted = useMemo(() => {
      const list = Array.isArray(templates) ? templates.slice() : [];
      list.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
      return list;
    }, [templates]);

    const selectedProcedure = useMemo(
      () => (selectedProcedureId ? catalogProcedures.find((p) => p.id === selectedProcedureId) || null : null),
      [catalogProcedures, selectedProcedureId],
    );

    const selectedPlan = useMemo(
      () => (selectedPlanId ? catalogPlans.find((p) => p.id === selectedPlanId) || null : null),
      [catalogPlans, selectedPlanId],
    );

    const selectedTemplate = useMemo(
      () => (selectedTemplateId ? templatesSorted.find((t) => t.id === selectedTemplateId) || null : null),
      [templatesSorted, selectedTemplateId],
    );

    const beginEditItem = useCallback((it: ClinicalItem) => {
      setEditingId(it.id);
      setEditType(it.type);
      setEditName(it.name || "");
      setEditDescription(it.description || "");
      setEditQuantity(it.quantity != null ? String(it.quantity) : "");
      setEditDosage(it.dosage || "");
      setEditFrequency(it.frequency || "");
      setEditDuration(it.duration || "");
      setEditCost(it.cost != null ? String(it.cost) : "");
    }, []);

    const cancelEditItem = useCallback(() => {
      setEditingId(null);
      setEditType("procedure");
      setEditName("");
      setEditDescription("");
      setEditQuantity("");
      setEditDosage("");
      setEditFrequency("");
      setEditDuration("");
      setEditCost("");
    }, []);

    const saveEditItem = useCallback(async () => {
      if (!editingId || !appointmentId) return;

      const name = editName.trim();
      if (!name) {
        toast.error(tm("nameRequired", "Name is required"));
        return;
      }

      try {
        await invokeClinical({
          action: "update",
          appointment_id: appointmentId,
          item_id: editingId,
          type: editType,
          name,
          description: editDescription.trim() || null,
          quantity: toIntOrNull(editQuantity),
          dosage: editDosage.trim() || null,
          frequency: editFrequency.trim() || null,
          duration: editDuration.trim() || null,
          cost: toNumberOrNull(editCost),
        });

        toast.success(tm("clinicalItemUpdated", "Clinical item updated"));
        cancelEditItem();
        await refreshClinicalItems();
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? tm("failedUpdateItem", "Failed to update item"));
      }
    }, [
      appointmentId,
      cancelEditItem,
      editCost,
      editDescription,
      editDosage,
      editFrequency,
      editDuration,
      editName,
      editQuantity,
      editType,
      editingId,
      invokeClinical,
      refreshClinicalItems,
    ]);

    const deleteItem = useCallback(
      async (itemId: string) => {
        if (!appointmentId) return;
        const ok = window.confirm(tm("deleteClinicalItem", "Delete this clinical item?"));
        if (!ok) return;

        try {
          await invokeClinical({ action: "delete", appointment_id: appointmentId, item_id: itemId });
          toast.success(tm("clinicalItemDeleted", "Clinical item deleted"));
          await refreshClinicalItems();
        } catch (e: any) {
          console.error(e);
          toast.error(e?.message ?? tm("failedDeleteItem", "Failed to delete item"));
        }
      },
      [appointmentId, invokeClinical, refreshClinicalItems],
    );

    const createCustomItem = useCallback(async () => {
      if (!appointmentId) return;
      const name = customName.trim();
      if (!name) {
        toast.error(tm("nameRequired", "Name is required"));
        return;
      }

      try {
        await invokeClinical({
          action: "create",
          appointment_id: appointmentId,
          type: customType,
          name,
          description: customDescription.trim() || null,
          quantity: toIntOrNull(customQuantity),
          dosage: customDosage.trim() || null,
          frequency: customFrequency.trim() || null,
          duration: customDuration.trim() || null,
          cost: toNumberOrNull(customCost),
          ...(saveAsTemplate
            ? {
                save_as_template: true,
                template_name: templateName.trim() ? templateName.trim() : name,
                template_description: customDescription.trim() || null,
                template_default_cost: toNumberOrNull(customCost),
              }
            : {}),
        });

        toast.success(saveAsTemplate ? tm("itemAddedTemplate", "Item added and saved as template") : tm("clinicalItemAdded", "Clinical item added"));
        resetCustomForm();
        await Promise.all([refreshClinicalItems(), refreshTemplates()]);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? tm("failedAddItem", "Failed to add item"));
      }
    }, [
      appointmentId,
      customCost,
      customDescription,
      customDosage,
      customFrequency,
      customDuration,
      customName,
      customQuantity,
      customType,
      invokeClinical,
      refreshClinicalItems,
      refreshTemplates,
      resetCustomForm,
      saveAsTemplate,
      templateName,
    ]);

    const addFromCatalog = useCallback(async () => {
      if (!appointmentId) return;

      try {
        if (catalogMode === "procedure") {
          if (!selectedProcedure) {
            toast.error(tm("selectAProcedure", "Select a procedure"));
            return;
          }

          const cost = toNumberOrNull(catalogCost) ?? selectedProcedure.cost ?? null;
          const duration =
            selectedProcedure.duration_minutes != null ? `${selectedProcedure.duration_minutes} min` : null;

          await invokeClinical({
            action: "create",
            appointment_id: appointmentId,
            type: "procedure",
            name: selectedProcedure.name,
            description: catalogNotes.trim() || null,
            cost,
            duration,
          });

          toast.success(tm("procedureAdded", "Procedure added to appointment"));
          resetCatalogForm();
          await refreshClinicalItems();
          return;
        }

        if (catalogMode === "treatment_plan") {
          if (!selectedPlan) {
            toast.error(tm("selectATreatmentPlan", "Select a treatment plan"));
            return;
          }

          const cost = toNumberOrNull(catalogCost) ?? selectedPlan.total_cost ?? null;
          const description = catalogNotes.trim() || null;

          await invokeClinical({
            action: "create",
            appointment_id: appointmentId,
            type: "treatment_plan",
            name: selectedPlan.title,
            description,
            cost,
          });

          toast.success("Treatment plan added to appointment");
          resetCatalogForm();
          await refreshClinicalItems();
        }
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? "Failed to add from catalog");
      }
    }, [
      appointmentId,
      catalogCost,
      catalogMode,
      catalogNotes,
      invokeClinical,
      refreshClinicalItems,
      resetCatalogForm,
      selectedPlan,
      selectedProcedure,
    ]);

    const applyTemplate = useCallback(async () => {
      if (!appointmentId) return;
      if (!selectedTemplate) {
        toast.error("Select a template");
        return;
      }

      try {
        await invokeClinical({ action: "apply_template", appointment_id: appointmentId, template_id: selectedTemplate.id });
        toast.success("Template applied");
        setSelectedTemplateId(null);
        setTemplateApplyOpen(false);
        await refreshClinicalItems();
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? "Failed to apply template");
      }
    }, [appointmentId, invokeClinical, refreshClinicalItems, selectedTemplate]);

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

{requestedProcedureName && (
  <div className="mt-2 flex items-center gap-2">
    <Badge
      variant="outline"
      className="text-xs max-w-[520px] flex items-center gap-1.5"
      title={requestedProcedureName}
    >
      <Stethoscope className="h-3.5 w-3.5" />
      <span className="truncate">{requestedProcedureName}</span>
    </Badge>
  </div>
)}

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

                  {requestedProcedureName && (
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">{t("doctor.calendar.procedure", "Procedure")}</span>
                      <p className="font-medium">{requestedProcedureName}</p>
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
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-medium flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Clinical Items
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => refreshAllClinical()}
                    disabled={clinicalLoading || templatesLoading || catalogLoading}
                  >
                    <RefreshCw className={cn("h-4 w-4", (clinicalLoading || templatesLoading || catalogLoading) && "animate-spin")} />
                    Refresh
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Add / Templates */}
                  <Card className="border-border/50">
                    <CardContent className="p-4 space-y-4">
                      <Tabs defaultValue="catalog" className="space-y-4">
                        <TabsList className="w-full grid grid-cols-3">
                          <TabsTrigger value="catalog" className="gap-2">
                            <Layers className="h-4 w-4" />
                            Catalog
                          </TabsTrigger>
                          <TabsTrigger value="custom" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Custom
                          </TabsTrigger>
                          <TabsTrigger value="templates" className="gap-2">
                            <ClipboardList className="h-4 w-4" />
                            Templates
                          </TabsTrigger>
                        </TabsList>

                        {/* Catalog */}
                        <TabsContent value="catalog" className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">Add your own procedures / plans during the appointment</div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              variant={catalogMode === "procedure" ? "default" : "outline"}
                              size="sm"
                              className="gap-2"
                              onClick={() => setCatalogMode("procedure")}
                            >
                              <Stethoscope className="h-4 w-4" />
                              Procedures
                            </Button>
                            <Button
                              type="button"
                              variant={catalogMode === "treatment_plan" ? "default" : "outline"}
                              size="sm"
                              className="gap-2"
                              onClick={() => setCatalogMode("treatment_plan")}
                            >
                              <ClipboardList className="h-4 w-4" />
                              Treatment Plans
                            </Button>
                          </div>

                          {catalogMode === "procedure" ? (
                            <div className="space-y-3">
                              <Popover open={procedurePickerOpen} onOpenChange={setProcedurePickerOpen}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" role="combobox" aria-expanded={procedurePickerOpen} className="w-full justify-between">
                                    <span className="truncate">
                                      {selectedProcedure ? selectedProcedure.name : catalogLoading ? "Loading procedures..." : "Select procedure"}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[420px] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Search procedures..." />
                                    <CommandList>
                                      <CommandEmpty>No procedure found.</CommandEmpty>
                                      <CommandGroup heading="My Procedures">
                                        {catalogProcedures
                                          .filter((p) => p.active)
                                          .map((p) => (
                                            <CommandItem
                                              key={p.id}
                                              value={p.name}
                                              onSelect={() => {
                                                setSelectedProcedureId(p.id);
                                                setProcedurePickerOpen(false);
                                                setCatalogCost(p.cost != null ? String(p.cost) : "");
                                              }}
                                            >
                                              <Check className={cn("mr-2 h-4 w-4", selectedProcedureId === p.id ? "opacity-100" : "opacity-0")} />
                                              <div className="flex flex-col">
                                                <span>{p.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                  {p.category ? `${p.category} • ` : ""}
                                                  {p.duration_minutes != null ? `${p.duration_minutes} min` : "No duration"}
                                                  {p.cost != null ? ` • ${formatCurrency(p.cost)}` : ""}
                                                </span>
                                              </div>
                                            </CommandItem>
                                          ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">Cost (optional)</div>
                                  <Input
                                    value={catalogCost}
                                    onChange={(e) => setCatalogCost(e.target.value)}
                                    placeholder={selectedProcedure?.cost != null ? String(selectedProcedure.cost) : "e.g. 120"}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">Duration</div>
                                  <Input
                                    value={selectedProcedure?.duration_minutes != null ? `${selectedProcedure.duration_minutes} min` : ""}
                                    readOnly
                                    placeholder="—"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">Notes (optional)</div>
                                <Textarea
                                  value={catalogNotes}
                                  onChange={(e) => setCatalogNotes(e.target.value)}
                                  className="min-h-[90px]"
                                  placeholder="Add any procedure notes..."
                                />
                              </div>

                              <div className="flex justify-end">
                                <Button size="sm" className="gap-2" onClick={addFromCatalog} disabled={clinicalLoading || catalogLoading}>
                                  <Plus className="h-4 w-4" />
                                  Add to Appointment
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <Popover open={planPickerOpen} onOpenChange={setPlanPickerOpen}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" role="combobox" aria-expanded={planPickerOpen} className="w-full justify-between">
                                    <span className="truncate">
                                      {selectedPlan ? selectedPlan.title : catalogLoading ? "Loading plans..." : "Select treatment plan"}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[420px] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Search treatment plans..." />
                                    <CommandList>
                                      <CommandEmpty>No plan found.</CommandEmpty>
                                      <CommandGroup heading="My Treatment Plans">
                                        {catalogPlans.map((p) => (
                                          <CommandItem
                                            key={p.id}
                                            value={p.title}
                                            onSelect={() => {
                                              setSelectedPlanId(p.id);
                                              setPlanPickerOpen(false);
                                              setCatalogCost(p.total_cost != null ? String(p.total_cost) : "");
                                            }}
                                          >
                                            <Check className={cn("mr-2 h-4 w-4", selectedPlanId === p.id ? "opacity-100" : "opacity-0")} />
                                            <div className="flex flex-col">
                                              <span className="truncate">{p.title}</span>
                                              <span className="text-xs text-muted-foreground">
                                                {p.status ? `${p.status} • ` : ""}
                                                {p.total_cost != null ? `${formatCurrency(p.total_cost)}` : "No cost"}
                                              </span>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>

                              <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">Cost (optional)</div>
                                <Input
                                  value={catalogCost}
                                  onChange={(e) => setCatalogCost(e.target.value)}
                                  placeholder={selectedPlan?.total_cost != null ? String(selectedPlan.total_cost) : "e.g. 900"}
                                />
                              </div>

                              <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">Notes (optional)</div>
                                <Textarea
                                  value={catalogNotes}
                                  onChange={(e) => setCatalogNotes(e.target.value)}
                                  className="min-h-[90px]"
                                  placeholder="Add any notes..."
                                />
                              </div>

                              <div className="flex justify-end">
                                <Button size="sm" className="gap-2" onClick={addFromCatalog} disabled={clinicalLoading || catalogLoading}>
                                  <Plus className="h-4 w-4" />
                                  Add to Appointment
                                </Button>
                              </div>
                            </div>
                          )}
                        </TabsContent>

                        {/* Custom */}
                        <TabsContent value="custom" className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-2">
                              <div className="text-sm text-muted-foreground">Type</div>
                              <Select value={customType} onValueChange={(v) => setCustomType(v as ClinicalItemType)}>
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
                              <div className="text-sm text-muted-foreground">Name</div>
                              <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Ibuprofen 200mg" />
                            </div>

                            <div className="space-y-2 md:col-span-3">
                              <div className="text-sm text-muted-foreground">Description / Notes</div>
                              <Textarea
                                value={customDescription}
                                onChange={(e) => setCustomDescription(e.target.value)}
                                className="min-h-[90px]"
                                placeholder="Optional notes..."
                              />
                            </div>

                            <div className="space-y-2">
                              <div className="text-sm text-muted-foreground">Cost (optional)</div>
                              <Input value={customCost} onChange={(e) => setCustomCost(e.target.value)} placeholder="e.g. 120" />
                            </div>

                            {customType === "medication" && (
                              <>
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">Dosage</div>
                                  <Input value={customDosage} onChange={(e) => setCustomDosage(e.target.value)} placeholder="e.g. 200mg" />
                                </div>
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">Frequency</div>
                                  <Input value={customFrequency} onChange={(e) => setCustomFrequency(e.target.value)} placeholder="e.g. BID" />
                                </div>
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">Duration</div>
                                  <Input value={customDuration} onChange={(e) => setCustomDuration(e.target.value)} placeholder="e.g. 7 days" />
                                </div>
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">Quantity</div>
                                  <Input value={customQuantity} onChange={(e) => setCustomQuantity(e.target.value)} placeholder="e.g. 14" />
                                </div>
                              </>
                            )}

                            {customType === "procedure" && (
                              <div className="space-y-2 md:col-span-2">
                                <div className="text-sm text-muted-foreground">Duration (optional)</div>
                                <Input
                                  value={customDuration}
                                  onChange={(e) => setCustomDuration(e.target.value)}
                                  placeholder="e.g. 30 min"
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 border rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="saveAsTemplate"
                                checked={saveAsTemplate}
                                onCheckedChange={(v) => setSaveAsTemplate(Boolean(v))}
                              />
                              <label htmlFor="saveAsTemplate" className="text-sm cursor-pointer select-none">
                                Save as template
                              </label>
                            </div>
                            {saveAsTemplate && (
                              <Input
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="Template name (optional)"
                                className="max-w-[260px]"
                              />
                            )}
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={resetCustomForm}>
                              Reset
                            </Button>
                            <Button size="sm" className="gap-2" onClick={createCustomItem} disabled={clinicalLoading}>
                              <Plus className="h-4 w-4" />
                              Add
                            </Button>
                          </div>
                        </TabsContent>

                        {/* Templates */}
                        <TabsContent value="templates" className="space-y-4">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="text-sm text-muted-foreground">Apply a saved template to this appointment</div>
                            {templatesLoading && <div className="text-xs text-muted-foreground">Loading...</div>}
                          </div>

                          <Popover open={templateApplyOpen} onOpenChange={setTemplateApplyOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" aria-expanded={templateApplyOpen} className="w-full justify-between">
                                <span className="truncate">
                                  {selectedTemplate ? selectedTemplate.name : templatesLoading ? "Loading templates..." : "Select template"}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[420px] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Search templates..." />
                                <CommandList>
                                  <CommandEmpty>No template found.</CommandEmpty>
                                  <CommandGroup heading="My Templates">
                                    {templatesSorted
                                      .filter((tpl) => tpl.is_active)
                                      .map((tpl) => (
                                        <CommandItem
                                          key={tpl.id}
                                          value={tpl.name}
                                          onSelect={() => {
                                            setSelectedTemplateId(tpl.id);
                                            setTemplateApplyOpen(false);
                                          }}
                                        >
                                          <Check className={cn("mr-2 h-4 w-4", selectedTemplateId === tpl.id ? "opacity-100" : "opacity-0")} />
                                          <div className="flex flex-col">
                                            <span>{tpl.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                              {tpl.type}
                                              {tpl.default_cost != null ? ` • ${formatCurrency(tpl.default_cost)}` : ""}
                                            </span>
                                          </div>
                                        </CommandItem>
                                      ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>

                          {selectedTemplate && (
                            <div className="rounded-lg border p-3 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-medium truncate">{selectedTemplate.name}</div>
                                <Badge variant="secondary" className="capitalize">
                                  {selectedTemplate.type}
                                </Badge>
                              </div>
                              {selectedTemplate.description && (
                                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedTemplate.description}</div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {selectedTemplate.default_cost != null ? `Default: ${formatCurrency(selectedTemplate.default_cost)}` : "No default cost"}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTemplateId(null)}
                              disabled={!selectedTemplateId}
                            >
                              Clear
                            </Button>
                            <Button size="sm" className="gap-2" onClick={applyTemplate} disabled={!selectedTemplateId || clinicalLoading}>
                              <Layers className="h-4 w-4" />
                              Apply
                            </Button>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>

                  {/* Items List */}
                  <Card className="border-border/50">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="font-medium flex items-center gap-2">
                          <ClipboardList className="h-4 w-4" />
                          Items
                        </div>
                        {(clinicalLoading || templatesLoading || catalogLoading) && (
                          <div className="text-xs text-muted-foreground">Loading...</div>
                        )}
                      </div>

                      {clinicalItemsSorted.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-6 text-center">No clinical items yet.</div>
                      ) : (
                        <div className="space-y-3">
                          {clinicalItemsSorted.map((it) => {
                            const isEditing = editingId === it.id;

                            return (
                              <div key={it.id} className="rounded-lg border p-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className="font-medium truncate">{it.name}</div>
                                      <Badge variant="secondary" className="capitalize">
                                        {it.type}
                                      </Badge>
                                      {it.cost != null && (
                                        <Badge variant="outline" className="text-xs">
                                          {formatCurrency(it.cost)}
                                        </Badge>
                                      )}
                                    </div>
                                    {!isEditing && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {it.created_at ? format(new Date(it.created_at), "MMM d, yyyy h:mm a") : ""}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 flex-shrink-0">
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
                                        <Select value={editType} onValueChange={(v) => setEditType(v as ClinicalItemType)}>
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
                                        <div className="text-sm text-muted-foreground">Name</div>
                                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                                      </div>

                                      <div className="space-y-2 md:col-span-3">
                                        <div className="text-sm text-muted-foreground">Description / Notes</div>
                                        <Textarea
                                          value={editDescription}
                                          onChange={(e) => setEditDescription(e.target.value)}
                                          className="min-h-[90px]"
                                        />
                                      </div>

                                      <div className="space-y-2">
                                        <div className="text-sm text-muted-foreground">Cost</div>
                                        <Input value={editCost} onChange={(e) => setEditCost(e.target.value)} placeholder="e.g. 120" />
                                      </div>

                                      {editType === "medication" && (
                                        <>
                                          <div className="space-y-2">
                                            <div className="text-sm text-muted-foreground">Dosage</div>
                                            <Input value={editDosage} onChange={(e) => setEditDosage(e.target.value)} />
                                          </div>
                                          <div className="space-y-2">
                                            <div className="text-sm text-muted-foreground">Frequency</div>
                                            <Input value={editFrequency} onChange={(e) => setEditFrequency(e.target.value)} />
                                          </div>
                                          <div className="space-y-2">
                                            <div className="text-sm text-muted-foreground">Duration</div>
                                            <Input value={editDuration} onChange={(e) => setEditDuration(e.target.value)} />
                                          </div>
                                          <div className="space-y-2">
                                            <div className="text-sm text-muted-foreground">Quantity</div>
                                            <Input value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} />
                                          </div>
                                        </>
                                      )}

                                      {editType === "procedure" && (
                                        <div className="space-y-2 md:col-span-2">
                                          <div className="text-sm text-muted-foreground">Duration</div>
                                          <Input value={editDuration} onChange={(e) => setEditDuration(e.target.value)} placeholder="e.g. 30 min" />
                                        </div>
                                      )}
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
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    {it.description && <div className="whitespace-pre-wrap">{it.description}</div>}
                                    {(it.dosage || it.frequency || it.duration || it.quantity != null) && (
                                      <div className="text-xs text-muted-foreground">
                                        {it.dosage ? `Dosage: ${it.dosage} ` : ""}
                                        {it.frequency ? `• Frequency: ${it.frequency} ` : ""}
                                        {it.duration ? `• Duration: ${it.duration} ` : ""}
                                        {it.quantity != null ? `• Qty: ${it.quantity}` : ""}
                                      </div>
                                    )}
                                  </div>
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
                                <Badge
                                  variant="outline"
                                  className={cn("text-xs capitalize", procedureStatusColors[proc.status || "pending"])}
                                >
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
                <PatientInfoTab appointment={appointment} onMessage={handleMessage} />
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
