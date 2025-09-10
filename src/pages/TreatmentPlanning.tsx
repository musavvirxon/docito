import { useState, useEffect } from "react";
import { Plus, Search, Filter, ChevronLeft, Users, Calendar, DollarSign, FileText, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import CreateTreatmentPlanModal from "@/components/treatment/CreateTreatmentPlanModal";
import TreatmentPlanDetailModal from "@/components/treatment/TreatmentPlanDetailModal";

interface TreatmentPlan {
  id: string;
  dentist_id: string;
  patient_id: string;
  title: string;
  description?: string;
  status: string;
  total_cost: number;
  created_at: string;
  published_at?: string;
  completed_at?: string;
}

interface Patient {
  id: string;
  name: string;
  email: string;
}

const TreatmentPlanning = () => {
  const navigate = useNavigate();
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<TreatmentPlan[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [patientFilter, setPatientFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlan | null>(null);

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" }
  ];

  useEffect(() => {
    fetchTreatmentPlans();
    fetchPatients();
  }, []);

  useEffect(() => {
    filterPlans();
  }, [treatmentPlans, searchTerm, statusFilter, patientFilter]);

  const fetchTreatmentPlans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to access treatment plans");
        navigate("/");
        return;
      }

      const { data, error } = await supabase
        .from("treatment_plans")
        .select("*")
        .eq("dentist_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTreatmentPlans(data || []);
    } catch (error: any) {
      toast.error("Failed to load treatment plans: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get unique patient IDs from treatment plans
      const { data: planData } = await supabase
        .from("treatment_plans")
        .select("patient_id")
        .eq("dentist_id", user.id);

      if (planData && planData.length > 0) {
        const patientIds = [...new Set(planData.map(p => p.patient_id))];
        
        // For now, we'll create mock patient data since we don't have a patients table
        const mockPatients = patientIds.map((id, index) => ({
          id,
          name: `Patient ${index + 1}`,
          email: `patient${index + 1}@example.com`
        }));
        
        setPatients(mockPatients);
      }
    } catch (error: any) {
      console.error("Error fetching patients:", error);
    }
  };

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
    if (!confirm("Are you sure you want to delete this treatment plan?")) return;

    try {
      const { error } = await supabase
        .from("treatment_plans")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Treatment plan deleted successfully");
      fetchTreatmentPlans();
    } catch (error: any) {
      toast.error("Failed to delete treatment plan: " + error.message);
    }
  };

  const handlePublishPlan = async (plan: TreatmentPlan) => {
    try {
      const { error } = await supabase
        .from("treatment_plans")
        .update({ 
          status: "published",
          published_at: new Date().toISOString()
        })
        .eq("id", plan.id);

      if (error) throw error;
      
      toast.success("Treatment plan published successfully");
      fetchTreatmentPlans();
    } catch (error: any) {
      toast.error("Failed to publish treatment plan: " + error.message);
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
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return colors[status] || colors.draft;
  };

  const getPatientName = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? patient.name : "Unknown Patient";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading treatment plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/doctor-dashboard")}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Treatment Planning</h1>
            <p className="text-muted-foreground">Create and manage patient treatment plans</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Treatment Plan
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search treatment plans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
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
                <SelectValue placeholder="Filter by patient" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patients</SelectItem>
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
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Treatment Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Treatment Plans ({filteredPlans.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPlans.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No treatment plans found. Create your first treatment plan to get started.</p>
              <Button onClick={() => setShowCreateModal(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Create First Treatment Plan
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Title</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
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
                      {plan.total_cost ? formatCurrency(plan.total_cost) : "Not calculated"}
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
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {plan.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePublishPlan(plan)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <FileText className="w-4 h-4" />
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateTreatmentPlanModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchTreatmentPlans();
        }}
      />

      {selectedPlan && (
        <TreatmentPlanDetailModal
          open={!!selectedPlan}
          onOpenChange={(open) => !open && setSelectedPlan(null)}
          treatmentPlan={selectedPlan}
          onUpdate={() => {
            fetchTreatmentPlans();
          }}
        />
      )}
    </div>
  );
};

export default TreatmentPlanning;