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

  // NEW
  procedure_id?: string | null;
  procedures?: {
    id: string;
    name: string;
    category: string | null;
    price: number | null;
    default_cost: number | null;
    estimated_duration_minutes: number | null;
    duration_minutes: number | null;
  } | null;
};

type DoctorInfo = {
  id: string;
  specialty?: string | null;
  profiles?: {
    full_name?: string | null;
  } | null;
};

type ConfirmedAppointment = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  appointment_type: string;
};

type ClinicalItemType = "procedure" | "medication" | "treatment_plan";

type ClinicalItem = {
  id: string;
  appointment_id: string;
  doctor_id: string;
  patient_id: string | null;
  doctor_patient_id: string | null;
  template_id: string | null;
  type: ClinicalItemType;
  name: string;
  description: string | null;
  details: any | null;
  item_type: string;
  title: string;
  created_at: string;
};

export default function BookingConfirmation() {
  const { holdId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [holdDetails, setHoldDetails] = useState<HoldDetails | null>(null);
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
  const [location, setLocation] = useState<string>("");

  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState<ConfirmedAppointment | null>(null);

  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  const [clinicalItems, setClinicalItems] = useState<ClinicalItem[]>([]);
  const [clinicalLoading, setClinicalLoading] = useState(false);

  // Load hold details
  useEffect(() => {
    const run = async () => {
      try {
        if (!holdId) {
          setError({ title: "Invalid Link", message: "Missing booking ID." });
          return;
        }

        setLoading(true);

        const { data: hold, error: holdErr } = await supabase
          .from("appointment_holds")
          .select(
            "id, patient_id, doctor_id, practice_id, start_at, end_at, appointment_type, notes, status, expires_at, procedure_id, procedures:procedure_id(id, name, category, price, default_cost, estimated_duration_minutes, duration_minutes)"
          )
          .eq("id", holdId)
          .maybeSingle();

        if (holdErr) throw holdErr;

        if (!hold) {
          setError({
            title: "Booking Not Found",
            message: "This booking hold no longer exists. Please book again.",
          });
          return;
        }

        setHoldDetails(hold as any);

        // Doctor info
        const { data: doctor } = await supabase
          .from("doctors")
          .select("id, specialty, profiles:user_id(full_name)")
          .eq("id", (hold as any).doctor_id)
          .maybeSingle();

        setDoctorInfo((doctor as any) ?? null);

        // Practice location (optional)
        if ((hold as any).practice_id) {
          const { data: practice } = await supabase
            .from("practices")
            .select("id, name, address")
            .eq("id", (hold as any).practice_id)
            .maybeSingle();

          const addr = (practice as any)?.address ? String((practice as any).address) : "";
          setLocation(addr);
        } else {
          setLocation("");
        }
      } catch (e: any) {
        console.error(e);
        setError({
          title: "Failed to Load Booking",
          message: e?.message || "Could not load booking details.",
        });
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [holdId]);

  const confirmAppointment = useCallback(async () => {
    try {
      if (!holdId) return;

      if (!user) {
        toast.error("Please sign in to confirm your appointment");
        return;
      }

      setConfirming(true);
      setError(null);

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
  }, [holdId, user]);

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
      } catch (e) {
        console.error(e);
        setClinicalItems([]);
      } finally {
        setClinicalLoading(false);
      }
    };

    run();
  }, [confirmedAppointment?.id]);

  const handlePrint = () => window.print();

  const downloadIcs = () => {
    if (!confirmedAppointment) return;

    const doctorName = doctorInfo?.profiles?.full_name || "Doctor";
    const start = new Date(`${confirmedAppointment.appointment_date}T${confirmedAppointment.start_time}`);
    const end = new Date(`${confirmedAppointment.appointment_date}T${confirmedAppointment.end_time}`);

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MedicalBook//Appointment//EN",
      "BEGIN:VEVENT",
      `SUMMARY:Appointment with Dr. ${doctorName}`,
      `DTSTART:${start.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTEND:${end.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      location ? `LOCATION:${location}` : "",
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

            <div className="flex gap-2">
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

  // Pending confirmation state
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
            {!confirmed && (
              <Alert>
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle>Confirm Your Appointment</AlertTitle>
                <AlertDescription>
                  Please confirm your appointment within the time limit. Your slot is held for{" "}
                  {timeRemaining || "a limited time"}.
                </AlertDescription>
              </Alert>
            )}

            {!confirmed && (
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

                    {holdDetails.procedures?.name && (
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        <span>Requested: {holdDetails.procedures.name}</span>
                      </div>
                    )}

                    {location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{location}</span>
                      </div>
                    )}
                  </div>

                  {holdDetails.notes && (
                    <>
                      <Separator />
                      <div>
                        <div className="font-medium mb-2">Notes</div>
                        <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{holdDetails.notes}</pre>
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
                        "Confirm Appointment"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Confirmed state */}
            {confirmed && confirmedAppointment && (
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

                    {holdDetails?.procedures?.name && (
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        <span>Requested: {holdDetails.procedures.name}</span>
                      </div>
                    )}

                    {location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{location}</span>
                      </div>
                    )}
                  </div>

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
                    <Link to="/">
                      <Button>Return Home</Button>
                    </Link>
                  </div>

                  <Separator />

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <ClipboardList className="h-5 w-5" />
                        Clinical Items
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {clinicalLoading ? (
                        <div className="flex items-center text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading clinical items...
                        </div>
                      ) : clinicalItems.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No clinical items yet.</div>
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
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        <PremiumFooter />
      </div>
    );
  }

  return null;
}
