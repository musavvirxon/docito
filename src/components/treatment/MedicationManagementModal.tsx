import { useState, useEffect } from "react";
import { Plus, Trash2, Calendar, Clock, Pill } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

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

interface MedicationManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treatmentPlanId: string;
  patientId: string;
}

const MedicationManagementModal = ({ 
  open, 
  onOpenChange, 
  treatmentPlanId,
  patientId 
}: MedicationManagementModalProps) => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    frequency: "",
    instructions: "",
    start_date: "",
    end_date: "",
  });

  const frequencyOptions = [
    "Once daily",
    "Twice daily",
    "Three times daily", 
    "Four times daily",
    "Every 8 hours",
    "Every 12 hours",
    "As needed",
    "Before meals",
    "After meals",
    "At bedtime"
  ];

  useEffect(() => {
    if (open && treatmentPlanId) {
      fetchMedications();
    }
  }, [open, treatmentPlanId]);

  const fetchMedications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .eq("treatment_plan_id", treatmentPlanId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMedications(data || []);
    } catch (error: any) {
      toast.error("Failed to load medications: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedication = async () => {
    if (!formData.name || !formData.dosage || !formData.frequency || !formData.start_date) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Authentication required");
        return;
      }

      // Get doctor ID from user
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!doctorData) {
        toast.error("Doctor profile not found");
        return;
      }

      const medicationData = {
        treatment_plan_id: treatmentPlanId,
        doctor_id: doctorData.id,
        patient_id: patientId,
        name: formData.name,
        dosage: formData.dosage,
        frequency: formData.frequency,
        instructions: formData.instructions,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        status: "active"
      };

      const { error } = await supabase
        .from("medications")
        .insert([medicationData]);

      if (error) throw error;

      toast.success("Medication added successfully");
      setFormData({
        name: "",
        dosage: "",
        frequency: "",
        instructions: "",
        start_date: "",
        end_date: "",
      });
      setShowAddForm(false);
      fetchMedications();
      
      // Create medication reminders
      await createMedicationReminders(medicationData);
    } catch (error: any) {
      toast.error("Failed to add medication: " + error.message);
    }
  };

  const createMedicationReminders = async (medicationData: any) => {
    // This would create reminder schedules based on frequency
    // For now, we'll create a simple daily reminder
    try {
      const startDate = new Date(medicationData.start_date);
      const endDate = medicationData.end_date ? new Date(medicationData.end_date) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const reminders = [];
      const current = new Date(startDate);
      
      while (current <= endDate) {
        // Create reminder for 9 AM each day
        const reminderTime = new Date(current);
        reminderTime.setHours(9, 0, 0, 0);
        
        reminders.push({
          medication_id: medicationData.id,
          patient_id: patientId,
          reminder_time: reminderTime.toISOString(),
          status: "pending"
        });
        
        current.setDate(current.getDate() + 1);
      }

      if (reminders.length > 0) {
        await supabase
          .from("medication_reminders")
          .insert(reminders);
      }
    } catch (error) {
      console.error("Failed to create medication reminders:", error);
    }
  };

  const handleDeleteMedication = async (medicationId: string) => {
    if (!confirm("Are you sure you want to delete this medication?")) return;

    try {
      const { error } = await supabase
        .from("medications")
        .delete()
        .eq("id", medicationId);

      if (error) throw error;
      
      toast.success("Medication deleted successfully");
      fetchMedications();
    } catch (error: any) {
      toast.error("Failed to delete medication: " + error.message);
    }
  };

  const handleUpdateStatus = async (medicationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("medications")
        .update({ status: newStatus })
        .eq("id", medicationId);

      if (error) throw error;
      
      toast.success("Medication status updated");
      fetchMedications();
    } catch (error: any) {
      toast.error("Failed to update medication status: " + error.message);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      completed: "bg-blue-100 text-blue-800",
      discontinued: "bg-red-100 text-red-800",
      paused: "bg-yellow-100 text-yellow-800"
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5" />
            Medication Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Medication Form */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Prescribe Medication</CardTitle>
                <Button 
                  onClick={() => setShowAddForm(!showAddForm)} 
                  size="sm"
                  variant={showAddForm ? "outline" : "default"}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {showAddForm ? "Cancel" : "Add Medication"}
                </Button>
              </div>
            </CardHeader>
            {showAddForm && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="medication-name">Medication Name*</Label>
                    <Input
                      id="medication-name"
                      placeholder="e.g., Amoxicillin"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dosage">Dosage*</Label>
                    <Input
                      id="dosage"
                      placeholder="e.g., 500mg"
                      value={formData.dosage}
                      onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="frequency">Frequency*</Label>
                    <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {frequencyOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="start-date">Start Date*</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="end-date">End Date (Optional)</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddMedication} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Medication
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="instructions">Instructions & Notes</Label>
                  <Textarea
                    id="instructions"
                    placeholder="e.g., Take with food. Complete full course even if symptoms improve."
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Medications List */}
          <Card>
            <CardHeader>
              <CardTitle>Prescribed Medications ({medications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading medications...</div>
              ) : medications.length === 0 ? (
                <div className="text-center py-8">
                  <Pill className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No medications prescribed yet</p>
                  <Button onClick={() => setShowAddForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Medication
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medication</TableHead>
                      <TableHead>Dosage & Frequency</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medications.map((medication) => (
                      <TableRow key={medication.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{medication.name}</p>
                            {medication.instructions && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {medication.instructions}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{medication.dosage}</p>
                            <p className="text-sm text-muted-foreground">{medication.frequency}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1 mb-1">
                              <Calendar className="w-3 h-3" />
                              <span>Start: {format(new Date(medication.start_date), 'MMM d, yyyy')}</span>
                            </div>
                            {medication.end_date && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>End: {format(new Date(medication.end_date), 'MMM d, yyyy')}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={medication.status} 
                            onValueChange={(value) => handleUpdateStatus(medication.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <Badge className={getStatusColor(medication.status)}>
                                {medication.status}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="discontinued">Discontinued</SelectItem>
                              <SelectItem value="paused">Paused</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMedication(medication.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

export default MedicationManagementModal;