import { memo, useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Phone,
  Mail,
  Video,
  MessageSquare,
  User,
  Play,
  MapPin,
  Home,
  ArrowRight,
  Stethoscope,
  Activity,
  Plus,
  Loader2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { CalendarAppointment } from "./types";

interface AppointmentQuickPreviewProps {
  appointment: CalendarAppointment | null;
  isOpen: boolean;
  onClose: () => void;
  onStartSession: (appointment: CalendarAppointment) => void;
  onViewPatient: (patientId: string, patientType: "registered" | "direct") => void;
  onOpenFullModal: () => void;
  doctorSpecialty?: string;
}

const typeIcons = {
  in_person: MapPin,
  "in-person": MapPin,
  video: Video,
  home_visit: Home,
  home: Home,
  messaging: MessageSquare,
  chat: MessageSquare,
  follow_up: Activity,
};

const typeLabels = {
  in_person: "In-Person",
  "in-person": "In-Person",
  video: "Video Call",
  home_visit: "Home Visit",
  home: "Home Visit",
  messaging: "Messaging",
  chat: "Messaging",
  follow_up: "Follow-up",
};

const statusColors: Record<string, string> = {
  confirmed: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  pending: "bg-amber-500/10 text-amber-600 border-amber-200",
  completed: "bg-muted text-muted-foreground border-border",
  canceled: "bg-destructive/10 text-destructive border-destructive/20",
  "no-show": "bg-amber-500/10 text-amber-600 border-amber-200",
  in_progress: "bg-green-500/10 text-green-600 border-green-200",
};

function extractRequestedProcedureName(notes?: string | null): string | null {
  if (!notes) return null;
  const lines = notes.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = String(lines[i] || "").trim();
    const m = line.match(/^Requested\s+Procedure:\s*(.+)\s*$/i);
    if (m && m[1]) return m[1].trim() || null;
  }
  return null;
}

