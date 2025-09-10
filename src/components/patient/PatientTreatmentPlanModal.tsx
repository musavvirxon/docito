import { useState, useEffect } from "react";
import { FileText, DollarSign, Calendar, CheckCircle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

interface TreatmentPlanProcedure {
  id: string;
  treatment_plan_id: string;
  procedure_id: string;
  tooth_numbers?: number[];
  custom_cost?: number;
  custom_notes?: string;
  status: string;
  sequence_order: number;
  completed_at?: string;
  procedure: {
    name: string;
    category: string;
    type: string;
    default_cost?: number;
    notes?: string;
  };
}

interface PatientTreatmentPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treatmentPlan: TreatmentPlan;
}

const PatientTreatmentPlanModal = ({ 
  open, 
  onOpenChange, 
  treatmentPlan
}: PatientTreatmentPlanModalProps) => {
  const [procedures, setProcedures] = useState<TreatmentPlanProcedure[]>([]);
  const [loading, setLoading] = useState(false);

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
          procedure:procedures(name, category, type, default_cost, notes)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-orange-600" />;
      default:
        return <Calendar className="w-4 h-4 text-blue-600" />;
    }
  };

  const completedProcedures = procedures.filter(p => p.status === "completed").length;
  const totalProcedures = procedures.length;
  const progressPercentage = totalProcedures > 0 ? (completedProcedures / totalProcedures) * 100 : 0;

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
          {/* Plan Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Treatment Plan Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Doctor</p>
                  <p className="font-medium">Dr. {treatmentPlan.dentist_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{new Date(treatmentPlan.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="font-bold text-xl text-primary">{formatCurrency(treatmentPlan.total_cost)}</p>
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

          {/* Progress Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Treatment Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {completedProcedures} of {totalProcedures} procedures completed
                </span>
                <span className="font-medium">{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Procedures List */}
          <Card>
            <CardHeader>
              <CardTitle>Procedures ({procedures.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading procedures...</div>
              ) : procedures.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No procedures in this treatment plan</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Procedure</TableHead>
                      <TableHead>Teeth Affected</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {procedures.map((proc) => (
                      <TableRow key={proc.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(proc.status)}
                            <div>
                              <p className="font-medium">{proc.procedure.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {proc.procedure.category}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {proc.tooth_numbers && proc.tooth_numbers.length > 0 ? (
                            <div className="text-sm">
                              Teeth: {proc.tooth_numbers.join(", ")}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">General treatment</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(proc.custom_cost || proc.procedure.default_cost || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(proc.status)}>
                            {proc.status.replace('_', ' ')}
                          </Badge>
                          {proc.completed_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Completed: {new Date(proc.completed_at).toLocaleDateString()}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {proc.custom_notes && (
                              <p className="text-sm text-muted-foreground">{proc.custom_notes}</p>
                            )}
                            {proc.procedure.notes && (
                              <p className="text-xs text-muted-foreground italic">
                                {proc.procedure.notes}
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PatientTreatmentPlanModal;