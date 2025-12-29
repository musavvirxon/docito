import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CalendarPlus, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";

import PatientSelector, { type Patient } from "@/components/patient/PatientSelector";
import CreatePatientModal, { type DoctorPatientRow } from "@/components/patient/CreatePatientModal";

interface ManualBookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
  practiceId?: string;
  onSuccess?: () => void;
  prefilledDate?: Date;
  prefilledTime?: string;
}

const ManualBookAppointmentModal = ({
  isOpen,
  onClose,
  doctorId,
  practiceId,
  onSuccess,
  prefilledDate,
  prefilledTime,
}: ManualBookAppointmentModalProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(prefilledDate || new Date());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [createPatientOpen, setCreatePatientOpen] = useState(false);

  useEffect(() => {
    if (isOpen && prefilledDate) setSelectedDate(prefilledDate);
  }, [isOpen, prefilledDate]);

  const resetForm = () => {
    setSelectedDate(new Date());
    setNotes("");
    setSelectedPatient(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !prefilledTime) {
      toast.error("Please select a valid time slot");
      return;
    }

    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }

    setLoading(true);

    try {
      // Calculate end time (default 30 min slot)
      const startTime = prefilledTime;
      const [hours, minutes] = startTime.split(":").map(Number);
      const endDate = new Date();
      endDate.setHours(hours, minutes + 30, 0, 0);

      const endTime = `${String(endDate.getHours()).padStart(2, "0")}:${String(
        endDate.getMinutes()
      ).padStart(2, "0")}`;

      // Link appointment to either registered patient (patient_id) or doctor-added patient (doctor_patient_id)
      const patientPayload =
        selectedPatient.source === "doctor_added"
          ? { patient_id: null, doctor_patient_id: selectedPatient.id }
          : { patient_id: selectedPatient.id, doctor_patient_id: null };

      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          doctor_id: doctorId,
          practice_id: practiceId || null,
          appointment_date: format(selectedDate, "yyyy-MM-dd"),
          start_time: startTime,
          end_time: endTime,
          notes: notes || null,
          status: "confirmed",
          ...patientPayload,
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Notify doctor (current user)
      const { data: authRes } = await supabase.auth.getUser();
      const currentUser = authRes?.user;

      if (currentUser) {
        const appointmentDate = new Date(selectedDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        await supabase.from("real_time_notifications").insert([
          {
            recipient_user_id: currentUser.id,
            notification_type: "appointment_created",
            title: "Appointment Booked",
            message: `Appointment with ${selectedPatient.name} scheduled for ${appointmentDate} at ${startTime}`,
            data: { appointment_id: appointment.id, appointment_date: selectedDate.toISOString() },
          },
        ]);
      }

      toast.success(`Appointment booked for ${selectedPatient.name}`);

      await onSuccess?.();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error("❌ Booking error:", error);
      toast.error(error?.message || "Failed to book appointment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5" />
            Book Appointment
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <Label className="text-base font-medium">Select Patient</Label>
            </div>

            <PatientSelector
              value={selectedPatient?.id}
              required
              onSelect={(p) => setSelectedPatient(p)}
            />

            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-primary"
              onClick={() => setCreatePatientOpen(true)}
            >
              Add New Patient
            </Button>

            <CreatePatientModal
              open={createPatientOpen}
              onOpenChange={setCreatePatientOpen}
              onSuccess={(newDoctorPatient: DoctorPatientRow) => {
                setSelectedPatient({
                  id: newDoctorPatient.id,
                  name: newDoctorPatient.full_name,
                  phone: newDoctorPatient.phone,
                  email: newDoctorPatient.email ?? undefined,
                  date_of_birth: newDoctorPatient.date_of_birth,
                  created_at: newDoctorPatient.created_at,
                  source: "doctor_added",
                });
              }}
            />
          </div>

          <Separator />

          {/* Selected Slot Info */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h3 className="font-medium text-sm">Selected Time Slot</h3>
            <p className="text-sm text-muted-foreground">
              {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")} at{" "}
              {prefilledTime || "Not selected"}
            </p>
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <Label htmlFor="notes">Appointment Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for visit, symptoms, special instructions, etc."
              className="min-h-[100px]"
            />
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !selectedPatient}>
              {loading ? "Booking..." : "Book Appointment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ManualBookAppointmentModal;
