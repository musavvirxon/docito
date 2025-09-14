import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calendar, DollarSign, Clock, User, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PatientSelector from "@/components/patient/PatientSelector";
import TreatmentPlanTemplatesModal from "./TreatmentPlanTemplatesModal";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  patient_id: z.string().min(1, "Patient selection is required"),
  estimated_duration_weeks: z.string().optional(),
  estimated_total_cost: z.string().optional(),
  priority: z.string().optional(),
});

interface EnhancedCreateTreatmentPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EnhancedCreateTreatmentPlanModal = ({ 
  open, 
  onOpenChange, 
  onSuccess 
}: EnhancedCreateTreatmentPlanModalProps) => {
  const [loading, setLoading] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      patient_id: "",
      estimated_duration_weeks: "",
      estimated_total_cost: "",
      priority: "normal",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to create treatment plans");
        return;
      }

      // Get doctor ID
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!doctorData) {
        toast.error("Doctor profile not found");
        return;
      }

      // Calculate estimated completion date
      let estimatedCompletionDate = null;
      if (values.estimated_duration_weeks) {
        const weeks = parseInt(values.estimated_duration_weeks);
        if (!isNaN(weeks)) {
          estimatedCompletionDate = new Date();
          estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + (weeks * 7));
        }
      }

      const planData = {
        doctor_id: doctorData.id,
        patient_id: values.patient_id,
        title: values.title,
        description: values.description || null,
        status: "draft" as any,
        total_cost: values.estimated_total_cost ? parseFloat(values.estimated_total_cost) : 0,
        estimated_duration_weeks: values.estimated_duration_weeks ? parseInt(values.estimated_duration_weeks) : null,
        estimated_completion_date: estimatedCompletionDate?.toISOString().split('T')[0] || null,
        priority: values.priority || "normal",
      };

      const { error } = await supabase
        .from("treatment_plans")
        .insert([planData]);

      if (error) throw error;

      toast.success("Treatment plan created successfully");
      form.reset();
      onSuccess();
    } catch (error: any) {
      toast.error("Failed to create treatment plan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = (templateData: any) => {
    if (templateData) {
      form.setValue("title", templateData.title || "");
      form.setValue("description", templateData.description || "");
      if (templateData.estimated_duration_weeks) {
        form.setValue("estimated_duration_weeks", templateData.estimated_duration_weeks.toString());
      }
      if (templateData.priority) {
        form.setValue("priority", templateData.priority);
      }
      toast.success("Template applied! You can now modify and save the treatment plan.");
    }
    setShowTemplatesModal(false);
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Create New Treatment Plan
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Template Selection */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Start from Template</h3>
                      <p className="text-sm text-muted-foreground">
                        Use a pre-built template to save time
                      </p>
                    </div>
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => setShowTemplatesModal(true)}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Browse Templates
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Basic Information */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Treatment Plan Title*</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Comprehensive Dental Restoration" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="patient_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient*</FormLabel>
                      <FormControl>
                        <PatientSelector 
                          value={field.value}
                          onSelect={(patient) => field.onChange(patient.id)}
                          placeholder="Search and select a patient"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detailed description of the treatment plan..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Planning Details */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-medium mb-4">Planning Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="estimated_duration_weeks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Duration (weeks)
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 8" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="estimated_total_cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Estimated Cost
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 2500" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Plan"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Templates Modal */}
      <TreatmentPlanTemplatesModal
        open={showTemplatesModal}
        onOpenChange={setShowTemplatesModal}
        onApplyTemplate={handleApplyTemplate}
      />
    </>
  );
};

export default EnhancedCreateTreatmentPlanModal;