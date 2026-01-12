// src/components/doctor/TreatmentPlanningSection.tsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Users,
  Calendar,
  FileText,
  Trash2,
  Eye,
  Copy,
  LayoutTemplate,
  MessageSquare,
  Video,
  CalendarPlus,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import EnhancedCreateTreatmentPlanModal from "@/components/treatment/EnhancedCreateTreatmentPlanModal";
import EnhancedTreatmentPlanDetailModal from "@/components/treatment/EnhancedTreatmentPlanDetailModal";
import MedicationManagementModal from "@/components/treatment/MedicationManagementModal";

interface TreatmentPlanTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  is_public: boolean | null;
  template_data: any;
  created_at: string;
  doctor_id: string;
}

type TreatmentPlanStatus =
  | "draft"
  | "published"
  | "pending_confirmation"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | string;

interface TreatmentPlan {
  id: string;
  doctor_id: string;
  patient_id: string | null; // registered patient (profiles.user_id)
  doctor_patient_id: string | null; // doctor-added patient (doctor_patients.id)
  title: string;
  notes?: string | null;
  description?: string | null; // keep compat if older UI uses it
  status: TreatmentPlanStatus;
  total_cost: number | null;
  created_at: string;
  published_at?: string | null;
  completed_at?: string | null;
  priority?: string | null;
  updated_at?: string | null;
}

type PatientSource = "registered" | "doctor_added";

/**
 * Prefix ids so filtering never collides:
 * - reg:<profiles.user_id>
 * - dp:<doctor_patients.id>
 */
interface PatientOption {
  key: `reg:${string}` | `dp:${string}`;
  id: string;
  source: PatientSource;
  name: string;
  email?: string | null;
  phone?: string | null;
}

