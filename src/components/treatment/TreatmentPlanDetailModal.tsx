import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, CheckCircle, Clock, DollarSign, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AddProcedureToPlanModal from "./AddProcedureToPlanModal";
import FileAttachmentSection from "@/components/files/FileAttachmentSection";

interface TreatmentPlan {
  id: string;
  doctor_id: string;
  patient_id: string;
  title: string;
  description?: string;
  status: string;
  total_cost: number;
  created_at: string;
}

interface TreatmentPlanProcedure {
  id: string;
  treatment_plan_id: string;
  procedure_id: string;
  tooth_numbers?: number[];
  cost?: number;
  notes?: string;
  status: string;
  created_at: string;
  procedure: {
    name: string;
    code?: string | null;
    category: string;
    type: string;
    default_cost?: number;
    notes?: string;
  };
}

interface TreatmentPlanDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treatmentPlan: TreatmentPlan;
  onUpdate: () => void;
}

const TreatmentPlanDetailModal = ({ 
  open, 
  onOpenChange, 
  treatmentPlan, 
  onUpdate 
}: TreatmentPlanDetailModalProps) => {
  const [procedures, setProcedures] = useState<TreatmentPlanProcedure[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddProcedureModal, setShowAddProcedureModal] = useState(false);

  useEffect(() => {
    if (open) {
      fetchProcedures();
    }
  }, [open, treatmentPlan.id]);

  const fetchProcedures = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("treatment_plan_procedures")
        .select(`
          *,
          procedure:procedures(name, code, category, type, default_cost)
        `)
        .eq("treatment_plan_id", treatmentPlan.id)
        .order("sequence_order");

      if (error) throw error;
      setProcedures(data || []);
    } catch (error: any) {
      toast.error("Failed to load procedures: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveProcedure = async (procedureId: string) => {
    if (!confirm("Are you sure you want to remove this procedure from the treatment plan?")) return;

    try {
      const { error } = await supabase
        .from("treatment_plan_procedures")
        .delete()
        .eq("id", procedureId);

      if (error) throw error;
      
      toast.success("Procedure removed successfully");
      fetchProcedures();
      updateTotalCost();
    } catch (error: any) {
      toast.error("Failed to remove procedure: " + error.message);
    }
  };

  const handleToggleProcedureStatus = async (procedure: TreatmentPlanProcedure) => {
    const newStatus = procedure.status === "completed" ? "planned" : "completed";
    
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }

      const { error } = await supabase
        .from("treatment_plan_procedures")
        .update(updateData)
        .eq("id", procedure.id);

      if (error) throw error;
      
      toast.success(`Procedure marked as ${newStatus}`);
      fetchProcedures();
    } catch (error: any) {
      toast.error("Failed to update procedure status: " + error.message);
    }
  };

  const updateTotalCost = async () => {
    try {
      const total = procedures.reduce((sum, proc) => {
        const cost = proc.cost || proc.procedure.default_cost || 0;
        return sum + cost;
      }, 0);

      const { error } = await supabase
        .from("treatment_plans")
        .update({ total_cost: total })
        .eq("id", treatmentPlan.id);

      if (error) throw error;
      onUpdate();
    } catch (error: any) {
      console.error("Failed to update total cost:", error);
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
      planned: "bg-blue-100 text-blue-800",
      in_progress: "bg-orange-100 text-orange-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return colors[status] || colors.planned;
  };

  const totalCost = procedures.reduce((sum, proc) => {
    const cost = proc.cost || proc.procedure.default_cost || 0;
    return sum + cost;
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{treatmentPlan.title}</span>
            <Badge className="ml-2">
              {treatmentPlan.status.charAt(0).toUpperCase() + treatmentPlan.status.slice(1)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Plan Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Plan Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Patient</p>
                  <p className="font-medium">{treatmentPlan.patient_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{new Date(treatmentPlan.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              {treatmentPlan.description && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="mt-1">{treatmentPlan.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cost Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Cost Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                Total: {formatCurrency(totalCost)}
              </div>
              <p className="text-sm text-muted-foreground">
                {procedures.length} procedure{procedures.length !== 1 ? 's' : ''} included
              </p>
            </CardContent>
          </Card>

          {/* Procedures */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Procedures</CardTitle>
                <Button 
                  onClick={() => setShowAddProcedureModal(true)} 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Procedure
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading procedures...</div>
              ) : procedures.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No procedures added yet</p>
                  <Button onClick={() => setShowAddProcedureModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Procedure
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Procedure</TableHead>
                      <TableHead>Teeth</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {procedures.map((proc) => (
                      <TableRow key={proc.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{proc.procedure.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {proc.procedure.category}
                            </p>
                            {proc.notes && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {proc.notes}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {proc.tooth_numbers && proc.tooth_numbers.length > 0 ? (
                            <div className="text-sm">
                              {proc.tooth_numbers.join(", ")}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">All teeth</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(proc.cost || proc.procedure.default_cost || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(proc.status)}>
                            {proc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleProcedureStatus(proc)}
                              className={proc.status === "completed" ? "text-orange-600" : "text-green-600"}
                            >
                              {proc.status === "completed" ? <Clock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveProcedure(proc.id)}
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

          {/* File Attachments */}
          <FileAttachmentSection 
            treatmentPlanId={treatmentPlan.id}
            title="Treatment Plan Files"
          />
        </div>

        {/* Add Procedure Modal */}
        <AddProcedureToPlanModal
          open={showAddProcedureModal}
          onOpenChange={setShowAddProcedureModal}
          treatmentPlanId={treatmentPlan.id}
          onSuccess={() => {
            setShowAddProcedureModal(false);
            fetchProcedures();
            updateTotalCost();
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default TreatmentPlanDetailModal;