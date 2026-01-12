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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import EnhancedCreateTreatmentPlanModal from "@/components/treatment/EnhancedCreateTreatmentPlanModal";
import EnhancedTreatmentPlanDetailModal from "@/components/treatment/EnhancedTreatmentPlanDetailModal";
import MedicationManagementModal from "@/components/treatment/MedicationManagementModal";
import { useTranslation } from "react-i18next";

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

type TreatmentPlanStatus = "draft" | "published" | "in_progress" | "completed" | "cancelled" | "pending_confirmation" | "confirmed";

interface TreatmentPlan {
  id: string;
  doctor_id: string;
  patient_id: string | null;          // registered patient (profiles.user_id)
  doctor_patient_id: string | null;   // doctor-added patient (doctor_patients.id)
  title: string;
  notes?: string | null;              // real DB column in your create modal
  description?: string | null;         // keep compat if exists
  status: TreatmentPlanStatus | string;
  total_cost: number | null;
  created_at: string;
  published_at?: string | null;
  completed_at?: string | null;
  priority?: string | null;
  updated_at?: string | null;
}

type PatientSource = "registered" | "doctor_added";

/**
 * We prefix filter values to avoid collisions between:
 * - profiles.user_id (registered)
 * - doctor_patients.id (doctor-added)
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
      { value: "all", label: t("doctor.treatmentPlanning.allStatuses") },
      { value: "draft", label: t("doctor.treatmentPlanning.draft") },
      { value: "published", label: t("doctor.treatmentPlanning.published") },
      { value: "in_progress", label: t("doctor.treatmentPlanning.inProgress") },
      { value: "completed", label: t("doctor.treatmentPlanning.completed") },
      // if your DB uses these, they won’t break UI:
      { value: "pending_confirmation", label: "Pending confirmation" },
      { value: "confirmed", label: "Confirmed" },
      { value: "cancelled", label: "Cancelled" },
    ],
    [t]
  );

  // Action handlers
  const handleMessagePatient = (patientKey: string) => {
    navigate(`/messages?recipient=${patientKey}`);
  };

  const handleScheduleAppointment = (patientKey: string) => {
    navigate(`/doctor-dashboard?section=calendar&patient=${patientKey}`);
  };

  const handleVideoCall = (patientKey: string) => {
    navigate(`/video-call?patient=${patientKey}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };

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
    if (!key) return t("doctor.treatmentPlanning.unknownPatient");
    const p = patients.find((x) => x.key === key);
    return p?.name || t("doctor.treatmentPlanning.unknownPatient");
  };

  const loadDoctorProfileId = useCallback(async () => {
    if (!user?.id) {
      setDoctorProfileId(null);
      return null;
    }

    const { data, error } = await supabase
      .from("doctors")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error(error);
      toast.error("Failed to load doctor profile");
      setDoctorProfileId(null);
      return null;
    }

    const id = data?.id ?? null;
    setDoctorProfileId(id);
    return id;
  }, [user?.id]);

  const fetchTreatmentPlans = useCallback(
    async (doctorIdParam?: string | null) => {
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
        console.error(e);
        toast.error(t("doctor.treatmentPlanning.loadFailed") + ": " + (e?.message || "Unknown error"));
        setTreatmentPlans([]);
      }
    },
    [doctorProfileId, t]
  );

  /**
   * ✅ REAL patients list that includes:
   * - ALL doctor-added patients (doctor_patients) for this doctor (active)
   * - Registered patients the doctor has seen (appointments -> profiles)
   * - Registered patients that appear in plans (treatment_plans.patient_id -> profiles)
   */
  const fetchPatients = useCallback(
    async (doctorIdParam?: string | null, plansParam?: TreatmentPlan[]) => {
      const did = doctorIdParam ?? doctorProfileId;
      if (!did) {
        setPatients([]);
        return;
      }

      try {
        // 1) doctor-added patients (always include them)
        const { data: dp, error: dpErr } = await supabase
          .from("doctor_patients")
          .select("id, full_name, email, phone, status")
          .eq("doctor_id", did)
          .eq("status", "active")
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

        // 2) registered patients from appointments (doctor has seen them)
        const { data: ap, error: apErr } = await supabase
          .from("appointments")
          .select("patient_id")
          .eq("doctor_id", did);

        if (apErr) throw apErr;

        const apIds = (ap || []).map((x: any) => x.patient_id).filter(Boolean) as string[];

        // 3) registered patients that appear in treatment plans too (important for newly created plans)
        const planIds =
          (plansParam || treatmentPlans)
            .map((p) => p.patient_id)
            .filter(Boolean) as string[];

        const registeredIds = Array.from(new Set([...apIds, ...planIds]));

        let registered: PatientOption[] = [];
        if (registeredIds.length) {
          const { data: pr, error: prErr } = await supabase
            .from("profiles")
            .select("user_id, full_name, email, phone")
            .in("user_id", registeredIds);

          // If RLS blocks profiles, don’t crash the UI; just show minimal
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
            // fallback minimal if profiles is not readable
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

        // Merge + sort
        const merged = [...doctorAdded, ...registered].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setPatients(merged);
      } catch (e: any) {
        console.error("Error fetching patients:", e);
        toast.error("Failed to load patients");
        setPatients([]);
      }
    },
    [doctorProfileId, treatmentPlans]
  );

  const fetchTemplates = useCallback(
    async (doctorIdParam?: string | null) => {
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
      } catch (e: any) {
        console.error(e);
        setTemplates([]);
      } finally {
        setTemplatesLoading(false);
      }
    },
    [doctorProfileId]
  );

  // Boot: load doctor profile id, then load everything real
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

  // When plans change, refresh patients so newly created plans resolve names immediately
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

  // Filtering
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
      filtered = filtered.filter((plan) => plan.status === statusFilter);
    }

    if (patientFilter !== "all") {
      filtered = filtered.filter((plan) => {
        const k = getPlanPatientKey(plan);
        return k === patientFilter;
      });
    }

    setFilteredPlans(filtered);
  }, [treatmentPlans, searchTerm, statusFilter, patientFilter]);

  // Plan actions
  const handleDeletePlan = async (id: string) => {
    if (!confirm(t("doctor.treatmentPlanning.deleteConfirm"))) return;

    try {
      const { error } = await supabase.from("treatment_plans").delete().eq("id", id);
      if (error) throw error;

      toast.success(t("doctor.treatmentPlanning.deleteSuccess"));
      if (doctorProfileId) fetchTreatmentPlans(doctorProfileId);
    } catch (e: any) {
      toast.error(t("doctor.treatmentPlanning.deleteFailed") + ": " + (e?.message || "Unknown error"));
    }
  };

  const handleConfirmPlan = async (plan: TreatmentPlan) => {
    try {
      const { error } = await supabase
        .from("treatment_plans")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", plan.id);

      if (error) throw error;

      toast.success(t("doctor.treatmentPlanning.publishSuccess"));
      if (doctorProfileId) fetchTreatmentPlans(doctorProfileId);
    } catch (e: any) {
      toast.error(t("doctor.treatmentPlanning.publishFailed") + ": " + (e?.message || "Unknown error"));
    }
  };

  // Templates actions
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const { error } = await supabase.from("treatment_plan_templates").delete().eq("id", templateId);
      if (error) throw error;

      toast.success("Template deleted successfully");
      if (doctorProfileId) fetchTemplates(doctorProfileId);
    } catch (e: any) {
      toast.error("Failed to delete template: " + (e?.message || "Unknown error"));
    }
  };

  const handleApplyTemplate = (template: TreatmentPlanTemplate) => {
    setApplyingTemplateData(template.template_data);
    setShowCreateModal(true);
    toast.success(`Applying template: ${template.name}`);
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

  const handleMedicationManagement = (plan: TreatmentPlan) => {
    setSelectedPlanForMeds(plan.id);
    setShowMedicationModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{t("doctor.treatmentPlanning.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("doctor.treatmentPlanning.title")}</h2>
          <p className="text-muted-foreground">{t("doctor.treatmentPlanning.description")}</p>
        </div>
        <Button
          onClick={() => {
            if (!user) {
              toast.error(t("doctor.treatmentPlanning.signInRequired"));
              return;
            }
            setApplyingTemplateData(null);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("doctor.treatmentPlanning.createPlan")}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Treatment Plans
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4" />
            Saved Templates
          </TabsTrigger>
        </TabsList>

        {/* Plans */}
        <TabsContent value="plans" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                {t("doctor.treatmentPlanning.filtersTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder={t("doctor.treatmentPlanning.searchPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("doctor.treatmentPlanning.filterByStatus")} />
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
                    <SelectValue placeholder={t("doctor.treatmentPlanning.filterByPatient")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("doctor.treatmentPlanning.allPatients")}</SelectItem>

                    {/* Doctor-added */}
                    {patients
                      .filter((p) => p.source === "doctor_added")
                      .map((p) => (
                        <SelectItem key={p.key} value={p.key}>
                          {p.name} (doctor-added)
                        </SelectItem>
                      ))}

                    {/* Registered */}
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
                  {t("doctor.treatmentPlanning.clearFilters")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("doctor.treatmentPlanning.treatmentPlansCount", { count: filteredPlans.length })}</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPlans.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">{t("doctor.treatmentPlanning.noPlansFound")}</p>
                  <Button onClick={() => setShowCreateModal(true)} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    {t("doctor.treatmentPlanning.createFirstPlan")}
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("doctor.treatmentPlanning.planTitle")}</TableHead>
                      <TableHead>{t("doctor.treatmentPlanning.patient")}</TableHead>
                      <TableHead>{t("doctor.treatmentPlanning.status")}</TableHead>
                      <TableHead>{t("doctor.treatmentPlanning.totalCost")}</TableHead>
                      <TableHead>{t("doctor.treatmentPlanning.created")}</TableHead>
                      <TableHead>{t("doctor.treatmentPlanning.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredPlans.map((plan) => {
                      const patientKey = getPlanPatientKey(plan);

                      return (
                        <TableRow key={plan.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{plan.title}</p>
                              {(plan.notes ?? plan.description) && (
                                <p className="text-sm text-muted-foreground truncate max-w-xs">
                                  {plan.notes ?? plan.description}
                                </p>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              {getPatientName(plan)}
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge className={getStatusBadgeColor(String(plan.status))}>
                              {statusOptions.find((s) => s.value === plan.status)?.label || plan.status}
                            </Badge>
                          </TableCell>

                          <TableCell className="font-medium">
                            {plan.total_cost != null ? formatCurrency(Number(plan.total_cost)) : "—"}
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              {new Date(plan.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>

                          <TableCell>
                            <TooltipProvider>
                              <div className="flex items-center gap-1">
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

                                {/* Quick actions that work for BOTH types */}
                                {patientKey && (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleMessagePatient(patientKey)}
                                        >
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

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeletePlan(plan.id)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete</TooltipContent>
                                </Tooltip>

                                {plan.status === "draft" && (
                                  <Button variant="outline" size="sm" onClick={() => handleConfirmPlan(plan)}>
                                    Publish
                                  </Button>
                                )}
                              </div>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates */}
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

      {/* Create modal */}
      <EnhancedCreateTreatmentPlanModal
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) setApplyingTemplateData(null);
        }}
        onSuccess={() => {
          // immediate refresh (plus realtime)
          if (doctorProfileId) {
            fetchTreatmentPlans(doctorProfileId);
            fetchTemplates(doctorProfileId);
          }
        }}
        initialTemplateData={applyingTemplateData}
      />

      {/* Details modal */}
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