const TreatmentPlanningSection = () => {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const navigate = useNavigate();

  const [doctorProfileId, setDoctorProfileId] = useState<string | null>(null);

  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<TreatmentPlan[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);

  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [patientFilter, setPatientFilter] = useState<string>("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlan | null>(null);

  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [selectedPlanForMeds, setSelectedPlanForMeds] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("plans");

  // Templates
  const [templates, setTemplates] = useState<TreatmentPlanTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSearchTerm, setTemplateSearchTerm] = useState("");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState("all");
  const [applyingTemplateData, setApplyingTemplateData] = useState<any>(null);

  const templateCategories = [
    "general",
    "preventive",
    "restorative",
    "cosmetic",
    "orthodontic",
    "oral_surgery",
    "endodontic",
    "periodontic",
  ];

  const statusOptions = useMemo(
    () => [
      { value: "all", label: t("doctor.treatmentPlanning.allStatuses") || "All" },
      { value: "draft", label: t("doctor.treatmentPlanning.draft") || "Draft" },
      { value: "published", label: t("doctor.treatmentPlanning.published") || "Published" },
      { value: "pending_confirmation", label: "Pending confirmation" },
      { value: "confirmed", label: "Confirmed" },
      { value: "in_progress", label: t("doctor.treatmentPlanning.inProgress") || "In progress" },
      { value: "completed", label: t("doctor.treatmentPlanning.completed") || "Completed" },
      { value: "cancelled", label: "Cancelled" },
    ],
    [t]
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      published: "bg-blue-100 text-blue-800",
      pending_confirmation: "bg-purple-100 text-purple-800",
      confirmed: "bg-indigo-100 text-indigo-800",
      in_progress: "bg-orange-100 text-orange-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || colors.draft;
  };

  const getPlanPatientKey = (plan: TreatmentPlan) => {
    if (plan.patient_id) return `reg:${plan.patient_id}` as const;
    if (plan.doctor_patient_id) return `dp:${plan.doctor_patient_id}` as const;
    return null;
  };

  const getPatientName = (plan: TreatmentPlan) => {
    const key = getPlanPatientKey(plan);
    if (!key) return t("doctor.treatmentPlanning.unknownPatient") || "Unknown patient";
    const p = patients.find((x) => x.key === key);
    return p?.name || (t("doctor.treatmentPlanning.unknownPatient") || "Unknown patient");
  };

  // Quick actions (work for both types because we pass prefixed key)
  const handleMessagePatient = (patientKey: string) => navigate(`/messages?recipient=${patientKey}`);
  const handleScheduleAppointment = (patientKey: string) => navigate(`/doctor-dashboard?section=calendar&patient=${patientKey}`);
  const handleVideoCall = (patientKey: string) => navigate(`/video-call?patient=${patientKey}`);

  // ---------- DATA LOADING (REAL ONLY, NO HARDCODE) ----------

  const loadDoctorProfileId = useCallback(async () => {
    if (!user?.id) {
      setDoctorProfileId(null);
      return null;
    }

    const { data, error } = await supabase.from("doctors").select("id").eq("user_id", user.id).maybeSingle();

    if (error) {
      console.error("Failed to load doctor profile:", error);
      toast.error("Failed to load doctor profile");
      setDoctorProfileId(null);
      return null;
    }

    const id = data?.id ?? null;
    setDoctorProfileId(id);
    return id;
  }, [user?.id]);

  const fetchTreatmentPlans = useCallback(async (doctorIdParam?: string | null) => {
    const did = doctorIdParam ?? doctorProfileId;
    if (!did) {
      setTreatmentPlans([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("treatment_plans")
        .select("*")
        .eq("doctor_id", did)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTreatmentPlans((data || []) as TreatmentPlan[]);
    } catch (e: any) {
      console.error("Failed to load plans:", e);
      toast.error("Failed to load treatment plans: " + (e?.message || "Unknown error"));
      setTreatmentPlans([]);
    }
  }, [doctorProfileId]);

  /**
   * REAL patients list includes:
   * 1) ALL doctor_added patients for this doctor (doctor_patients)
   * 2) registered patients who appear in appointments for this doctor (appointments.patient_id)
   * 3) registered patients who appear in plans (treatment_plans.patient_id)
   */
  const fetchPatients = useCallback(
    async (doctorIdParam?: string | null, plansParam?: TreatmentPlan[]) => {
      const did = doctorIdParam ?? doctorProfileId;
      if (!did) {
        setPatients([]);
        return;
      }

      try {
        // 1) doctor added
        const { data: dp, error: dpErr } = await supabase
          .from("doctor_patients")
          .select("id, full_name, email, phone, status")
          .eq("doctor_id", did)
          .order("full_name");

        if (dpErr) throw dpErr;

        const doctorAdded: PatientOption[] = (dp || []).map((p: any) => ({
          key: `dp:${p.id}`,
          id: p.id,
          source: "doctor_added",
          name: p.full_name || p.phone || "Patient",
          email: p.email ?? null,
          phone: p.phone ?? null,
        }));

        // 2) registered from appointments
        const { data: ap, error: apErr } = await supabase.from("appointments").select("patient_id").eq("doctor_id", did);
        if (apErr) throw apErr;
        const apIds = (ap || []).map((x: any) => x.patient_id).filter(Boolean) as string[];

        // 3) registered from plans
        const planIds = ((plansParam || treatmentPlans).map((p) => p.patient_id).filter(Boolean) as string[]) || [];
        const registeredIds = Array.from(new Set([...apIds, ...planIds]));

        let registered: PatientOption[] = [];
        if (registeredIds.length) {
          const { data: pr, error: prErr } = await supabase
            .from("profiles")
            .select("user_id, full_name, email, phone")
            .in("user_id", registeredIds);

          // if RLS blocks, note it but don't break UI
          if (!prErr && pr?.length) {
            registered = pr.map((p: any) => ({
              key: `reg:${p.user_id}`,
              id: p.user_id,
              source: "registered",
              name: p.full_name || p.email || p.phone || "Patient",
              email: p.email ?? null,
              phone: p.phone ?? null,
            }));
          } else {
            registered = registeredIds.map((id) => ({
              key: `reg:${id}`,
              id,
              source: "registered",
              name: "Registered patient",
              email: null,
              phone: null,
            }));
          }
        }

        const merged = [...doctorAdded, ...registered].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setPatients(merged);
      } catch (e: any) {
        console.error("Failed to load patients:", e);
        toast.error("Failed to load patients: " + (e?.message || "Unknown error"));
        setPatients([]);
      }
    },
    [doctorProfileId, treatmentPlans]
  );

  const fetchTemplates = useCallback(async (doctorIdParam?: string | null) => {
    const did = doctorIdParam ?? doctorProfileId;
    if (!did) {
      setTemplates([]);
      return;
    }

    setTemplatesLoading(true);
    try {
      const { data, error } = await supabase
        .from("treatment_plan_templates")
        .select("*")
        .or(`doctor_id.eq.${did},is_public.eq.true`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as TreatmentPlanTemplate[]);
    } catch (e) {
      console.error("Failed to load templates:", e);
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, [doctorProfileId]);

  // Boot: load doctor profile id then load plans/templates
  useEffect(() => {
    (async () => {
      setLoading(true);
      const did = await loadDoctorProfileId();
      if (did) {
        await fetchTreatmentPlans(did);
        await fetchTemplates(did);
      } else {
        setTreatmentPlans([]);
        setTemplates([]);
        setPatients([]);
      }
      setLoading(false);
    })();
  }, [loadDoctorProfileId, fetchTreatmentPlans, fetchTemplates]);

  // Refresh patients whenever plans change (so new plans resolve patient name immediately)
  useEffect(() => {
    if (!doctorProfileId) return;
    fetchPatients(doctorProfileId, treatmentPlans);
  }, [doctorProfileId, treatmentPlans, fetchPatients]);

  // Realtime: refresh plans immediately when created/updated/deleted
  useEffect(() => {
    if (!doctorProfileId) return;

    const channel = supabase
      .channel(`doctor-treatment-plans-${doctorProfileId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "treatment_plans", filter: `doctor_id=eq.${doctorProfileId}` },
        () => {
          fetchTreatmentPlans(doctorProfileId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorProfileId, fetchTreatmentPlans]);

  // ---------- FILTERING ----------
  useEffect(() => {
    let filtered = treatmentPlans;

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter((plan) => {
        const title = (plan.title || "").toLowerCase();
        const desc = ((plan.notes ?? plan.description) || "").toLowerCase();
        return title.includes(s) || desc.includes(s);
      });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((plan) => String(plan.status) === statusFilter);
    }

    if (patientFilter !== "all") {
      filtered = filtered.filter((plan) => {
        const key = getPlanPatientKey(plan);
        return key === patientFilter;
      });
    }

    setFilteredPlans(filtered);
  }, [treatmentPlans, searchTerm, statusFilter, patientFilter]);

  // ---------- ACTIONS ----------
  const handleDeletePlan = async (id: string) => {
    if (!confirm(t("doctor.treatmentPlanning.deleteConfirm") || "Delete this plan?")) return;

    try {
      const { error } = await supabase.from("treatment_plans").delete().eq("id", id);
      if (error) throw error;

      toast.success(t("doctor.treatmentPlanning.deleteSuccess") || "Deleted");
      if (doctorProfileId) fetchTreatmentPlans(doctorProfileId);
    } catch (e: any) {
      toast.error((t("doctor.treatmentPlanning.deleteFailed") || "Delete failed") + ": " + (e?.message || "Unknown error"));
    }
  };

  const handleConfirmPlan = async (plan: TreatmentPlan) => {
    try {
      const { error } = await supabase
        .from("treatment_plans")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", plan.id);

      if (error) throw error;

      toast.success(t("doctor.treatmentPlanning.publishSuccess") || "Published");
      if (doctorProfileId) fetchTreatmentPlans(doctorProfileId);
    } catch (e: any) {
      toast.error((t("doctor.treatmentPlanning.publishFailed") || "Publish failed") + ": " + (e?.message || "Unknown error"));
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Delete this template?")) return;

    try {
      const { error } = await supabase.from("treatment_plan_templates").delete().eq("id", templateId);
      if (error) throw error;

      toast.success("Template deleted");
      if (doctorProfileId) fetchTemplates(doctorProfileId);
    } catch (e: any) {
      toast.error("Failed to delete template: " + ((e as any)?.message || "Unknown error"));
    }
  };

  const handleApplyTemplate = (template: TreatmentPlanTemplate) => {
    setApplyingTemplateData(template.template_data);
    setShowCreateModal(true);
    toast.success(`Applying template: ${template.name}`);
  };

  const handleMedicationManagement = (plan: TreatmentPlan) => {
    setSelectedPlanForMeds(plan.id);
    setShowMedicationModal(true);
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
        (template.description && template.description.toLowerCase().includes(templateSearchTerm.toLowerCase()));
      const matchesCategory = templateCategoryFilter === "all" || template.category === templateCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [templates, templateSearchTerm, templateCategoryFilter]);

  // ---------- UI ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p>{t("doctor.treatmentPlanning.loading") || "Loading..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("doctor.treatmentPlanning.title") || "Treatment Planning"}</h2>
          <p className="text-muted-foreground">{t("doctor.treatmentPlanning.description") || ""}</p>
        </div>

        <Button
          onClick={() => {
            setApplyingTemplateData(null);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("doctor.treatmentPlanning.createPlan") || "Create plan"}
        </Button>
      </div>

      {/* ✅ DEBUG PANEL (leave it until it works; you can remove later) */}
      <pre className="text-xs p-3 bg-muted rounded-lg overflow-auto">
doctorProfileId: {String(doctorProfileId)}
{"\n"}user.id: {String(user?.id)}
{"\n"}plans (raw): {String(treatmentPlans.length)}
{"\n"}plans (filtered): {String(filteredPlans.length)}
{"\n"}patients loaded: {String(patients.length)}
{"\n"}templates loaded: {String(templates.length)}
      </pre>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Treatment Plans
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* -------------------- PLANS (CARDS like templates) -------------------- */}
        <TabsContent value="plans" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                {t("doctor.treatmentPlanning.filtersTitle") || "Filters"}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder={t("doctor.treatmentPlanning.searchPlaceholder") || "Search plans..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("doctor.treatmentPlanning.filterByStatus") || "Status"} />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={patientFilter} onValueChange={setPatientFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("doctor.treatmentPlanning.filterByPatient") || "Patient"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("doctor.treatmentPlanning.allPatients") || "All patients"}</SelectItem>

                    {patients
                      .filter((p) => p.source === "doctor_added")
                      .map((p) => (
                        <SelectItem key={p.key} value={p.key}>
                          {p.name} (doctor-added)
                        </SelectItem>
                      ))}

                    {patients
                      .filter((p) => p.source === "registered")
                      .map((p) => (
                        <SelectItem key={p.key} value={p.key}>
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setPatientFilter("all");
                  }}
                >
                  {t("doctor.treatmentPlanning.clearFilters") || "Clear"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t("doctor.treatmentPlanning.activePlans") || "Treatment Plans"}</span>
                <span className="text-sm text-muted-foreground">{filteredPlans.length} plans</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {filteredPlans.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  No treatment plans found.
                  <div className="mt-4">
                    <Button
                      onClick={() => {
                        setApplyingTemplateData(null);
                        setShowCreateModal(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create first plan
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPlans.map((plan) => {
                    const patientKey = getPlanPatientKey(plan);
                    const patientName = getPatientName(plan);
                    const statusLabel =
                      statusOptions.find((s) => s.value === String(plan.status))?.label || String(plan.status);

                    return (
                      <Card key={plan.id}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{plan.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(plan.created_at).toLocaleDateString()}
                              </p>
                            </div>

                            <Badge className={getStatusBadgeColor(String(plan.status))}>{statusLabel}</Badge>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="truncate">{patientName}</span>
                          </div>

                          {(plan.notes ?? plan.description) ? (
                            <p className="text-sm text-muted-foreground line-clamp-2">{plan.notes ?? plan.description}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No notes</p>
                          )}

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total</span>
                            <span className="font-medium">
                              {plan.total_cost != null ? formatCurrency(Number(plan.total_cost)) : "—"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedPlan(plan)}>
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => handleMedicationManagement(plan)}>
                                      <FileText className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Medications</TooltipContent>
                                </Tooltip>

                                {patientKey && (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" onClick={() => handleMessagePatient(patientKey)}>
                                          <MessageSquare className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Message</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleScheduleAppointment(patientKey)}
                                        >
                                          <CalendarPlus className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Schedule</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" onClick={() => handleVideoCall(patientKey)}>
                                          <Video className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Video</TooltipContent>
                                    </Tooltip>
                                  </>
                                )}
                              </TooltipProvider>
                            </div>

                            <div className="flex items-center gap-2">
                              {String(plan.status) === "draft" && (
                                <Button variant="outline" size="sm" onClick={() => handleConfirmPlan(plan)}>
                                  Publish
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePlan(plan.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------- TEMPLATES (cards) -------------------- */}
        <TabsContent value="templates" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Templates</span>
                {templatesLoading && <span className="text-sm text-muted-foreground">Loading…</span>}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Search templates..."
                  value={templateSearchTerm}
                  onChange={(e) => setTemplateSearchTerm(e.target.value)}
                />

                <Select value={templateCategoryFilter} onValueChange={setTemplateCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {templateCategories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => {
                    setTemplateSearchTerm("");
                    setTemplateCategoryFilter("all");
                  }}
                >
                  Clear
                </Button>
              </div>

              {filteredTemplates.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No templates found.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => (
                    <Card key={template.id}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="font-medium">{template.name}</p>
                            {template.description ? (
                              <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                            ) : null}
                            {template.is_public ? (
                              <Badge className="mt-2 bg-green-100 text-green-800">Public</Badge>
                            ) : (
                              <Badge className="mt-2 bg-gray-100 text-gray-800">Private</Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleApplyTemplate(template)}>
                              <Copy className="w-3 h-3 mr-1" />
                              Use
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create plan modal */}
      <EnhancedCreateTreatmentPlanModal
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) setApplyingTemplateData(null);
        }}
        onSuccess={() => {
          // immediate refresh (and realtime will also update)
          if (doctorProfileId) {
            fetchTreatmentPlans(doctorProfileId);
            fetchTemplates(doctorProfileId);
          }
        }}
        initialTemplateData={applyingTemplateData}
      />

      {/* Plan detail modal */}
      {selectedPlan && (
        <EnhancedTreatmentPlanDetailModal
          open={!!selectedPlan}
          onOpenChange={(open) => !open && setSelectedPlan(null)}
          treatmentPlan={selectedPlan as any}
          onUpdate={() => {
            if (doctorProfileId) fetchTreatmentPlans(doctorProfileId);
          }}
        />
      )}

      {/* Medications modal */}
      {selectedPlanForMeds && (
        <MedicationManagementModal
          open={showMedicationModal}
          onOpenChange={(open) => {
            if (!open) {
              setShowMedicationModal(false);
              setSelectedPlanForMeds(null);
            }
          }}
          treatmentPlanId={selectedPlanForMeds}
          patientId={
            (() => {
              const plan = filteredPlans.find((p) => p.id === selectedPlanForMeds);
              return (plan?.patient_id || plan?.doctor_patient_id || "") as string;
            })()
          }
        />
      )}
    </div>
  );
};

export default TreatmentPlanningSection;
