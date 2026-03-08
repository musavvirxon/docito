// File: src/components/treatment/EnhancedTreatmentPlanDetailModal.tsx
import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  CheckCircle,
  DollarSign,
  FileText,
  Calendar,
  Pill,
  Send,
  Save,
  Download,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import AddProcedureToPlanModal from "./AddProcedureToPlanModal";
import MedicationManagementModal from "./MedicationManagementModal";
import TreatmentPlanTemplatesModal from "./TreatmentPlanTemplatesModal";
import FileAttachmentSection from "@/components/files/FileAttachmentSection";
import { useTranslation } from "react-i18next";
import { downloadTreatmentPlanPdf } from "@/lib/api/treatment-plan-api";

interface TreatmentPlan {
  id: string;
  doctor_id: string;
  patient_id: string | null;
  title: string;
  notes?: string | null;
  status: string;
  total_cost: number;
  created_at: string;
  estimated_duration_weeks?: number;
  estimated_completion_date?: string;
  priority?: string;
  verification_code?: string | null;
}

interface TreatmentPlanProcedure {
  id: string;
  treatment_plan_id: string;
  procedure_id: string;
  tooth_numbers?: number[] | null;
  cost?: number | null; // ✅ unit cost for tooth_based
  notes?: string | null;
  status: string;
  sequence_order?: number | null;
  scheduled_date?: string | null;
  created_at: string;
  procedure: {
    name: string;
    category: string | null;
    type: string | null; // 'tooth_based' | 'oral_cavity_region' | etc
    default_cost?: number | null;
    price?: number | null;
    notes?: string | null;
  };
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface EnhancedTreatmentPlanDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treatmentPlan: TreatmentPlan;
  onUpdate: () => void;
}

