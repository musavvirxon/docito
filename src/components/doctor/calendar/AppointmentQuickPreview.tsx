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
  Download,
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
import { useMessageAction } from "@/hooks/useMessageAction";
import { isDentalSpecialty } from "@/lib/clinicalSpecialties";
import { useAppointmentSummaryPdf } from "@/hooks/useAppointmentSummaryPdf";
import { AppointmentFinancePanel } from "@/components/appointments/AppointmentFinancePanel";
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

const typeI18nKeys: Record<string, string> = {
  in_person: "inPerson",
  "in-person": "inPerson",
  video: "videoCall",
  home_visit: "homeVisit",
  home: "homeVisit",
  messaging: "messaging",
  chat: "messaging",
  follow_up: "followUp",
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
    const { t, i18n } = useTranslation("dashboard");
    const { user, activeRole } = useAuth();
    const isPatient = activeRole === "patient";
    const navigate = useNavigate();
    const { startConversation, loading: isMessaging } = useMessageAction();
    const [isStarting, setIsStarting] = useState(false);
    const [showDiagnosisForm, setShowDiagnosisForm] = useState(false);
    const [diagnosisTitle, setDiagnosisTitle] = useState("");
    const [icdCode, setIcdCode] = useState("");
    const [diagnosisNotes, setDiagnosisNotes] = useState("");
    const [savingDiagnosis, setSavingDiagnosis] = useState(false);
    const isRTL = i18n.language === "ar";
    const { downloadSummary, loading: pdfLoading } = useAppointmentSummaryPdf();

    const tp = useCallback((key: string) => t(`appointmentPreview.${key}`), [t]);

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
    const typeKey = typeI18nKeys[appointmentType as keyof typeof typeI18nKeys] || "inPerson";
    const typeLabel = tp(typeKey);

    const startState = useMemo(() => {
      const doctorRequested = Boolean(appointment?.start_requested_by_doctor);
      const patientRequested = Boolean(appointment?.start_requested_by_patient);
      const patientAccepted = appointment?.patient_id
        ? appointment?.patient_confirmation_status === "confirmed" || appointment?.status === "confirmed"
        : true;
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

    const canInteractNow = useMemo(() => {
      if (!appointment || !appointmentTime) return false;
      const now = new Date();
      return isToday && now >= new Date(appointmentTime.getTime() - 15 * 60 * 1000);
    }, [appointment, appointmentTime, isToday]);

    const startButtonLabel = startState.canStart
      ? appointmentType === "video"
        ? tp("startVideoAppointment")
        : tp("startAppointment")
      : tp("requestToStart");

    const startButtonHint = useMemo(() => {
      if (!appointment) return "";
      if (!appointment.patient_id) {
        return startState.doctorRequested ? tp("startHintDirectReady") : tp("startHintDirect");
      }
      if (!startState.patientAccepted) return tp("startHintPatientMustAccept");
      if (!startState.doctorRequested || !startState.patientRequested) return tp("startHintBothMustRequest");
      return tp("startHintReady");
    }, [appointment, startState, tp]);

    const handleRequestOrStart = useCallback(async () => {
      if (!appointment) return;

      setIsStarting(true);
      try {
        const { data, error } = await supabase.functions.invoke("request-start-appointment", {
          body: { appointment_id: appointment.id },
        });

        if (error) throw error;

        if (data?.can_start) {
          if ((appointment.appointment_type || "in_person") === "video") {
            const room = data?.consultation?.room_id || data?.consultation?.room_url;
            if (room) {
              toast.success(tp("startingVideoConsultation"));
              onStartSession(appointment);
              onClose();
              navigate(`/video/${room}`);
              return;
            }
          }

          toast.success(tp("appointmentStarted"));
          onStartSession(appointment);
          onClose();
          navigate(`/appointment-session/${appointment.id}`);
          return;
        }

        toast.success(tp("startRequestSent"));
      } catch (err: any) {
        console.error("Error requesting/starting appointment:", err);
        toast.error(err?.message ?? tp("failedToStart"));
      } finally {
        setIsStarting(false);
      }
    }, [appointment, navigate, onClose, onStartSession, tp]);

    const handleViewPatient = useCallback(() => {
      if (!appointment) return;
      if (!patientId) {
        toast.error(tp("patientInfoUnavailable"));
        return;
      }
      onViewPatient(patientId, patientType);
      onClose();
    }, [appointment, onViewPatient, onClose, patientId, patientType, tp]);

    const handleMessage = useCallback(async () => {
      if (!appointment) return;
      try {
        if (!appointment.patient_id) {
          toast.error(tp("messagingRegisteredOnly"));
          return;
        }
        const conversationId = await startConversation(appointment.patient_id);
        if (!conversationId) return;
        onClose();
      } catch (error) {
        console.error("Error starting conversation:", error);
        toast.error(tp("failedConversation"));
      }
    }, [appointment, onClose, startConversation, tp]);

    const handleSaveDiagnosis = useCallback(async () => {
      if (!appointment || !diagnosisTitle.trim()) {
        toast.error(tp("diagnosisRequired"));
        return;
      }
      setSavingDiagnosis(true);
      try {
        if (!appointment.doctor_id || !user?.id) {
          throw new Error("Doctor context is missing");
        }

        const { error } = await supabase.from("appointment_diagnoses").insert({
          appointment_id: appointment.id,
          doctor_id: appointment.doctor_id,
          created_by: user.id,
          diagnosis_title: diagnosisTitle.trim(),
          icd10_code: icdCode.trim() || null,
          notes: diagnosisNotes.trim() || null,
          patient_id: appointment.patient_id || null,
          doctor_patient_id: (appointment as any).doctor_patient_id || null,
        });
        if (error) throw error;
        toast.success(tp("diagnosisAdded"));
        setDiagnosisTitle("");
        setIcdCode("");
        setDiagnosisNotes("");
        setShowDiagnosisForm(false);
      } catch (err: any) {
        console.error("Save diagnosis error:", err);
        toast.error(err?.message || tp("failedDiagnosis"));
      } finally {
        setSavingDiagnosis(false);
      }
    }, [appointment, diagnosisTitle, icdCode, diagnosisNotes, user?.id, tp]);

    if (!appointment) return null;

    const initials =
      appointment.patient_name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "P";

    const isDentist = isDentalSpecialty(doctorSpecialty);
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
                  {tp("waitingForPatient")}
                </div>
              )}

            <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>{tp("startRequests")}</span>
                <span className="font-medium">
                  {tp("doctor")} {startState.doctorRequested ? "✓" : "—"} • {tp("patient")}{" "}
                  {appointment.patient_id ? (startState.patientRequested ? "✓" : "—") : tp("direct")}
                </span>
              </div>
              <div className="mt-1">{startButtonHint}</div>
            </div>
          </div>

          {/* Diagnosis Section - hidden for patients */}
          {!isPatient && (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => setShowDiagnosisForm(!showDiagnosisForm)}
              >
                <Plus className="h-4 w-4" />
                {tp("addDiagnosis")}
              </Button>

              {showDiagnosisForm && (
                <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
                  <Input
                    placeholder={tp("diagnosisTitle")}
                    value={diagnosisTitle}
                    onChange={(e) => setDiagnosisTitle(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder={tp("icdCode")}
                    value={icdCode}
                    onChange={(e) => setIcdCode(e.target.value)}
                    className="text-sm"
                  />
                  <Textarea
                    placeholder={tp("notes")}
                    value={diagnosisNotes}
                    onChange={(e) => setDiagnosisNotes(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveDiagnosis}
                      disabled={savingDiagnosis || !diagnosisTitle.trim()}
                      className="flex-1 gap-1"
                    >
                      {savingDiagnosis && <Loader2 className="h-3 w-3 animate-spin" />}
                      {tp("save")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowDiagnosisForm(false)}
                    >
                      {tp("cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            {/* Primary Start Appointment button - always visible when interaction is allowed */}
            {canInteractNow && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Button onClick={handleRequestOrStart} disabled={isStarting} className="w-full gap-2" size="lg">
                  {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {isStarting ? tp("startingAppointment") : startButtonLabel}
                </Button>
              </motion.div>
            )}

            {!canInteractNow && (
              <div className="text-xs text-muted-foreground">
                {tp("startAvailableInfo")}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleViewPatient} className="gap-2">
                <User className="h-4 w-4" />
                {tp("viewPatient")}
              </Button>
              <Button variant="outline" onClick={handleMessage} className="gap-2" disabled={isMessaging}>
                <MessageSquare className="h-4 w-4" />
                {tp("message")}
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadSummary(appointment)}
              disabled={pdfLoading}
              className="w-full gap-2"
            >
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {tp("downloadSummary") === "appointmentPreview.downloadSummary" ? "Download Summary" : tp("downloadSummary")}
            </Button>

            {!isPatient && appointment?.id && (
              <AppointmentFinancePanel
                appointmentId={appointment.id}
                patientId={appointment.patient_id || undefined}
              />
            )}

            <Button
              variant="secondary"
              onClick={() => {
                navigate(`/appointment-session/${appointment.id}${isDentist ? "?tab=dental" : ""}`);
                onClose();
              }}
              className="w-full gap-2"
            >
              <Stethoscope className="h-4 w-4" />
              {tp("appointmentSession") === "appointmentPreview.appointmentSession" ? "Appointment Session" : tp("appointmentSession")}
            </Button>
          </div>

          <Separator />

          <div className={cn("flex items-center justify-between text-sm", isRTL && "flex-row-reverse")}>
            <Button variant="ghost" size="sm" onClick={onClose}>
              {tp("close")}
            </Button>
            <Button variant="link" size="sm" onClick={onOpenFullModal} className="gap-1">
              {tp("moreDetails")}
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
