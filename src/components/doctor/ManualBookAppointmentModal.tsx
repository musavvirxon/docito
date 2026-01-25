import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CalendarPlus, User } from "lucide-react";

import PatientSelector, { type Patient } from "@/components/patient/PatientSelector";
import CreatePatientModal, { type DoctorPatientRow } from "@/components/patient/CreatePatientModal";
import { useProcedures } from "@/hooks/useProcedures";

interface ManualBookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
  practiceId?: string;
  onSuccess?: () => Promise<void> | void;
  prefilledDate?: Date;
  prefilledTime?: string;
}

const DURATION_OPTIONS_MINUTES = [10, 15, 20, 30, 45, 60, 75, 90, 105, 120, 150, 180];

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const ManualBookAppointmentModal = ({
  isOpen,
  onClose,
  doctorId,
  practiceId,
  onSuccess,
  prefilledDate,
  prefilledTime,
}: ManualBookAppointmentModalProps) => {
  const { procedures } = useProcedures();

  const [selectedDate, setSelectedDate] = useState<Date>(prefilledDate || new Date());
  const [selectedTime, setSelectedTime] = useState<string>(prefilledTime || "");
  const [procedureId, setProcedureId] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [createPatientOpen, setCreatePatientOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (prefilledDate) setSelectedDate(prefilledDate);
    else setSelectedDate(new Date());

    if (prefilledTime) setSelectedTime(prefilledTime);

    setProcedureId("");
    setDurationMinutes(30);
    setNotes("");
    setSelectedPatient(null);
  }, [isOpen, prefilledDate, prefilledTime]);

  const resetForm = () => {
    setSelectedDate(new Date());
    setSelectedTime("");
    setProcedureId("");
    setDurationMinutes(30);
    setNotes("");
    setSelectedPatient(null);
  };

  const buildSupabaseErrorText = (err: any) => {
    const parts = [
      err?.message ? `Message: ${err.message}` : null,
      err?.details ? `Details: ${err.details}` : null,
      err?.hint ? `Hint: ${err.hint}` : null,
      err?.code ? `Code: ${err.code}` : null,
    ].filter(Boolean);
    return parts.join(" | ") || "Unknown error";
  };

  const tryInsert = async (payload: any) => {
    const { data, error } = await supabase.from("appointments").insert(payload).select().single();
    if (error) throw error;
    return data;
  };

  const insertWithFallback = async (payload: any) => {
    try {
      return await tryInsert(payload);
    } catch (err: any) {
      const msg = String(err?.message || "");

      // If DB doesn't have procedure_id or practice_id, retry without them
      const retry = { ...payload };
      if (msg.includes("procedure_id")) delete retry.procedure_id;
      if (msg.includes("practice_id")) delete retry.practice_id;

      // Also fallback if doctor_patient_id missing
      if (err?.code === "42703" && msg.toLowerCase().includes("doctor_patient_id")) {
        delete retry.doctor_patient_id;
      }

      return await tryInsert(retry);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate) return toast.error("Please select a valid date");
    if (!selectedTime) return toast.error("Please select a valid time");
    if (!selectedPatient) return toast.error("Please select a patient");

    setLoading(true);

    try {
      const startTime = selectedTime;
      const [hours, minutes] = startTime.split(":").map(Number);

      const endDate = new Date(selectedDate);
      endDate.setHours(hours, minutes + durationMinutes, 0, 0);

      const endTime = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;

      const patientLink =
        selectedPatient.source === "registered"
          ? { patient_id: selectedPatient.id, doctor_patient_id: null }
          : { patient_id: null, doctor_patient_id: selectedPatient.id };

      const selectedProc = procedures.find((p) => p.id === procedureId);
      const procedureName = selectedProc?.name || (procedureId ? "Procedure" : null);

      const notesCombined =
        [
          `Patient name: ${selectedPatient.name}`,
          selectedPatient.phone ? `Patient phone: ${selectedPatient.phone}` : null,
          selectedPatient.email ? `Patient email: ${selectedPatient.email}` : null,
          procedureName ? `Procedure: ${procedureName}` : null,
          notes?.trim() ? notes.trim() : null,
        ]
          .filter(Boolean)
          .join("\n") || null;

      const payload: any = {
        doctor_id: doctorId,
        practice_id: practiceId || null,
        appointment_date: format(selectedDate, "yyyy-MM-dd"),
        start_time: startTime,
        end_time: endTime,
        notes: notesCombined,
        status: "confirmed",
        ...patientLink,

        // optional: if DB supports it
        procedure_id: procedureId || null,
      };

      await insertWithFallback(payload);

      toast.success(`Appointment booked for ${selectedPatient.name}`);

      onClose();
      resetForm();

      Promise.resolve(onSuccess?.()).catch((err) => console.error("onSuccess/refetch failed:", err));
    } catch (error: any) {
      console.error("❌ Booking error object:", error);
      toast.error(buildSupabaseErrorText(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          resetForm();
        }
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
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <Label className="text-base font-medium">Select Patient</Label>
            </div>

            <PatientSelector value={selectedPatient?.id} required onSelect={(p) => setSelectedPatient(p)} />

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

          <div className="space-y-2">
            <Label>Date (YYYY-MM-DD)</Label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              type="date"
              value={format(selectedDate, "yyyy-MM-dd")}
              min={format(new Date(), "yyyy-MM-dd")}
              onChange={(e) => {
                const newDate = new Date(e.target.value + "T00:00:00");
                if (newDate >= new Date(new Date().toDateString())) {
                  setSelectedDate(newDate);
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Start Time (HH:MM)</Label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              type="time"
              value={selectedTime}
              min={format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") 
                ? format(new Date(), "HH:mm") 
                : undefined}
              onChange={(e) => {
                const [hours, minutes] = e.target.value.split(":").map(Number);
                const now = new Date();
                const isToday = format(selectedDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
                
                if (isToday) {
                  const nowMinutes = now.getHours() * 60 + now.getMinutes();
                  const selectedMinutes = hours * 60 + minutes;
                  if (selectedMinutes < nowMinutes) {
                    return; // Don't allow past times today
                  }
                }
                setSelectedTime(e.target.value);
              }}
            />
            {format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") && (
              <p className="text-xs text-muted-foreground">
                Past times are not available for today
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Procedure (optional)</Label>
            <Select
              value={procedureId}
              onValueChange={(v) => {
                setProcedureId(v);
                const proc = procedures.find((p) => p.id === v);
                if (proc?.duration_minutes) setDurationMinutes(Number(proc.duration_minutes));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select procedure" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No procedure</SelectItem>
                {procedures.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} • {formatDuration(Number(p.duration_minutes || 30))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Duration</Label>
            <Select value={String(durationMinutes)} onValueChange={(v) => setDurationMinutes(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS_MINUTES.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {formatDuration(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Defaults from procedure if selected, but you can override.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { onClose(); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Booking..." : "Book Appointment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ManualBookAppointmentModal;