const toNumber = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const EnhancedTreatmentPlanDetailModal = ({
  open,
  onOpenChange,
  treatmentPlan,
  onUpdate,
}: EnhancedTreatmentPlanDetailModalProps) => {
  const { i18n } = useTranslation();
  const [procedures, setProcedures] = useState<TreatmentPlanProcedure[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [showAddProcedureModal, setShowAddProcedureModal] = useState(false);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  useEffect(() => {
    if (open) {
      fetchProcedures();
      fetchMedications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, treatmentPlan.id]);

  const fetchProcedures = async () => {
    try {
      // ✅ include price too (fallback)
      const { data, error } = await supabase
        .from("treatment_plan_procedures")
        .select(
          `
          *,
          procedure:procedures(name, category, type, default_cost, price)
        `
        )
        .eq("treatment_plan_id", treatmentPlan.id)
        .order("sequence_order", { ascending: true });

      if (error) throw error;
      setProcedures((data || []) as any);
    } catch (error: any) {
      toast.error("Failed to load procedures: " + error.message);
    }
  };

  const fetchMedications = async () => {
    try {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .eq("treatment_plan_id", treatmentPlan.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMedications((data || []) as any);
    } catch (error: any) {
      toast.error("Failed to load medications: " + error.message);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };

      if (newStatus === "in_progress" && treatmentPlan.status === "confirmed") {
        updateData.started_at = new Date().toISOString();
      } else if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("treatment_plans")
        .update(updateData)
        .eq("id", treatmentPlan.id);

      if (error) throw error;

      toast.success(`Treatment plan status updated to ${newStatus}`);
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to update status: " + error.message);
    }
  };

  const handlePublishPlan = async () => {
    const hasUnsignedConsents = await checkConsentStatus();
    if (hasUnsignedConsents) {
      toast.error("All required consent forms must be signed before publishing");
      return;
    }

    try {
      // Update plan status
      const { error } = await supabase
        .from("treatment_plans")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
        })
        .eq("id", treatmentPlan.id);

      if (error) throw error;

      // Auto-create appointments for procedures with scheduled dates that don't have appointment_id yet
      const scheduledProcs = procedures.filter(
        (p) => p.scheduled_date && !(p as any).appointment_id
      );

      if (scheduledProcs.length > 0) {
        let appointmentsCreated = 0;

        for (const proc of scheduledProcs) {
          try {
            const duration = (proc as any).duration_minutes || 30;
            // Default to 09:00 if no specific time
            const startTime = (proc as any).appointment_time || "09:00";
            const [hh, mm] = startTime.split(":").map(Number);
            const endTotal = hh * 60 + mm + duration;
            const endHH = Math.floor(endTotal / 60);
            const endMM = endTotal % 60;
            const endTime = `${String(endHH).padStart(2, "0")}:${String(endMM).padStart(2, "0")}`;

            const appointmentPayload: any = {
              doctor_id: treatmentPlan.doctor_id,
              appointment_date: proc.scheduled_date,
              start_time: startTime,
              end_time: endTime,
              status: "confirmed",
              notes: `From Treatment Plan: "${treatmentPlan.title}"\nProcedure: ${proc.procedure?.name || "Procedure"}${
                proc.tooth_numbers?.length ? `\nTeeth: ${proc.tooth_numbers.join(", ")}` : ""
              }`,
              procedure_id: proc.procedure_id || null,
            };

            if (treatmentPlan.patient_id) {
              appointmentPayload.patient_id = treatmentPlan.patient_id;
            }

            const { data: apptData, error: apptError } = await supabase
              .from("appointments")
              .insert(appointmentPayload)
              .select("id")
              .single();

            if (!apptError && apptData) {
              // Link appointment back to procedure
              await supabase
                .from("treatment_plan_procedures")
                .update({ appointment_id: apptData.id })
                .eq("id", proc.id);
              appointmentsCreated++;
            }
          } catch (e) {
            console.error("Failed to create appointment for procedure:", proc.id, e);
          }
        }

        if (appointmentsCreated > 0) {
          toast.success(`Treatment plan published! ${appointmentsCreated} appointment${appointmentsCreated > 1 ? "s" : ""} added to calendar.`);
        } else {
          toast.success("Treatment plan published successfully!");
        }
      } else {
        toast.success("Treatment plan published successfully!");
      }

      onUpdate();
    } catch (error: any) {
      toast.error("Failed to publish plan: " + error.message);
    }
  };

  const handleDownloadPdf = async () => {
    toast.loading("Generating PDF...", { id: "tp-pdf" });
    try {
      const locale = (i18n.language || "en").toLowerCase();
      const code = (treatmentPlan.verification_code || treatmentPlan.id || "").slice(0, 18);
      const fileName = code ? `treatment-plan_${code}.pdf` : `treatment-plan_${treatmentPlan.id}.pdf`;

      await downloadTreatmentPlanPdf({
        treatmentPlanId: treatmentPlan.id,
        locale,
        fileName,
      });

      toast.success("PDF downloaded successfully", { id: "tp-pdf" });
    } catch (error: any) {
      console.error("Download treatment plan PDF error:", error);
      toast.error("Failed to download PDF", { id: "tp-pdf" });
    }
  };

  const checkConsentStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("consent_forms")
        .select("status")
        .eq("treatment_plan_id", treatmentPlan.id)
        .neq("status", "signed");

      if (error) throw error;
      return (data || []).length > 0;
    } catch (error) {
      console.error("Error checking consent status:", error);
      return false;
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: "bg-gray-100 text-gray-800",
      normal: "bg-blue-100 text-blue-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  const getStatusColor = (status: string) => {
    // ✅ cover both plan-status + procedure-status
    const colors: Record<string, string> = {
      // plan
      draft: "bg-gray-100 text-gray-800",
      published: "bg-blue-100 text-blue-800",
      in_progress: "bg-orange-100 text-orange-800",
      completed: "bg-green-100 text-green-800",
      paused: "bg-yellow-100 text-yellow-800",
      cancelled: "bg-red-100 text-red-800",

      // procedure
      pending: "bg-gray-100 text-gray-800",
      scheduled: "bg-blue-100 text-blue-800",
      done: "bg-green-100 text-green-800",
      canceled: "bg-red-100 text-red-800",
      no_show: "bg-red-100 text-red-800",
    };

    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        currencyDisplay: "symbol",
      }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  };

  const getUnitCost = (proc: TreatmentPlanProcedure) => {
    return toNumber(proc.cost ?? proc.procedure?.default_cost ?? proc.procedure?.price ?? 0);
  };

  const hasTeethSelected = (proc: TreatmentPlanProcedure) =>
    Array.isArray(proc.tooth_numbers) && proc.tooth_numbers.length > 0;

  const getQty = (proc: TreatmentPlanProcedure) => {
    if (!hasTeethSelected(proc)) return 1;
    return proc.tooth_numbers!.length;
  };

  const getLineTotal = (proc: TreatmentPlanProcedure) => {
    const unit = getUnitCost(proc);
    const qty = getQty(proc);
    return unit * qty;
  };

  // ✅ total cost uses tooth multiplier logic
  const totalCost = useMemo(() => {
    return procedures.reduce((sum, proc) => sum + getLineTotal(proc), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedures]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {treatmentPlan.title}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Badge className={getPriorityColor(treatmentPlan.priority || "normal")}>
                  {treatmentPlan.priority || "normal"} priority
                </Badge>
                <Select value={treatmentPlan.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-40">
                    <Badge className={getStatusColor(treatmentPlan.status)}>
                      {treatmentPlan.status}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="procedures">Procedures ({procedures.length})</TabsTrigger>
              <TabsTrigger value="medications">Medications ({medications.length})</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Plan Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Patient ID</p>
                        <p className="font-medium">{treatmentPlan.patient_id || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Created</p>
                        <p className="font-medium">
                          {format(new Date(treatmentPlan.created_at), "MMM d, yyyy")}
                        </p>
                      </div>

                      {treatmentPlan.estimated_duration_weeks && (
                        <div>
                          <p className="text-sm text-muted-foreground">Duration</p>
                          <p className="font-medium">{treatmentPlan.estimated_duration_weeks} weeks</p>
                        </div>
                      )}

                      {treatmentPlan.estimated_completion_date && (
                        <div>
                          <p className="text-sm text-muted-foreground">Est. Completion</p>
                          <p className="font-medium">
                            {format(new Date(treatmentPlan.estimated_completion_date), "MMM d, yyyy")}
                          </p>
                        </div>
                      )}
                    </div>

                    {treatmentPlan.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="mt-1">{treatmentPlan.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Cost Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary mb-2">
                      {formatCurrency(totalCost)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {procedures.length} procedure{procedures.length !== 1 ? "s" : ""}
                      {medications.length > 0 &&
                        ` + ${medications.length} medication${medications.length !== 1 ? "s" : ""}`}
                    </p>

                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Procedures:</span>
                        <span>{formatCurrency(totalCost)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Medications:</span>
                        <span>Separate billing</span>
                      </div>
                    </div>

                    {/* Optional: show DB total_cost vs computed totalCost */}
                    {typeof treatmentPlan.total_cost === "number" && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        Stored total: {formatCurrency(toNumber(treatmentPlan.total_cost))} • Computed total:{" "}
                        {formatCurrency(totalCost)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {treatmentPlan.status === "draft" && (
                      <Button onClick={handlePublishPlan} className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Publish Plan
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => setShowAddProcedureModal(true)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Procedure
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setShowMedicationModal(true)}
                      className="flex items-center gap-2"
                    >
                      <Pill className="w-4 h-4" />
                      Manage Medications
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setShowTemplatesModal(true)}
                      className="flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save as Template
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleDownloadPdf}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Procedures Tab */}
            <TabsContent value="procedures">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Treatment Procedures</CardTitle>
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
                  {procedures.length === 0 ? (
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
                          <TableHead>Order</TableHead>
                          <TableHead>Procedure</TableHead>
                          <TableHead>Teeth</TableHead>
                          <TableHead>Scheduled</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {procedures.map((proc, index) => {
                          const toothBased = hasTeethSelected(proc);
                          const unit = getUnitCost(proc);
                          const qty = getQty(proc);
                          const lineTotal = getLineTotal(proc);

                          return (
                            <TableRow key={proc.id}>
                              <TableCell className="font-medium">#{index + 1}</TableCell>

                              <TableCell>
                                <div>
                                  <p className="font-medium">{proc.procedure?.name || "Procedure"}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {proc.procedure?.category || "—"}
                                  </p>
                                  {proc.notes && (
                                    <p className="text-sm text-muted-foreground mt-1">{proc.notes}</p>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell>
                                {proc.tooth_numbers && proc.tooth_numbers.length > 0 ? (
                                    <div className="text-sm">
                                      🦷 {proc.tooth_numbers.join(", ")}{" "}
                                      <span className="text-xs text-muted-foreground">
                                        ({proc.tooth_numbers.length} {proc.tooth_numbers.length === 1 ? "tooth" : "teeth"})
                                      </span>
                                    </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>

                              <TableCell>
                                {proc.scheduled_date ? (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(proc.scheduled_date), "MMM d")}
                                  </div>
                                ) : (
                                  <Button variant="outline" size="sm">
                                    Schedule
                                  </Button>
                                )}
                              </TableCell>

                              <TableCell className="text-right">
                                <div className="font-medium">{formatCurrency(lineTotal)}</div>
                                {toothBased ? (
                                  <div className="text-xs text-muted-foreground">
                                    {formatCurrency(unit)} × {qty}
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground">Unit</div>
                                )}
                              </TableCell>

                              <TableCell>
                                <Badge className={getStatusColor(proc.status)}>{proc.status}</Badge>
                              </TableCell>

                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm" className="text-green-600">
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}

                        {/* Total row */}
                        <TableRow>
                          <TableCell colSpan={4} className="text-right font-semibold">
                            Total
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {formatCurrency(totalCost)}
                          </TableCell>
                          <TableCell colSpan={2} />
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Medications Tab */}
            <TabsContent value="medications">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Prescribed Medications</CardTitle>
                    <Button
                      onClick={() => setShowMedicationModal(true)}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Pill className="w-4 h-4" />
                      Manage Medications
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {medications.length === 0 ? (
                    <div className="text-center py-8">
                      <Pill className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No medications prescribed yet</p>
                      <Button onClick={() => setShowMedicationModal(true)}>
                        <Pill className="w-4 h-4 mr-2" />
                        Prescribe Medication
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {medications.map((medication) => (
                        <Card key={medication.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{medication.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {medication.dosage} • {medication.frequency}
                              </p>
                              {medication.instructions && (
                                <p className="text-sm mt-1">{medication.instructions}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>
                                  Start: {format(new Date(medication.start_date), "MMM d, yyyy")}
                                </span>
                                {medication.end_date && (
                                  <span>
                                    End: {format(new Date(medication.end_date), "MMM d, yyyy")}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge className={getStatusColor(medication.status)}>
                              {medication.status}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files">
              <FileAttachmentSection
                treatmentPlanId={treatmentPlan.id}
                title="Treatment Plan Files & Documents"
              />
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates">
              <Card>
                <CardHeader>
                  <CardTitle>Template Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      Save this treatment plan as a template for future use
                    </p>
                    <Button onClick={() => setShowTemplatesModal(true)}>
                      <Save className="w-4 h-4 mr-2" />
                      Save as Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <AddProcedureToPlanModal
        open={showAddProcedureModal}
        onOpenChange={setShowAddProcedureModal}
        treatmentPlanId={treatmentPlan.id}
        onSuccess={() => {
          setShowAddProcedureModal(false);
          fetchProcedures();
          onUpdate();
        }}
      />

      <MedicationManagementModal
        open={showMedicationModal}
        onOpenChange={setShowMedicationModal}
        treatmentPlanId={treatmentPlan.id}
        patientId={treatmentPlan.patient_id || ""}
      />

      <TreatmentPlanTemplatesModal
        open={showTemplatesModal}
        onOpenChange={setShowTemplatesModal}
        currentTreatmentPlan={treatmentPlan}
      />
    </>
  );
};

export default EnhancedTreatmentPlanDetailModal;
