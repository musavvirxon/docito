// File: src/components/doctor/NewPatientAppointmentFlow.tsx
// Orchestrator: glues existing AddPatientModal + ManualBookAppointmentModal into a
// 2-step "New Patient → New Appointment" flow. No new forms, no new pages.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarClock, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import AddPatientModal from "@/components/doctor/patients/AddPatientModal";
import ManualBookAppointmentModal from "@/components/doctor/ManualBookAppointmentModal";
import type { Patient } from "@/components/patient/PatientSelector";

type Step = "idle" | "patient" | "choose" | "schedule" | "start_now";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doctorId: string;
  practiceId?: string;
}

const roundedNowTime = () => {
  const d = new Date();
  // round up to next 5-min increment
  const m = d.getMinutes();
  const rounded = Math.ceil(m / 5) * 5;
  d.setMinutes(rounded, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const NewPatientAppointmentFlow = ({ open, onOpenChange, doctorId, practiceId }: Props) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("patient");
  const [patient, setPatient] = useState<Patient | null>(null);

  // Reset whenever the flow is closed
  const close = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("patient");
      setPatient(null);
    }, 200);
  };

  const handlePatientCreated = async (patientId: string) => {
    try {
      const { data, error } = await supabase
        .from("doctor_patients")
        .select("id, full_name, phone, email")
        .eq("id", patientId)
        .single();
      if (error) throw error;
      setPatient({
        id: data.id,
        name: data.full_name,
        phone: data.phone || undefined,
        email: data.email || undefined,
        source: "doctor_added",
      } as Patient);
      setStep("choose");
    } catch (err: any) {
      console.error(err);
      toast.error("Could not load the new patient");
      close();
    }
  };

  return (
    <>
      {/* Step 1: reuse existing AddPatientModal verbatim */}
      <AddPatientModal
        isOpen={open && step === "patient"}
        onClose={close}
        onSuccess={handlePatientCreated}
      />

      {/* Choose: schedule for later vs start right now */}
      <Dialog open={open && step === "choose"} onOpenChange={(v) => { if (!v) close(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Appointment for {patient?.name}</DialogTitle>
            <DialogDescription>
              How would you like to handle this appointment?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 pt-2">
            <Button
              variant="outline"
              size="lg"
              className="justify-start h-auto py-4"
              onClick={() => setStep("schedule")}
            >
              <CalendarClock className="mr-3 h-5 w-5 shrink-0" />
              <span className="flex flex-col items-start text-left">
                <span className="font-semibold">Schedule for later</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Pick a date and time
                </span>
              </span>
            </Button>
            <Button
              size="lg"
              className="justify-start h-auto py-4"
              onClick={() => setStep("start_now")}
            >
              <PlayCircle className="mr-3 h-5 w-5 shrink-0" />
              <span className="flex flex-col items-start text-left">
                <span className="font-semibold">Start right now</span>
                <span className="text-xs text-primary-foreground/80 font-normal">
                  Launch the session immediately
                </span>
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Step 2a: schedule for later — reuse ManualBookAppointmentModal */}
      {patient && (
        <ManualBookAppointmentModal
          isOpen={open && step === "schedule"}
          onClose={close}
          doctorId={doctorId}
          practiceId={practiceId}
          preselectedPatient={patient}
          onSuccess={async () => {
            close();
          }}
        />
      )}

      {/* Step 2b: start right now — book at now and jump into the session */}
      {patient && (
        <ManualBookAppointmentModal
          isOpen={open && step === "start_now"}
          onClose={close}
          doctorId={doctorId}
          practiceId={practiceId}
          preselectedPatient={patient}
          prefilledDate={new Date()}
          prefilledTime={roundedNowTime()}
          forceAppointmentType="in_person"
          onSuccess={async (appointmentId) => {
            close();
            if (appointmentId) {
              navigate(`/appointment-session/${appointmentId}`);
            }
          }}
        />
      )}
    </>
  );
};

export default NewPatientAppointmentFlow;
