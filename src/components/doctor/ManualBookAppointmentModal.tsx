import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CalendarPlus, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

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
  const [selectedTime, setSelectedTime] = useState<string>(prefilledTime || "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [createPatientOpen, setCreatePatientOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (prefilledDate) setSelectedDate(prefilledDate);
    if (prefilledTime) setSelectedTime(prefilledTime);
  }, [isOpen, prefilledDate, prefilledTime]);

  const resetForm = () => {
    setSelectedDate(new Date());
    setSelectedTime("");
    setNotes("");
    setSelectedPatient(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }

    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }

    setLoading(true);

    try {
      const startTime = selectedTime;

      // Calculate end time (default 30 min slot)
      const [hours, minutes] = startTime.split(":").map(Number);
      const endDate = new Date(selectedDate);
      endDate.setHours(hours, minutes, 0, 0);
      endDate.setMinutes(endDate.getMinutes() + 30);

      const endTime = `${String(endDate.getHours()).padStart(2, "0")}:${String(
        endDate.getMinutes()
      ).padStart(2, "0")}`;

      // Our appointments table only supports patient_id (auth users). For doctor-added
      // patients (stored in doctor_patients), we still allow booking the slot, but we
      // store patient details inside notes so the calendar can display the name.
      const patientIdOrNull = selectedPatient.source === "registered" ? selectedPatient.id : null;

      const structuredPatientHeader =
        selectedPatient.source === "doctor_added"
          ? `[PATIENT] Name: ${selectedPatient.name} | Phone: ${selectedPatient.phone ?? ""} | Email: ${selectedPatient.email ?? ""}`
          : null;

      const combinedNotes = [structuredPatientHeader, notes || null].filter(Boolean).join("\n");

      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          doctor_id: doctorId,
          practice_id: practiceId || null,
          appointment_date: format(selectedDate, "yyyy-MM-dd"),
          start_time: startTime,
          end_time: endTime,
          notes: combinedNotes || null,
          status: "confirmed",
          patient_id: patientIdOrNull,
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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
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

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
            <div className="space-y-2">
              <Label className="text-sm">Appointment Date</Label>
              <div className="rounded-md border bg-background p-2">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="text-sm">Start Time</Label>
              <Input
                id="time"
                type="time"
                step={900}
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Duration: 30 minutes (end time is calculated automatically)
              </p>

              {selectedDate && selectedTime ? (
                <p className="text-sm text-muted-foreground mt-2">
                  {format(selectedDate, "EEEE, MMMM d, yyyy")} at {selectedTime}
                </p>
              ) : null}
            </div>
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
