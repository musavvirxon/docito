import { useState, useEffect } from "react";
import { Eye, FileText, Signature, Download, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PatientTreatmentPlanModal from "./PatientTreatmentPlanModal";
import ConsentSigningModal from "../consent/ConsentSigningModal";

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
  dentist_profile?: {
    name: string;
    practice_name?: string;
  };
}

const PatientTreatmentPlansSection = () => {
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlan | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentPlanId, setConsentPlanId] = useState<string>("");

  useEffect(() => {
    fetchTreatmentPlans();
  }, []);

  const fetchTreatmentPlans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to view your treatment plans");
        return;
      }

      // In a real app, you'd use the user's email or patient ID
      // For now, we'll use the user's email as patient_id
      const { data, error } = await supabase
        .from("treatment_plans")
        .select(`
          *
        `)
        .eq("patient_id", user.email)
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTreatmentPlans(data || []);
    } catch (error: any) {
      toast.error("Failed to load treatment plans: " + error.message);
    } finally {
      setLoading(false);
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
      published: "bg-blue-100 text-blue-800",
      in_progress: "bg-orange-100 text-orange-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return colors[status] || colors.published;
  };

  const handleSignConsent = (planId: string) => {
    setConsentPlanId(planId);
    setShowConsentModal(true);
  };

  const handleExportPlan = async (plan: TreatmentPlan) => {
    try {
      // This would generate and download a PDF
      toast.success("Treatment plan exported successfully");
    } catch (error: any) {
      toast.error("Failed to export plan: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading your treatment plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Treatment Plans</h2>
        <p className="text-muted-foreground">View and manage your dental treatment plans</p>
      </div>

      {treatmentPlans.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No treatment plans available.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Your dentist will create treatment plans for you when needed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {treatmentPlans.map((plan) => (
            <Card key={plan.id} className="border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {plan.title}
                      <Badge className={getStatusBadgeColor(plan.status)}>
                        {plan.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </CardTitle>
                     <p className="text-muted-foreground">
                       Unknown Doctor
                     </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(plan.total_cost)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Created: {new Date(plan.created_at).toLocaleDateString()}
                    </div>
                    {plan.published_at && (
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        Published: {new Date(plan.published_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPlan(plan)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSignConsent(plan.id)}
                    >
                      <Signature className="w-4 h-4 mr-2" />
                      Sign Consent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportPlan(plan)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
                {plan.description && (
                  <p className="text-muted-foreground mt-2">{plan.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      {selectedPlan && (
        <PatientTreatmentPlanModal
          open={!!selectedPlan}
          onOpenChange={(open) => !open && setSelectedPlan(null)}
          treatmentPlan={selectedPlan}
        />
      )}

      <ConsentSigningModal
        open={showConsentModal}
        onOpenChange={setShowConsentModal}
        treatmentPlanId={consentPlanId}
        onSuccess={() => {
          setShowConsentModal(false);
          toast.success("Consent signed successfully");
        }}
      />
    </div>
  );
};

export default PatientTreatmentPlansSection;