import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PatientSelector from "@/components/patient/PatientSelector";

const formSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  patient_id: z.string().optional(),
});

interface CreateTreatmentPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateTreatmentPlanModal = ({ open, onOpenChange, onSuccess }: CreateTreatmentPlanModalProps) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      patient_id: "",
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

      // For now, we'll use the patient email as a patient ID
      // In a real app, you'd look up or create the patient record
      const patientId = values.patient_id;

      const planData = {
        doctor_id: user.id,
        patient_id: patientId,
        title: values.title,
        description: values.description || null,
        status: "draft",
        total_cost: 0,
      };

      const { error } = await supabase
        .from("treatment_plans")
        .insert([planData] as any);

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

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Treatment Plan</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      placeholder="Optional description of the treatment plan..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
  );
};

export default CreateTreatmentPlanModal;