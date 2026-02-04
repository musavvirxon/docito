// File: src/pages/BookingConfirmation.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  Calendar,
  CheckCircle,
  Clock,
  Download,
  MapPin,
  Printer,
  User,
  AlertTriangle,
  Loader2,
  XCircle,
  ClipboardList,
} from "lucide-react";

import PremiumTopNav from "@/components/home/premium/PremiumTopNav";
import PremiumFooter from "@/components/home/premium/PremiumFooter";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type HoldDetails = {
  id: string;
  patient_id: string;
  doctor_id: string;
  practice_id: string | null;
  start_at: string;
  end_at: string;
  appointment_type: string;
  notes: string | null;
  status: string;
  expires_at: string;
};

type DoctorInfo = {
  id: string;
  specialty: string | null;
  profiles?: { full_name: string | null } | null;
  practices?: { name: string | null; address: string | null; city: string | null; country: string | null } | null;
};

type ConfirmedAppointment = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  appointment_type: string;
  notes: string | null;
};

type ClinicalItem = {
  id: string;
  appointment_id: string;
  item_type: string;
  title: string;
  details: any;
  created_at: string;
  updated_at: string;
};

function extractRequestedProcedure(notes: string | null | undefined): { requested: string | null; remaining: string | null } {
  if (!notes) return { requested: null, remaining: null };

  const lines = notes.split(/\r?\n/);
  let requested: string | null = null;
  const kept: string[] = [];

  for (const line of lines) {
    const m = line.match(/^Requested Procedure:\s*(.+)\s*$/i);
    if (m && !requested) {
      requested = (m[1] || "").trim() || null;
      continue;
    }
    kept.push(line);
  }

  const remaining = kept.join("\n").trim();
  return { requested, remaining: remaining ? remaining : null };
}

