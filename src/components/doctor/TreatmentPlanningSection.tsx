import { useState, useEffect } from "react";
import { Plus, Search, Filter, Users, Calendar, DollarSign, FileText, Edit, Trash2, Eye, Pill, Copy, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  description: string;
  category: string;
  is_public: boolean;
  template_data: any;
  created_at: string;
  doctor_id: string;
}

interface TreatmentPlan {
  id: string;
  doctor_id: string;
  patient_id: string;
  title: string;
  description?: string;
  status: string;
  total_cost: number;
  created_at: string;
  published_at?: string;
  completed_at?: string;
  estimated_duration_weeks?: number;
  estimated_completion_date?: string;
  priority?: string;
  updated_at?: string;
}

interface Patient {
  id: string;
  name: string;
  email: string;
}

const TreatmentPlanningSection = () => {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<TreatmentPlan[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [patientFilter, setPatientFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlan | null>(null);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [selectedPlanForMeds, setSelectedPlanForMeds] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("plans");
  
  // Templates state
  const [templates, setTemplates] = useState<TreatmentPlanTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSearchTerm, setTemplateSearchTerm] = useState("");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState("all");
  const [applyingTemplateData, setApplyingTemplateData] = useState<any>(null);

  const templateCategories = [
    "general", "preventive", "restorative", "cosmetic", 
    "orthodontic", "oral_surgery", "endodontic", "periodontic"
  ];

  const statusOptions = [
    { value: "all", label: t("doctor.treatmentPlanning.allStatuses") },
    { value: "draft", label: t("doctor.treatmentPlanning.draft") },
    { value: "published", label: t("doctor.treatmentPlanning.published") },
    { value: "in_progress", label: t("doctor.treatmentPlanning.inProgress") },
    { value: "completed", label: t("doctor.treatmentPlanning.completed") }
  ];

  useEffect(() => {
    fetchTreatmentPlans();
    fetchPatients();
    fetchTemplates();
  }, [user]);

  useEffect(() => {
    filterPlans();
  }, [treatmentPlans, searchTerm, statusFilter, patientFilter]);

  const fetchTreatmentPlans = async () => {
    try {
      if (!user) {
        // Load sample data for demo
        const samplePlans = [
          {
            id: 'sample-1',
            doctor_id: 'demo-dentist',
            patient_id: 'demo-patient-1',
            title: 'Comprehensive Oral Rehabilitation',
            description: 'Complete treatment plan including cleanings, fillings, and crown placement',
            status: 'published',
            total_cost: 2800,
            created_at: new Date().toISOString(),
            published_at: new Date().toISOString(),
            completed_at: null,
            estimated_duration_weeks: 12,
            estimated_completion_date: new Date(Date.now() + 84 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            priority: 'high',
            updated_at: new Date().toISOString(),
          },
          {
            id: 'sample-2',
            doctor_id: 'demo-dentist',
            patient_id: 'demo-patient-2',
            title: 'Preventive Care Package',
            description: 'Regular cleanings and preventive treatments',
            status: 'in_progress',
            total_cost: 450,
            created_at: new Date().toISOString(),
            published_at: new Date().toISOString(),
            completed_at: null,
            estimated_duration_weeks: 4,
            estimated_completion_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            priority: 'normal',
            updated_at: new Date().toISOString(),
          }
        ];
        setTreatmentPlans(samplePlans);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("treatment_plans")
        .select("*")
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTreatmentPlans(data || []);
    } catch (error: any) {
      toast.error(t("doctor.treatmentPlanning.loadFailed") + ": " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const mockPatients = [
        { id: 'demo-patient-1', name: 'John Smith', email: 'john@example.com' },
        { id: 'demo-patient-2', name: 'Sarah Johnson', email: 'sarah@example.com' },
        { id: 'demo-patient-3', name: 'Mike Wilson', email: 'mike@example.com' }
      ];
      
      if (!user) {
        setPatients(mockPatients);
        return;
      }

      // Get unique patient IDs from treatment plans
      const { data: planData } = await supabase
        .from("treatment_plans")
        .select("patient_id")
        .eq("doctor_id", user.id);

      if (planData && planData.length > 0) {
        const patientIds = [...new Set(planData.map(p => p.patient_id))];
        
        const userPatients = patientIds.map((id, index) => ({
          id,
          name: `Patient ${index + 1}`,
          email: `patient${index + 1}@example.com`
        }));
        
        setPatients([...mockPatients, ...userPatients]);
      } else {
        setPatients(mockPatients);
      }
    } catch (error: any) {
      console.error("Error fetching patients:", error);
    }
  };

  const fetchTemplates = async () => {
    if (!user) {
      // Sample templates for demo
      setTemplates([
        {
          id: 'sample-template-1',
          name: 'Root Canal Treatment Plan',
          description: 'Standard root canal treatment with follow-up care',
          category: 'endodontic',
          is_public: false,
          template_data: { procedures: [], medications: [] },
          created_at: new Date().toISOString(),
          doctor_id: 'demo'
        },
        {
          id: 'sample-template-2',
          name: 'Teeth Whitening Package',
          description: 'Professional whitening treatment with maintenance',
          category: 'cosmetic',
          is_public: true,
          template_data: { procedures: [], medications: [] },
          created_at: new Date().toISOString(),
          doctor_id: 'demo'
        }
      ]);
      return;
    }

    setTemplatesLoading(true);
    try {
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!doctorData) return;

      const { data, error } = await supabase
        .from("treatment_plan_templates")
        .select("*")
        .or(`doctor_id.eq.${doctorData.id},is_public.eq.true`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const { error } = await supabase
        .from("treatment_plan_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
      toast.success("Template deleted successfully");
      fetchTemplates();
    } catch (error: any) {
      toast.error("Failed to delete template: " + error.message);
    }
  };

  const handleApplyTemplate = (template: TreatmentPlanTemplate) => {
    setApplyingTemplateData(template.template_data);
    setShowCreateModal(true);
    toast.success(`Applying template: ${template.name}`);
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
                         (template.description && template.description.toLowerCase().includes(templateSearchTerm.toLowerCase()));
    const matchesCategory = templateCategoryFilter === "all" || template.category === templateCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filterPlans = () => {
    let filtered = treatmentPlans;

    if (searchTerm) {
      filtered = filtered.filter(plan => 
        plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (plan.description && plan.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(plan => plan.status === statusFilter);
    }

    if (patientFilter !== "all") {
      filtered = filtered.filter(plan => plan.patient_id === patientFilter);
    }

    setFilteredPlans(filtered);
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm(t("doctor.treatmentPlanning.deleteConfirm"))) return;

    try {
      const { error } = await supabase
        .from("treatment_plans")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success(t("doctor.treatmentPlanning.deleteSuccess"));
      fetchTreatmentPlans();
    } catch (error: any) {
      toast.error(t("doctor.treatmentPlanning.deleteFailed") + ": " + error.message);
    }
  };

  const handleConfirmPlan = async (plan: TreatmentPlan) => {
    try {
      const { error } = await supabase
        .from("treatment_plans")
        .update({ 
          status: "published",
          published_at: new Date().toISOString()
        })
        .eq("id", plan.id);

      if (error) throw error;
      
      toast.success(t("doctor.treatmentPlanning.publishSuccess"));
      fetchTreatmentPlans();
    } catch (error: any) {
      toast.error(t("doctor.treatmentPlanning.publishFailed") + ": " + error.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      published: "bg-blue-100 text-blue-800",
      in_progress: "bg-orange-100 text-orange-800",
      completed: "bg-green-100 text-green-800"
    };
    return colors[status] || colors.draft;
  };

  const getPatientName = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? patient.name : t("doctor.treatmentPlanning.unknownPatient");
  };

  const handleMedicationManagement = (planId: string, patientId: string) => {
    setSelectedPlanForMeds(planId);
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

      {/* Tabs for Plans and Templates */}
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

        {/* Treatment Plans Tab */}
        <TabsContent value="plans" className="space-y-6 mt-6">
          {/* Filters */}
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
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
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

          {/* Treatment Plans Table */}
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
                    {filteredPlans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{plan.title}</p>
                            {plan.description && (
                              <p className="text-sm text-muted-foreground truncate max-w-xs">
                                {plan.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            {getPatientName(plan.patient_id)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(plan.status)}>
                            {statusOptions.find(s => s.value === plan.status)?.label || plan.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {plan.total_cost ? formatCurrency(plan.total_cost) : t("doctor.treatmentPlanning.notCalculated")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {new Date(plan.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedPlan(plan)}
                              title={t("doctor.treatmentPlanning.viewDetails")}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMedicationManagement(plan.id, plan.patient_id)}
                              title={t("doctor.treatmentPlanning.manageMedications")}
                            >
                              <Pill className="w-4 h-4" />
                            </Button>
                            {plan.status === "draft" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleConfirmPlan(plan)}
                                className="text-blue-600 hover:text-blue-700"
                                title={t("doctor.treatmentPlanning.publishPlan")}
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePlan(plan.id)}
                              className="text-destructive hover:text-destructive"
                              title={t("doctor.treatmentPlanning.deletePlan")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Saved Templates Tab */}
        <TabsContent value="templates" className="space-y-6 mt-6">
          {/* Template Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filter Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search templates..."
                    value={templateSearchTerm}
                    onChange={(e) => setTemplateSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={templateCategoryFilter} onValueChange={setTemplateCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {templateCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
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
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Templates Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5" />
                Saved Templates ({filteredTemplates.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Loading templates...</p>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <LayoutTemplate className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {templateSearchTerm || templateCategoryFilter !== "all" 
                      ? "No templates match your search criteria" 
                      : "No saved templates yet"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Create a treatment plan and save it as a template for quick reuse
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">
                                {template.category.charAt(0).toUpperCase() + template.category.slice(1).replace('_', ' ')}
                              </Badge>
                              {template.is_public && (
                                <Badge variant="secondary">Public</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {template.description || "No description available"}
                        </p>
                        
                        {/* Template Stats */}
                        <div className="text-xs text-muted-foreground mb-4 space-y-1">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3" />
                            Procedures: {template.template_data?.procedures?.length || 0}
                          </div>
                          <div className="flex items-center gap-2">
                            <Pill className="w-3 h-3" />
                            Medications: {template.template_data?.medications?.length || 0}
                          </div>
                          {template.template_data?.estimated_duration_weeks && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              Duration: {template.template_data.estimated_duration_weeks} weeks
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            Created: {new Date(template.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleApplyTemplate(template)}
                            className="flex-1"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Use Template
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <EnhancedCreateTreatmentPlanModal
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) setApplyingTemplateData(null);
        }}
        onSuccess={() => {
          setShowCreateModal(false);
          setApplyingTemplateData(null);
          fetchTreatmentPlans();
          fetchTemplates();
        }}
        initialTemplateData={applyingTemplateData}
      />

      {selectedPlan && (
        <EnhancedTreatmentPlanDetailModal
          open={!!selectedPlan}
          onOpenChange={(open) => !open && setSelectedPlan(null)}
          treatmentPlan={selectedPlan}
          onUpdate={() => {
            fetchTreatmentPlans();
          }}
        />
      )}

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
          patientId={filteredPlans.find(p => p.id === selectedPlanForMeds)?.patient_id || ''}
        />
      )}
    </div>
  );
};

export default TreatmentPlanningSection;