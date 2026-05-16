// Path: src/components/doctor/ManualBookAppointmentModal.tsx
// File: src/components/doctor/ManualBookAppointmentModal.tsx

import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay, startOfDay } from "date-fns";
import { CalendarPlus, User, CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

import PatientSelector, { type Patient } from "@/components/patient/PatientSelector";
import { useProcedures } from "@/hooks/useProcedures";

interface ManualBookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
  practiceId?: string;
  onSuccess?: (appointmentId?: string) => Promise<void> | void;
  prefilledDate?: Date;
  prefilledTime?: string;
  prefilledNotes?: string;

  // ✅ Follow-up flow
  preselectedPatient?: Patient | null;
  followupOfAppointmentId?: string | null;
  forceAppointmentType?: "in_person" | "video" | "home_visit" | "follow_up" | "messaging";

  // ✅ Referral link flow
  referralId?: string | null;
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
  preselectedPatient,
  followupOfAppointmentId,
  forceAppointmentType,
}: ManualBookAppointmentModalProps) => {
  const { procedures } = useProcedures();

  const [selectedDate, setSelectedDate] = useState<Date>(prefilledDate || new Date());
  const [selectedTime, setSelectedTime] = useState<string>(prefilledTime || "");
  const [procedureId, setProcedureId] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [notes, setNotes] = useState("");
  const [appointmentType, setAppointmentType] = useState<string>(
    forceAppointmentType || (followupOfAppointmentId ? "follow_up" : "in_person"),
  );
  const [loading, setLoading] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (prefilledDate) setSelectedDate(prefilledDate);
    else setSelectedDate(new Date());

    if (prefilledTime) setSelectedTime(prefilledTime);
    else setSelectedTime("");

    setProcedureId("");
    setDurationMinutes(30);
    setNotes("");
    setSelectedPatient(preselectedPatient ?? null);

    // ✅ Follow-up must always be follow_up type
    const nextType = forceAppointmentType || (followupOfAppointmentId ? "follow_up" : "in_person");
    setAppointmentType(nextType);
  }, [isOpen, prefilledDate, prefilledTime, preselectedPatient, followupOfAppointmentId, forceAppointmentType]);

  const resetForm = () => {
    setSelectedDate(new Date());
    setSelectedTime("");
    setProcedureId("");
    setDurationMinutes(30);
    setNotes("");
    setSelectedPatient(null);
    setAppointmentType(forceAppointmentType || "in_person");
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

      // If DB doesn't have these columns, retry without them
      const retry = { ...payload };
      if (msg.includes("procedure_id")) delete retry.procedure_id;
      if (msg.includes("practice_id")) delete retry.practice_id;
      if (msg.includes("appointment_type")) delete retry.appointment_type;
      if (msg.includes("follow_up_of_appointment_id")) delete retry.follow_up_of_appointment_id;

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

      const endTime = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(
        2,
        "0",
      )}`;

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

      // ✅ Force follow_up type if followupOfAppointmentId is set
      const finalAppointmentType = followupOfAppointmentId ? "follow_up" : appointmentType;

      const payload: any = {
        doctor_id: doctorId,
        practice_id: practiceId || null,
        appointment_date: format(selectedDate, "yyyy-MM-dd"),
        start_time: startTime,
        end_time: endTime,
        notes: notesCombined,
        status: "confirmed",
        appointment_type: finalAppointmentType,
        follow_up_of_appointment_id: followupOfAppointmentId || null,
        ...patientLink,

        // optional: if DB supports it
        procedure_id: procedureId || null,
      };

      await insertWithFallback(payload);

      toast.success(`Appointment booked for ${selectedPatient.name}`);

      // Trigger refetch BEFORE closing so the calendar updates
      try {
        await Promise.resolve(onSuccess?.());
      } catch (err) {
        console.error("onSuccess/refetch failed:", err);
      }

      onClose();
      resetForm();
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
            {followupOfAppointmentId ? "Book Follow-up" : "Book Appointment"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <Label className="text-base font-medium">
                {preselectedPatient ? "Patient" : "Select Patient"}
              </Label>
            </div>

            {preselectedPatient ? (
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{preselectedPatient.name}</p>
                    {preselectedPatient.phone && (
                      <p className="text-xs text-muted-foreground">{preselectedPatient.phone}</p>
                    )}
                    {preselectedPatient.email && (
                      <p className="text-xs text-muted-foreground">{preselectedPatient.email}</p>
                    )}
                  </div>
                </div>
                {followupOfAppointmentId && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Patient auto-filled from previous appointment
                  </p>
                )}
              </div>
            ) : (
              <PatientSelector
                value={selectedPatient?.id}
                required
                allowCreate={false}
                onSelect={(p) => setSelectedPatient(p)}
              />
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" /> Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "EEE, MMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => {
                      if (!d) return;
                      setSelectedDate(d);
                      setSelectedTime("");
                    }}
                    disabled={(date) => date < startOfDay(new Date())}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" /> Start Time
              </Label>
              <div className="rounded-lg border border-border bg-card/50 p-3">
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                  {(() => {
                    const slots: string[] = [];
                    const step = 15;
                    for (let h = 8; h < 20; h++) {
                      for (let m = 0; m < 60; m += step) {
                        slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
                      }
                    }
                    const now = new Date();
                    const isToday = isSameDay(selectedDate, now);
                    return slots.map((s) => {
                      const [hh, mm] = s.split(":").map(Number);
                      const past = isToday && (hh < now.getHours() || (hh === now.getHours() && mm <= now.getMinutes()));
                      const active = selectedTime === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={past}
                          onClick={() => setSelectedTime(s)}
                          className={cn(
                            "rounded-md border px-2 py-1.5 text-xs font-medium transition-all",
                            active
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-border bg-background hover:border-primary/40 hover:bg-accent",
                            past && "opacity-40 cursor-not-allowed hover:bg-background hover:border-border",
                          )}
                        >
                          {s}
                        </button>
                      );
                    });
                  })()}
                </div>
                {!selectedTime && (
                  <p className="mt-2 text-xs text-muted-foreground">Select a time slot</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Appointment Type</Label>
            <Select
              value={followupOfAppointmentId ? "follow_up" : appointmentType}
              onValueChange={(v) => setAppointmentType(v)}
              disabled={Boolean(forceAppointmentType) || Boolean(followupOfAppointmentId)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select appointment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_person">In person</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="home_visit">Home visit</SelectItem>
                <SelectItem value="follow_up">Follow-up</SelectItem>
                <SelectItem value="messaging">Messaging</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Procedure (optional)</Label>
            <Select
              value={procedureId || "none"}
              onValueChange={(v) => {
                const realValue = v === "none" ? "" : v;
                setProcedureId(realValue);
                const proc = procedures.find((p) => p.id === realValue);
                if (proc?.duration_minutes) setDurationMinutes(Number(proc.duration_minutes));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a procedure" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No procedure</SelectItem>
                {procedures.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.duration_minutes ? `(${p.duration_minutes} min)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Duration</Label>
            <Select value={String(durationMinutes)} onValueChange={(v) => setDurationMinutes(Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS_MINUTES.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {formatDuration(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Add any notes for this appointment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onClose();
                resetForm();
              }}
              disabled={loading}
            >
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
