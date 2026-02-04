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

type ProcedureInfo = {
  id: string;
  name: string;
  category: string | null;
  default_cost: number | null;
  price: number | null;
};

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

  // ✅ NEW (nullable / optional for backward compatibility)
  procedure_id?: string | null;
  procedure?: ProcedureInfo | null;
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

  // ✅ NEW
  procedure_id?: string | null;
  procedure?: ProcedureInfo | null;
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

function formatMoney(n: number) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
  } catch {
    return `$${n}`;
  }
}

export default function BookingConfirmation() {
  const { appointmentId: holdId } = useParams(); // hold_id OR an appointment_id fallback
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

  const [requestedProcedure, setRequestedProcedure] = useState<ProcedureInfo | null>(null);

  // Load hold details (or confirmed appointment fallback)
  useEffect(() => {
    if (!holdId) return;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        // 1) Try to fetch as a HOLD including procedure (new schema)
        let hold: any = null;

        const q1 = await (supabase as any)
          .from("appointment_holds")
          .select(
            `
            id,
            patient_id,
            doctor_id,
            practice_id,
            start_at,
            end_at,
            appointment_type,
            notes,
            status,
            expires_at,
            procedure_id,
            procedure:procedure_id(id,name,category,default_cost,price)
          `
          )
          .eq("id", holdId)
          .maybeSingle();

        if (!q1.error) {
          hold = q1.data;
        } else {
          // fallback if procedure_id column doesn't exist yet
          const q2 = await (supabase as any)
            .from("appointment_holds")
            .select("id, patient_id, doctor_id, practice_id, start_at, end_at, appointment_type, notes, status, expires_at")
            .eq("id", holdId)
            .maybeSingle();

          if (q2.error) throw q2.error;
          hold = q2.data;
        }

        if (hold) {
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

          // Store hold
          setHoldDetails(hold as HoldDetails);

          // Store requested procedure (if present)
          const procFromHold = (hold as any)?.procedure ?? null;
          if (procFromHold?.id && procFromHold?.name) {
            setRequestedProcedure({
              id: String(procFromHold.id),
              name: String(procFromHold.name),
              category: procFromHold.category ?? null,
              default_cost: procFromHold.default_cost == null ? null : Number(procFromHold.default_cost),
              price: procFromHold.price == null ? null : Number(procFromHold.price),
            });
          } else if ((hold as any)?.procedure_id) {
            // procedure_id exists but join not available -> fetch directly
            const pid = String((hold as any).procedure_id);
            const { data: p } = await supabase
              .from("procedures")
              .select("id,name,category,default_cost,price")
              .eq("id", pid)
              .maybeSingle();

            if (p?.id && (p as any).name) {
              setRequestedProcedure({
                id: String((p as any).id),
                name: String((p as any).name),
                category: (p as any).category ?? null,
                default_cost: (p as any).default_cost == null ? null : Number((p as any).default_cost),
                price: (p as any).price == null ? null : Number((p as any).price),
              });
            } else {
              setRequestedProcedure(null);
            }
          } else {
            setRequestedProcedure(null);
          }

          // Fetch doctor details
          const { data: doctor } = await supabase
            .from("doctors")
            .select(
              `
              id,
              specialty,
              profiles:user_id(full_name),
              practices:practice_id(name,address,city,country)
            `
            )
            .eq("id", hold.doctor_id)
            .maybeSingle();

          if (doctor) setDoctorInfo(doctor as any);
          return;
        }

        // 2) Not a hold -> maybe already confirmed appointment
        let appointment: any = null;

        const a1 = await supabase
          .from("appointments")
          .select(
            `
            id,
            appointment_date,
            start_time,
            end_time,
            appointment_type,
            procedure_id,
            procedure:procedure_id(id,name,category,default_cost,price),
            doctor:doctor_id(
              id,
              specialty,
              profiles:user_id(full_name),
              practices:practice_id(name,address,city,country)
            )
          `
          )
          .eq("id", holdId)
          .maybeSingle();

        if (!a1.error) {
          appointment = a1.data;
        } else {
          // fallback if procedure_id missing
          const a2 = await supabase
            .from("appointments")
            .select(
              `
              id,
              appointment_date,
              start_time,
              end_time,
              appointment_type,
              doctor:doctor_id(
                id,
                specialty,
                profiles:user_id(full_name),
                practices:practice_id(name,address,city,country)
              )
            `
            )
            .eq("id", holdId)
            .maybeSingle();

          if (a2.error) throw a2.error;
          appointment = a2.data;
        }

        if (appointment) {
          setConfirmed(true);
          setConfirmedAppointment({
            id: appointment.id,
            appointment_date: appointment.appointment_date,
            start_time: appointment.start_time,
            end_time: appointment.end_time,
            appointment_type: appointment.appointment_type,
            procedure_id: (appointment as any)?.procedure_id ?? null,
            procedure: (appointment as any)?.procedure ?? null,
          });

          setDoctorInfo((appointment as any).doctor ?? null);

          const proc = (appointment as any)?.procedure ?? null;
          if (proc?.id && proc?.name) {
            setRequestedProcedure({
              id: String(proc.id),
              name: String(proc.name),
              category: proc.category ?? null,
              default_cost: proc.default_cost == null ? null : Number(proc.default_cost),
              price: proc.price == null ? null : Number(proc.price),
            });
          } else {
            setRequestedProcedure(null);
          }
        } else {
          setError({
            title: "Booking Not Found",
            message: "We couldn't find this booking. It may have expired or been canceled.",
          });
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

      // Fetch appointment to show procedure (if any)
      try {
        const { data: ap } = await supabase
          .from("appointments")
          .select("id, procedure_id, procedure:procedure_id(id,name,category,default_cost,price)")
          .eq("id", data.appointment_id)
          .maybeSingle();

        const proc = (ap as any)?.procedure ?? null;
        if (proc?.id && proc?.name) {
          setRequestedProcedure({
            id: String(proc.id),
            name: String(proc.name),
            category: proc.category ?? null,
            default_cost: proc.default_cost == null ? null : Number(proc.default_cost),
            price: proc.price == null ? null : Number(proc.price),
          });
        }
      } catch {
        // ignore
      }

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

        setClinicalItems((data.items ?? []) as ClinicalItem[]);
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

  const handlePrint = () => window.print();

  const downloadIcs = () => {
    if (!confirmedAppointment) return;
    const start = new Date(`${confirmedAppointment.appointment_date}T${confirmedAppointment.start_time}`);
    const end = new Date(`${confirmedAppointment.appointment_date}T${confirmedAppointment.end_time}`);
    const title = `Appointment - ${doctorInfo?.profiles?.full_name || "Doctor"}`;
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

  const requestedProcedureCost = useMemo(() => {
    if (!requestedProcedure) return null;
    const c = requestedProcedure.default_cost ?? requestedProcedure.price;
    return c == null ? null : Number(c);
  }, [requestedProcedure]);

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

                {/* ✅ NEW: requested procedure */}
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ClipboardList className="h-4 w-4" />
                    <span className="text-sm">Requested procedure</span>
                  </div>
                  {requestedProcedure ? (
                    <div className="text-sm">
                      <div className="font-medium">{requestedProcedure.name}</div>
                      {requestedProcedureCost != null && (
                        <div className="text-muted-foreground">{formatMoney(requestedProcedureCost)}</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No specific procedure requested.</div>
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
            <Alert>
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Confirm Your Appointment</AlertTitle>
              <AlertDescription>
                Please confirm your appointment within the time limit. Your slot is held for{" "}
                {timeRemaining || "a limited time"}.
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

                {/* ✅ NEW: requested procedure */}
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ClipboardList className="h-4 w-4" />
                    <span className="text-sm">Requested procedure</span>
                  </div>
                  {requestedProcedure ? (
                    <div className="text-sm">
                      <div className="font-medium">{requestedProcedure.name}</div>
                      {requestedProcedureCost != null && (
                        <div className="text-muted-foreground">{formatMoney(requestedProcedureCost)}</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No specific procedure requested.</div>
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
