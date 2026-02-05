// File: src/pages/BookingConfirmation.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { parseISO } from "date-fns";
import {
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { TimezoneNotice } from "@/components/time/TimezoneNotice";
import { formatAppointmentForViewer, getAppointmentUtcRange } from "@/lib/appointmentTime";
import { formatDateInTimeZone, formatTimeInTimeZone, getEffectiveTimeZone } from "@/lib/timezone";
import { supabase } from "@/integrations/supabase/client";

type HoldDetails = {
  id: string;
  doctor_id: string;
  practice_id: string | null;
  appointment_type: "clinic" | "lab" | "imaging" | "pharmacy";
  start_at: string; // timestamptz
  end_at: string; // timestamptz
  expires_at: string; // timestamptz
  status: "active" | "expired" | "confirmed" | "cancelled";
  notes?: string | null;
};

type ConfirmedAppointment = {
  id: string;
  doctor_id: string;
  practice_id: string | null;
  appointment_type: "clinic" | "lab" | "imaging" | "pharmacy";
  appointment_date: string; // date
  start_time: string; // time
  end_time: string; // time
  notes?: string | null;
};

type DoctorInfo = {
  id: string;
  specialty?: string | null;
  profiles?: { full_name: string | null; timezone?: string | null } | null;
  practices?: {
    name?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
};

type ClinicalItem = {
  id: string;
  item_type: "diagnosis" | "treatment" | "note" | "procedure";
  title: string;
  details?: string | null;
};

const escapeIcs = (str: string) => str.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

function extractRequestedProcedure(notes?: string | null) {
  if (!notes) return { requested: null as string | null, remaining: null as string | null };

  const lines = notes.split("\n");
  const idx = lines.findIndex((l) => l.toLowerCase().startsWith("requested procedure:"));
  if (idx === -1) return { requested: null, remaining: notes };

  const requested = lines[idx].split(":").slice(1).join(":").trim() || null;
  const remaining = [...lines.slice(0, idx), ...lines.slice(idx + 1)].join("\n").trim() || null;

  return { requested, remaining };
}

export default function BookingConfirmation() {
  const { holdId } = useParams<{ holdId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const viewerTimeZone = useMemo(() => getEffectiveTimeZone((profile as any)?.timezone), [profile]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [holdDetails, setHoldDetails] = useState<HoldDetails | null>(null);
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
  const [confirming, setConfirming] = useState(false);

  const [confirmedAppointment, setConfirmedAppointment] = useState<ConfirmedAppointment | null>(null);
  const [clinicalItems, setClinicalItems] = useState<ClinicalItem[]>([]);
  const [clinicalLoading, setClinicalLoading] = useState(false);

  const [patientNotes, setPatientNotes] = useState<string>("");

  const confirmed = Boolean(confirmedAppointment);

  const loadHold = useCallback(async () => {
    if (!holdId) return;

    setLoading(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;

      if (!accessToken) {
        throw new Error("You must be signed in to view booking details.");
      }

      const { data, error: fnErr } = await supabase.functions.invoke("appointment-hold", {
        body: { action: "get", hold_id: holdId },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (fnErr) throw fnErr;
      if (!data?.ok) throw new Error(data?.error || "Failed to load booking hold.");

      const hold = data.data as HoldDetails;
      setHoldDetails(hold);
      setPatientNotes(hold.notes ?? "");

      const { data: doc, error: docErr } = await supabase
        .from("doctors")
        .select(
          `
          id,
          specialty,
          profiles:user_id(full_name,timezone),
          practices:practice_id(name,address,city,country)
        `,
        )
        .eq("id", hold.doctor_id)
        .maybeSingle();

      if (docErr) throw docErr;
      setDoctorInfo((doc ?? null) as any);
    } catch (e: any) {
      console.error(e);
      setError({
        title: "Unable to Load Booking",
        message: e?.message || "Something went wrong loading your booking. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [holdId]);

  useEffect(() => {
    loadHold();
  }, [loadHold]);

  // If hold already confirmed (e.g., refresh after confirm), try to load appointment record
  useEffect(() => {
    const run = async () => {
      if (!holdDetails) return;
      if (holdDetails.status !== "confirmed") return;

      try {
        const { data, error: apptErr } = await supabase
          .from("appointments")
          .select(
            `
            id,
            doctor_id,
            practice_id,
            appointment_type,
            appointment_date,
            start_time,
            end_time,
            notes,
            doctor:doctor_id(
              id,
              specialty,
              profiles:user_id(full_name,timezone),
              practices:practice_id(name,address,city,country)
            )
          `,
          )
          .eq("id", holdDetails.id)
          .maybeSingle();

        if (apptErr) throw apptErr;

        if (data) {
          const appt = data as any;

          setConfirmedAppointment({
            id: appt.id,
            doctor_id: appt.doctor_id,
            practice_id: appt.practice_id,
            appointment_type: appt.appointment_type,
            appointment_date: appt.appointment_date,
            start_time: appt.start_time,
            end_time: appt.end_time,
            notes: appt.notes ?? holdDetails.notes ?? null,
          });

          if (appt.doctor) setDoctorInfo(appt.doctor as any);
        }
      } catch (e) {
        // soft-fail; still show hold info
      }
    };

    run();
  }, [holdDetails]);

  const confirmAppointment = useCallback(async () => {
    if (!holdId) return;
    if (!user) {
      toast.error("You must be signed in to confirm your booking.");
      return;
    }

    setConfirming(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;

      if (!accessToken) throw new Error("Missing session token");

      const { data, error } = await supabase.functions.invoke("confirm-appointment", {
        body: { hold_id: holdId, notes: patientNotes || null },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to confirm your appointment.");

      setConfirmedAppointment({
        id: data.appointment_id,
        doctor_id: data.doctor_id,
        practice_id: data.practice_id,
        appointment_type: data.appointment_type,
        appointment_date: data.appointment_date,
        start_time: data.start_time,
        end_time: data.end_time,
        notes: holdDetails?.notes ?? null,
      });

      toast.success("Appointment confirmed successfully!");
    } catch (e: any) {
      console.error(e);
      setError({
        title: "Confirmation Failed",
        message: e?.message || "Failed to confirm your appointment. Please try again.",
      });
    } finally {
      setConfirming(false);
    }
  }, [holdId, user, patientNotes, holdDetails?.notes]);

  // Fetch clinical items (confirmed appointment only)
  useEffect(() => {
    const run = async () => {
      if (!confirmedAppointment?.id) return;

      setClinicalLoading(true);
      try {
        const { data: session } = await supabase.auth.getSession();
        const accessToken = session.session?.access_token;

        if (!accessToken) {
          setClinicalItems([]);
          return;
        }

        const { data, error } = await supabase.functions.invoke("appointment-clinical-items", {
          body: { action: "list", appointment_id: confirmedAppointment.id },
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error || "Failed to load clinical items");

        setClinicalItems((data.data ?? []) as ClinicalItem[]);
      } catch (e: any) {
        console.error(e);
        setClinicalItems([]);
      } finally {
        setClinicalLoading(false);
      }
    };

    run();
  }, [confirmedAppointment?.id]);

  const location = useMemo(() => {
    const p = doctorInfo?.practices;
    return [p?.name, p?.address, p?.city, p?.country].filter(Boolean).join(", ");
  }, [doctorInfo]);

  const notesSource = useMemo(() => {
    if (confirmed) return confirmedAppointment?.notes ?? holdDetails?.notes ?? null;
    return holdDetails?.notes ?? null;
  }, [confirmed, confirmedAppointment?.notes, holdDetails?.notes]);

  const { requested: requestedProcedure, remaining: remainingNotes } = useMemo(() => {
    return extractRequestedProcedure(notesSource);
  }, [notesSource]);

  const handlePrint = () => window.print();

  const downloadIcs = () => {
    if (!confirmedAppointment) return;

    const sourceTimeZone = getEffectiveTimeZone((doctorInfo as any)?.profiles?.timezone || "");
    const { startUtc, endUtc } = getAppointmentUtcRange(confirmedAppointment as any, sourceTimeZone);
    const safeEndUtc = endUtc ?? new Date(startUtc.getTime() + 30 * 60 * 1000);

    const base = `Appointment - ${doctorInfo?.profiles?.full_name || "Doctor"}`;
    const title = requestedProcedure ? `${base} (${requestedProcedure})` : base;

    const dt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MedicalBook//EN",
      "BEGIN:VEVENT",
      `UID:${confirmedAppointment.id}@medicalbook`,
      `DTSTAMP:${dt(new Date())}`,
      `DTSTART:${dt(startUtc)}`,
      `DTEND:${dt(safeEndUtc)}`,
      `SUMMARY:${escapeIcs(title)}`,
      location ? `LOCATION:${escapeIcs(location)}` : "",
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .filter(Boolean)
      .join("\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "appointment.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate time remaining for hold
  const timeRemaining = useMemo(() => {
    if (!holdDetails?.expires_at) return null;
    const expires = new Date(holdDetails.expires_at).getTime();
    const now = Date.now();
    const diff = expires - now;
    if (diff <= 0) return "Expired";
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, [holdDetails?.expires_at]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-3xl py-12">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading booking details...
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-3xl py-12 space-y-6">
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>{error.title}</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button variant="outline" onClick={loadHold}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button onClick={() => navigate("/patient/dashboard")}>Go to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!holdDetails) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-3xl py-12">
          <Alert>
            <AlertTitle>Not Found</AlertTitle>
            <AlertDescription>The booking you requested could not be found.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // HOLD VIEW
  if (!confirmed) {
    const startTime = parseISO(holdDetails.start_at);
    const endTime = parseISO(holdDetails.end_at);

    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-3xl py-12 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Confirm Your Booking
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-lg font-semibold">{doctorInfo?.profiles?.full_name || "Doctor"}</p>
                  {doctorInfo?.specialty && (
                    <p className="text-sm text-muted-foreground">{doctorInfo.specialty}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{holdDetails.appointment_type}</Badge>
                  {timeRemaining && (
                    <Badge variant="outline" className="text-amber-600">
                      Expires in: {timeRemaining}
                    </Badge>
                  )}
                </div>

                <TimezoneNotice timeZone={viewerTimeZone} />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDateInTimeZone(startTime, viewerTimeZone)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatTimeInTimeZone(startTime, viewerTimeZone)} – {formatTimeInTimeZone(endTime, viewerTimeZone)}
                  </span>
                </div>

                {location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{location}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium">Notes</p>
                    <p className="text-sm text-muted-foreground">
                      Add any details for the provider (optional).
                    </p>
                  </div>
                </div>

                <Textarea
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  placeholder="e.g., reason for visit, symptoms, requested procedure..."
                  className="min-h-[120px]"
                />

                {requestedProcedure && (
                  <div className="text-sm">
                    <span className="font-medium">Requested procedure:</span>{" "}
                    <span className="text-muted-foreground">{requestedProcedure}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={confirmAppointment} disabled={confirming} className="flex-1">
                  {confirming ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    "Confirm Appointment"
                  )}
                </Button>
                <Button variant="outline" onClick={() => navigate("/patient/dashboard")} className="flex-1">
                  Cancel
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                By confirming, you agree to the clinic’s policies. Your hold will expire automatically if not confirmed
                in time.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // CONFIRMED VIEW
  if (!confirmedAppointment) return null;

  const renderClinicalItems = () => {
    if (clinicalLoading) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading clinical details...
        </div>
      );
    }

    if (clinicalItems.length === 0) {
      return <p className="text-sm text-muted-foreground">No clinical items recorded.</p>;
    }

    return (
      <div className="space-y-3">
        {clinicalItems.map((item) => (
          <div key={item.id} className="p-3 rounded-md border border-border/60">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{item.title}</p>
              <Badge variant="outline" className="capitalize">
                {item.item_type}
              </Badge>
            </div>
            {item.details && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{item.details}</p>}
          </div>
        ))}
      </div>
    );
  };

  const renderConfirmed = () => {
    const doctorName = doctorInfo?.profiles?.full_name || "Doctor";
    const specialty = doctorInfo?.specialty || "";
    const sourceTimeZone = getEffectiveTimeZone((doctorInfo as any)?.profiles?.timezone || "");
    const { dateLabel, timeLabel } = formatAppointmentForViewer({
      appt: confirmedAppointment,
      sourceTimeZone,
      viewerTimeZone,
      includeEnd: true,
    });

    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-3xl py-12 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Booking Confirmed
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-lg font-semibold">{doctorName}</p>
                  {specialty && <p className="text-sm text-muted-foreground">{specialty}</p>}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Confirmed</Badge>
                  <Badge variant="outline">{confirmedAppointment.appointment_type}</Badge>
                </div>

                <TimezoneNotice timeZone={viewerTimeZone} />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{dateLabel}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{timeLabel}</span>
                </div>

                {location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{location}</span>
                  </div>
                )}
              </div>

              {(requestedProcedure || remainingNotes) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">Notes</p>
                    </div>

                    {requestedProcedure && (
                      <div className="text-sm">
                        <span className="font-medium">Requested procedure:</span>{" "}
                        <span className="text-muted-foreground">{requestedProcedure}</span>
                      </div>
                    )}

                    {remainingNotes && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{remainingNotes}</p>
                    )}
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-2">
                <p className="font-medium">Clinical Items</p>
                {renderClinicalItems()}
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={downloadIcs} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Add to Calendar (.ics)
                </Button>

                <Button variant="outline" onClick={handlePrint} className="flex-1">
                  Print
                </Button>

                <Button onClick={() => navigate("/patient/dashboard")} className="flex-1">
                  Go to Dashboard
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Need to make changes? Please contact the clinic directly.
              </p>
            </CardContent>
          </Card>

          <div className="text-center">
            <Link to="/find-doctors" className="text-sm text-primary hover:underline">
              Book another appointment
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return renderConfirmed();
}
