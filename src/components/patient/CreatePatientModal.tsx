import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const formSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  phone: z.string().min(5, "Phone is required"),
  email: z.string().optional(),
  date_of_birth: z.string().min(1, "Date of birth is required"),
});

interface DoctorPatientRow {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string;
  created_at: string;
}

interface CreatePatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (patient: DoctorPatientRow) => void;
}

const CreatePatientModal = ({ open, onOpenChange, onSuccess }: CreatePatientModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      email: "",
      date_of_birth: "",
    },
  });

  useEffect(() => {
    const loadDoctorId = async () => {
      if (!user?.id || !open) return;
      const { data, error } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error(error);
        toast.error("Doctor profile not found");
        return;
      }
      setDoctorId(data.id);
    };

    loadDoctorId();
  }, [user?.id, open]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!doctorId) {
      toast.error("Doctor profile not loaded");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("doctor_patients")
        .insert({
          doctor_id: doctorId,
          full_name: values.full_name.trim(),
          phone: values.phone.trim(),
          email: values.email?.trim() || null,
          date_of_birth: values.date_of_birth,
          status: "active",
        })
        .select("id, full_name, phone, email, date_of_birth, created_at")
        .single();

      if (error) throw error;

      toast.success("Patient added");
      form.reset();
      onSuccess(data as DoctorPatientRow);
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to add patient");
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
          <DialogTitle>Add New Patient</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone*</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (optional)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="patient@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date_of_birth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth*</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add Patient"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePatientModal;