const AppointmentQuickPreview = memo(
  ({
    appointment,
    isOpen,
    onClose,
    onStartSession,
    onViewPatient,
    onOpenFullModal,
    doctorSpecialty = "",
  }: AppointmentQuickPreviewProps) => {
    const { i18n } = useTranslation("dashboard");
    const navigate = useNavigate();
    const [isStarting, setIsStarting] = useState(false);
    const isRTL = i18n.language === "ar";

    const patientId = useMemo(() => {
      if (!appointment) return "";
      return (appointment.patient_id || (appointment as any).doctor_patient_id || "") as string;
    }, [appointment]);

    const patientType = useMemo<"registered" | "direct">(() => {
      if (!appointment) return "registered";
      return appointment.patient_id ? "registered" : "direct";
    }, [appointment]);

    const appointmentType = (appointment?.appointment_type || "in_person") as any;
    const TypeIcon = typeIcons[appointmentType as keyof typeof typeIcons] || MapPin;
    const typeLabel = typeLabels[appointmentType as keyof typeof typeLabels] || "In-Person";

    const startState = useMemo(() => {
      const doctorRequested = Boolean(appointment?.start_requested_by_doctor);
      const patientRequested = Boolean(appointment?.start_requested_by_patient);

      // registered patient must accept; direct patients treated as accepted
      const patientAccepted = appointment?.patient_id
        ? appointment?.patient_confirmation_status === "confirmed" || appointment?.status === "confirmed"
        : true;

      // for registered patients: need both; for direct patients: doctor request is enough
      const bothRequested = appointment?.patient_id ? doctorRequested && patientRequested : doctorRequested;

      return {
        doctorRequested,
        patientRequested,
        patientAccepted,
        bothRequested,
        canStart: patientAccepted && bothRequested,
      };
    }, [
      appointment?.patient_confirmation_status,
      appointment?.patient_id,
      appointment?.status,
      appointment?.start_requested_by_doctor,
      appointment?.start_requested_by_patient,
    ]);

    const isToday = useMemo(() => {
      if (!appointment) return false;
      return new Date(appointment.appointment_date).toDateString() === new Date().toDateString();
    }, [appointment]);

    const appointmentTime = useMemo(() => {
      if (!appointment) return null;
      const [h, m] = String(appointment.start_time).split(":").map(Number);
      const dt = new Date(appointment.appointment_date);
      dt.setHours(h, m, 0, 0);
      if (Number.isNaN(dt.getTime())) return null;
      return dt;
    }, [appointment]);

    // Interactions allowed: appointment day, starting 15 minutes before start
    const canInteractNow = useMemo(() => {
      if (!appointment || !appointmentTime) return false;
      const now = new Date();
      return isToday && now >= new Date(appointmentTime.getTime() - 15 * 60 * 1000);
    }, [appointment, appointmentTime, isToday]);

    const startButtonLabel = startState.canStart
      ? appointmentType === "video"
        ? "Start Video Appointment"
        : "Start Appointment"
      : "Request to Start";

    const startButtonHint = useMemo(() => {
      if (!appointment) return "";
      if (!appointment.patient_id) {
        return startState.doctorRequested
          ? "Ready to start (direct patient)."
          : "Send request to start. Direct patients can begin after doctor request.";
      }
      if (!startState.patientAccepted) return "Patient must accept appointment first.";
      if (!startState.doctorRequested || !startState.patientRequested) return "Both doctor and patient must request start.";
      return "Ready to start.";
    }, [appointment, startState]);

    const handleRequestOrStart = useCallback(async () => {
      if (!appointment) return;

      setIsStarting(true);
      try {
        const { data, error } = await supabase.functions.invoke("request-start-appointment", {
          body: { appointment_id: appointment.id },
        });

        if (error) throw error;

        if (data?.can_start) {
          // If video consultation, auto-route to video room if available
          if ((appointment.appointment_type || "in_person") === "video") {
            const room = data?.consultation?.room_id || data?.consultation?.room_url;
            if (room) {
              toast.success("Starting video consultation…");
              onStartSession(appointment);
              onClose();
              navigate(`/video/${room}`);
              return;
            }
          }

          toast.success("Appointment started.");
          onStartSession(appointment);
          onClose();
          return;
        }

        toast.success("Start request sent.");
      } catch (err: any) {
        console.error("Error requesting/starting appointment:", err);
        toast.error(err?.message ?? "Failed to request/start appointment");
      } finally {
        setIsStarting(false);
      }
    }, [appointment, navigate, onClose, onStartSession]);

    const handleViewPatient = useCallback(() => {
      if (!appointment) return;

      if (!patientId) {
        toast.error("Patient information not available");
        return;
      }

      onViewPatient(patientId, patientType);
      onClose();
    }, [appointment, onViewPatient, onClose, patientId, patientType]);

    const handleMessage = useCallback(async () => {
      if (!appointment) return;

      try {
        const { data: existing, error: e1 } = await supabase
          .from("conversations")
          .select("id")
          .eq("context_type", "visit")
          .eq("context_id", appointment.id)
          .maybeSingle();

        if (e1) throw e1;

        if (existing?.id) {
          navigate(`/messages?c=${existing.id}`);
          onClose();
          return;
        }

        if (!appointment.patient_id) {
          toast.error("Patient messaging is only available for registered patients.");
          return;
        }

        const { data: conversationId, error } = await supabase.rpc("create_direct_conversation" as any, {
          target_user_id: appointment.patient_id,
        } as any);

        if (error) throw error;

        navigate(`/messages?c=${conversationId}`);
        onClose();
      } catch (error) {
        console.error("Error starting conversation:", error);
        toast.error("Failed to start conversation");
      }
    }, [appointment, navigate, onClose]);

    if (!appointment) return null;

    const initials =
      appointment.patient_name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "P";

    const isDentist = doctorSpecialty?.toLowerCase().includes("dent");
    const requestedProcedureName = appointment.procedure_name || extractRequestedProcedureName(appointment.notes ?? null);

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-background shadow-lg">
                  <AvatarImage src={appointment.patient_avatar || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-lg font-semibold">{appointment.patient_name}</DialogTitle>
                  <DialogDescription className="flex items-center gap-2 text-sm mt-0.5">
                    <TypeIcon className="h-3.5 w-3.5" />
                    {typeLabel}
                  </DialogDescription>
                </div>
              </div>

              <Badge variant="outline" className={cn("capitalize text-xs", statusColors[appointment.status] || "")}>
                {appointment.status}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(appointment.appointment_date), "EEE, MMM d")}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {appointment.start_time} - {appointment.end_time}
                </span>
              </div>
            </div>

            {requestedProcedureName && (
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium truncate" title={requestedProcedureName}>
                  {requestedProcedureName}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-3 text-sm">
              {appointment.patient_phone && (
                <a
                  href={`tel:${appointment.patient_phone}`}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {appointment.patient_phone}
                </a>
              )}
              {appointment.patient_email && (
                <a
                  href={`mailto:${appointment.patient_email}`}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {appointment.patient_email}
                </a>
              )}
            </div>

            {appointment.notes && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="line-clamp-2">{appointment.notes}</p>
              </div>
            )}

            {appointment.patient_id &&
              (appointment.patient_confirmation_status === "pending" || appointment.status === "pending") && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-300">
                  Waiting for patient acceptance.
                </div>
              )}

            <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Start requests</span>
                <span className="font-medium">
                  Doctor {startState.doctorRequested ? "✓" : "—"} • Patient{" "}
                  {appointment.patient_id ? (startState.patientRequested ? "✓" : "—") : "(direct)"}
                </span>
              </div>
              <div className="mt-1">{startButtonHint}</div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            {canInteractNow && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Button onClick={handleRequestOrStart} disabled={isStarting} className="w-full gap-2" size="lg">
                  <Play className="h-4 w-4" />
                  {startButtonLabel}
                </Button>
              </motion.div>
            )}

            {!canInteractNow && (
              <div className="text-xs text-muted-foreground">
                Start requests are available on the appointment day, starting 15 minutes before the scheduled time.
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleViewPatient} className="gap-2">
                <User className="h-4 w-4" />
                View Patient
              </Button>
              <Button variant="outline" onClick={handleMessage} className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Message
              </Button>
            </div>

            {isDentist && (
              <Button
                variant="secondary"
                onClick={() => {
                  navigate(`/appointment-session/${appointment.id}?tab=dental`);
                  onClose();
                }}
                className="w-full gap-2"
              >
                <Stethoscope className="h-4 w-4" />
                Open Dental Chart
              </Button>
            )}
          </div>

          <Separator />

          <div className={cn("flex items-center justify-between text-sm", isRTL && "flex-row-reverse")}>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button variant="link" size="sm" onClick={onOpenFullModal} className="gap-1">
              More Details
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);

AppointmentQuickPreview.displayName = "AppointmentQuickPreview";

export default AppointmentQuickPreview;
