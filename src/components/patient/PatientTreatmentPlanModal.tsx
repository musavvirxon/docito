import { useState, useEffect } from "react";
import { FileText, DollarSign, Calendar, CheckCircle, Clock, Pill } from "lucide-react";
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
  doctor_id: string;
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
  cost?: number;
  notes?: string;
  status: string;
  created_at: string;
  procedure: {
    name: string;
    category: string;
    type: string;
    default_cost?: number;
    notes?: string;
  };
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
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
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, treatmentPlan.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [procResult, medResult] = await Promise.all([
        supabase
          .from("treatment_plan_procedures")
          .select(`
            *,
            procedure:procedures(name, category, type, default_cost, notes)
          `)
          .eq("treatment_plan_id", treatmentPlan.id)
          .order("sequence_order"),
        (supabase as any)
          .from("medications")
          .select("*")
          .eq("treatment_plan_id", treatmentPlan.id)
          .order("created_at", { ascending: true }),
      ]);

      if (procResult.error) throw procResult.error;
      setProcedures(procResult.data || []);
      setMedications(medResult.data || []);
    } catch (error: any) {
      toast.error("Failed to load treatment plan details: " + error.message);
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
      cancelled: "bg-red-100 text-red-800",
      active: "bg-green-100 text-green-800",
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
                  <p className="font-medium">Dr. {treatmentPlan.doctor_id}</p>
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
                          {formatCurrency(proc.cost || proc.procedure.default_cost || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(proc.status)}>
                            {proc.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {proc.notes && (
                              <p className="text-sm text-muted-foreground">{proc.notes}</p>
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

          {/* Medications List */}
          {medications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="w-5 h-5" />
                  Prescribed Medications ({medications.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medication</TableHead>
                      <TableHead>Dosage</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Instructions</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medications.map((med) => (
                      <TableRow key={med.id}>
                        <TableCell className="font-medium">{med.name}</TableCell>
                        <TableCell>{med.dosage || "—"}</TableCell>
                        <TableCell>{med.frequency || "—"}</TableCell>
                        <TableCell>
                          {med.start_date || med.end_date ? (
                            <div className="text-sm">
                              {med.start_date && <span>{new Date(med.start_date).toLocaleDateString()}</span>}
                              {med.start_date && med.end_date && <span> — </span>}
                              {med.end_date && <span>{new Date(med.end_date).toLocaleDateString()}</span>}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground max-w-xs">
                            {med.instructions || "—"}
                          </p>
                        </TableCell>
                        <TableCell>
                          {med.status && (
                            <Badge className={getStatusBadgeColor(med.status)}>
                              {med.status.replace('_', ' ')}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PatientTreatmentPlanModal;