export default function BookingConfirmation() {
  const { appointmentId: holdId } = useParams(); // This is actually a hold_id OR an appointment_id fallback
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [holdDetails, setHoldDetails] = useState<HoldDetails | null>(null);
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState<ConfirmedAppointment | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  const [clinicalLoading, setClinicalLoading] = useState(false);
  const [clinicalItems, setClinicalItems] = useState<ClinicalItem[]>([]);

  // Load hold details (or confirmed appointment fallback)
  useEffect(() => {
    if (!holdId) return;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        // First try to fetch as a hold
        const { data: hold, error: holdErr } = await (supabase as any)
          .from("appointment_holds")
          .select("id, patient_id, doctor_id, practice_id, start_at, end_at, appointment_type, notes, status, expires_at")
          .eq("id", holdId)
          .maybeSingle();

        if (holdErr) throw holdErr;

        if (hold) {
          // Check if hold is still valid
          const expiresAt = new Date(hold.expires_at);
          if (expiresAt.getTime() < Date.now()) {
            setError({
              title: "Booking Expired",
              message: "Your booking hold has expired. Please try booking again.",
            });
            return;
          }

          if (hold.status !== "pending") {
            setError({
              title: "Booking Already Processed",
              message: "This booking has already been confirmed or canceled.",
            });
            return;
          }

          setHoldDetails(hold);

          // Fetch doctor details
          const { data: doctor } = await supabase
            .from("doctors")
            .select(
              `
              id,
              specialty,
              profiles:user_id(full_name),
              practices:practice_id(name,address,city,country)
            `,
            )
            .eq("id", hold.doctor_id)
            .maybeSingle();

          if (doctor) {
            setDoctorInfo(doctor as any);
          }
        } else {
          // Maybe it was already confirmed - check appointments
          const { data: appointment } = await supabase
            .from("appointments")
            .select(
              `
              id,
              appointment_date,
              start_time,
              end_time,
              appointment_type,
              notes,
              doctor:doctor_id(
                id,
                specialty,
                profiles:user_id(full_name),
                practices:practice_id(name,address,city,country)
              )
            `,
            )
            .eq("id", holdId)
            .maybeSingle();

          if (appointment) {
            setConfirmed(true);
            setConfirmedAppointment({
              id: appointment.id,
              appointment_date: appointment.appointment_date,
              start_time: appointment.start_time,
              end_time: appointment.end_time,
              appointment_type: appointment.appointment_type,
              notes: (appointment as any).notes ?? null,
            });
            setDoctorInfo((appointment as any).doctor);
          } else {
            setError({
              title: "Booking Not Found",
              message: "We couldn't find this booking. It may have expired or been canceled.",
            });
          }
        }
      } catch (e: any) {
        console.error(e);
        setError({
          title: "Error Loading Booking",
          message: e?.message || "Failed to load booking details. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [holdId]);

  const confirmAppointment = useCallback(async () => {
    if (!holdId || !user) return;

    setConfirming(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;

      if (!accessToken) {
        toast.error("Please sign in to confirm your appointment");
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke("confirm-appointment", {
        body: { hold_id: holdId },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (fnError) throw fnError;

      if (!data?.ok) {
        const code = data?.code;
        if (code === "SLOT_TAKEN") {
          setError({
            title: "Slot No Longer Available",
            message: "Unfortunately, this time slot has been taken by another patient. Please choose a different time.",
          });
          // Delete the hold automatically after showing error
          await (supabase as any).from("appointment_holds").delete().eq("id", holdId);
        } else if (code === "HOLD_EXPIRED") {
          setError({
            title: "Booking Expired",
            message: "Your booking hold has expired. Please try booking again.",
          });
        } else {
          throw new Error(data?.error || "Failed to confirm appointment");
        }
        return;
      }

      setConfirmed(true);
      setConfirmedAppointment({
        id: data.appointment_id,
        appointment_date: data.appointment_date,
        start_time: data.start_time,
        end_time: data.end_time,
        appointment_type: data.appointment_type,
        // We don't get notes back from confirm fn; keep hold notes so we can show requested procedure
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
  }, [holdId, user, holdDetails?.notes]);

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
        // soft-fail: booking confirmation should still render
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
    const start = new Date(`${confirmedAppointment.appointment_date}T${confirmedAppointment.start_time}`);
    const end = new Date(`${confirmedAppointment.appointment_date}T${confirmedAppointment.end_time}`);
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
      `DTSTART:${dt(start)}`,
      `DTEND:${dt(end)}`,
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
        <PremiumTopNav />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-8 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading booking details...
              </CardContent>
            </Card>
          </div>
        </div>
        <PremiumFooter />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <PremiumTopNav />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="max-w-2xl mx-auto space-y-6">
            <Alert variant="destructive">
              <XCircle className="h-5 w-5" />
              <AlertTitle>{error.title}</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Go Back
              </Button>
              <Link to="/">
                <Button>Return Home</Button>
              </Link>
            </div>
          </div>
        </div>
        <PremiumFooter />
      </div>
    );
  }

  // Confirmed state
  if (confirmed && confirmedAppointment) {
    const doctorName = doctorInfo?.profiles?.full_name || "Doctor";
    const specialty = doctorInfo?.specialty || "";

    return (
      <div className="min-h-screen bg-background">
        <PremiumTopNav />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="max-w-2xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  Appointment Confirmed!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Confirmed</Badge>
                  <Badge variant="outline">{confirmedAppointment.appointment_type}</Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Dr. {doctorName}</div>
                      {specialty && <div className="text-sm text-muted-foreground">{specialty}</div>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(confirmedAppointment.appointment_date), "EEEE, MMMM d, yyyy")}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {confirmedAppointment.start_time.slice(0, 5)} – {confirmedAppointment.end_time.slice(0, 5)}
                    </span>
                  </div>

                  {location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{location}</span>
                    </div>
                  )}
                </div>

                {requestedProcedure && (
                  <>
                    <Separator />
                    <div className="rounded-lg border p-3 bg-muted/30">
                      <div className="font-medium flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Requested procedure
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">{requestedProcedure}</div>
                    </div>
                  </>
                )}

                {remainingNotes && (
                  <>
                    <Separator />
                    <div>
                      <div className="font-medium mb-2">Notes</div>
                      <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{remainingNotes}</pre>
                    </div>
                  </>
                )}

                <Separator />

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <Button variant="outline" onClick={downloadIcs}>
                    <Download className="h-4 w-4 mr-2" />
                    Download .ics
                  </Button>
                  <Link to="/patient/dashboard">
                    <Button>Go to Dashboard</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Clinical items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {clinicalLoading ? (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading clinical items...
                  </div>
                ) : clinicalItems.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No clinical items have been added yet.</div>
                ) : (
                  <div className="space-y-3">
                    {clinicalItems.map((it) => (
                      <div key={it.id} className="rounded-lg border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium">{it.title}</div>
                          <Badge variant="secondary">{it.item_type}</Badge>
                        </div>
                        {it.details && Object.keys(it.details || {}).length > 0 && (
                          <pre className="mt-2 text-xs whitespace-pre-wrap text-muted-foreground">
                            {JSON.stringify(it.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        <PremiumFooter />
      </div>
    );
  }

  // Pending confirmation state - show hold details with confirm button
  if (holdDetails) {
    const startTime = parseISO(holdDetails.start_at);
    const endTime = parseISO(holdDetails.end_at);
    const doctorName = doctorInfo?.profiles?.full_name || "Doctor";
    const specialty = doctorInfo?.specialty || "";

    return (
      <div className="min-h-screen bg-background">
        <PremiumTopNav />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="max-w-2xl mx-auto space-y-6">
            <Alert>
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Confirm Your Appointment</AlertTitle>
              <AlertDescription>
                Please confirm your appointment within the time limit. Your slot is held for {timeRemaining || "a limited time"}.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-6 w-6 text-amber-600" />
                  Pending Confirmation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{holdDetails.appointment_type}</Badge>
                  {timeRemaining && (
                    <Badge variant="outline" className="text-amber-600">
                      Expires in: {timeRemaining}
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Dr. {doctorName}</div>
                      {specialty && <div className="text-sm text-muted-foreground">{specialty}</div>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(startTime, "EEEE, MMMM d, yyyy")}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(startTime, "h:mm a")} – {format(endTime, "h:mm a")}
                    </span>
                  </div>

                  {location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{location}</span>
                    </div>
                  )}
                </div>

                {requestedProcedure && (
                  <>
                    <Separator />
                    <div className="rounded-lg border p-3 bg-muted/30">
                      <div className="font-medium flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Requested procedure
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">{requestedProcedure}</div>
                    </div>
                  </>
                )}

                {remainingNotes && (
                  <>
                    <Separator />
                    <div>
                      <div className="font-medium mb-2">Notes</div>
                      <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{remainingNotes}</pre>
                    </div>
                  </>
                )}

                <Separator />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => navigate(-1)} disabled={confirming}>
                    Cancel
                  </Button>
                  <Button onClick={confirmAppointment} disabled={confirming} className="flex-1">
                    {confirming ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirm Appointment
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Clinical items
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Clinical items will appear here after your appointment is confirmed.
              </CardContent>
            </Card>
          </div>
        </div>
        <PremiumFooter />
      </div>
    );
  }

  return null;
}

function escapeIcs(value: string) {
  return (value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
