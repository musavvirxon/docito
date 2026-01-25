// File: src/pages/BookingConfirmation.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { AlertCircle, Calendar, Clock, Loader2, MapPin, Video, MessageSquare, Building2, User } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ✅ Keep ONLY the premium navbar
import PremiumNavbar from "@/components/layout/PremiumNavbar";

type AppointmentRow = {
  id: string;
  appointment_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  notes: string | null;
  appointment_type: string | null;
  created_at: string | null;

  patient_id: string | null;
  doctor_id: string | null;
  entity_id: string | null;
};

type DoctorInfo = {
  id: string;
  profile_full_name: string | null;
  specialty: string | null;
  practice_name: string | null;
  practice_address: string | null;
};

function typeMeta(t: string | null | undefined) {
  const s = String(t || "").toLowerCase().trim();
  if (s.includes("video")) return { label: "Video call", Icon: Video };
  if (s.includes("message") || s.includes("chat")) return { label: "Messaging", Icon: MessageSquare };
  if (s.includes("person") || s.includes("clinic") || s.includes("office")) return { label: "In-person", Icon: MapPin };
  return { label: "Appointment", Icon: Calendar };
}

export default function BookingConfirmation() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<AppointmentRow | null>(null);
  const [doctor, setDoctor] = useState<DoctorInfo | null>(null);
  const [entityName, setEntityName] = useState<string>("");

  const { label: apptLabel, Icon: ApptIcon } = useMemo(
    () => typeMeta(appointment?.appointment_type),
    [appointment?.appointment_type],
  );

  useEffect(() => {
    const load = async () => {
      if (!appointmentId) return;

      setLoading(true);
      try {
        const { data: a, error: aErr } = await supabase
          .from("appointments")
          .select(
            "id, appointment_date, start_time, end_time, status, notes, appointment_type, created_at, patient_id, doctor_id, entity_id",
          )
          .eq("id", appointmentId)
          .maybeSingle();

        if (aErr) throw aErr;
        if (!a) {
          setAppointment(null);
          setDoctor(null);
          setEntityName("");
          return;
        }

        const appt = a as any;
        setAppointment(appt);

        // Entity name (clinic/practice)
        if (appt.entity_id) {
          const { data: ent } = await supabase
            .from("entities")
            .select("name")
            .eq("id", appt.entity_id)
            .maybeSingle();
          if (ent?.name) setEntityName(ent.name);
        }

        // Doctor info
        if (appt.doctor_id) {
          const { data: d } = await supabase
            .from("doctors")
            .select("id, specialty, practice_id, user_id")
            .eq("id", appt.doctor_id)
            .maybeSingle();

          if (d) {
            const doc = d as any;

            let profile_full_name: string | null = null;
            if (doc.user_id) {
              const { data: p } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("user_id", doc.user_id)
                .maybeSingle();
              profile_full_name = (p as any)?.full_name ?? null;
            }

            let practice_name: string | null = null;
            let practice_address: string | null = null;
            if (doc.practice_id) {
              const { data: pr } = await supabase
                .from("practices")
                .select("name, address")
                .eq("id", doc.practice_id)
                .maybeSingle();
              practice_name = (pr as any)?.name ?? null;
              practice_address = (pr as any)?.address ?? null;
            }

            setDoctor({
              id: String(doc.id),
              profile_full_name,
              specialty: doc.specialty ?? null,
              practice_name,
              practice_address,
            });
          }
        }
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? "Failed to load booking details");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [appointmentId]);

  const dtText = useMemo(() => {
    if (!appointment?.appointment_date || !appointment?.start_time) return null;
    // appointment_date: YYYY-MM-DD, start_time: HH:mm:ss or HH:mm
    const iso = `${appointment.appointment_date}T${appointment.start_time}`;
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return null;
    return format(d, "EEEE, MMMM d, yyyy");
  }, [appointment?.appointment_date, appointment?.start_time]);

  const timeText = useMemo(() => {
    if (!appointment?.appointment_date || !appointment?.start_time) return null;
    const isoStart = `${appointment.appointment_date}T${appointment.start_time}`;
    const s = parseISO(isoStart);
    if (Number.isNaN(s.getTime())) return null;

    if (appointment?.end_time) {
      const isoEnd = `${appointment.appointment_date}T${appointment.end_time}`;
      const e = parseISO(isoEnd);
      if (!Number.isNaN(e.getTime())) return `${format(s, "h:mm a")} – ${format(e, "h:mm a")}`;
    }

    return format(s, "h:mm a");
  }, [appointment?.appointment_date, appointment?.start_time, appointment?.end_time]);

  return (
    <div className="min-h-screen bg-background">
      <PremiumNavbar />

      <main className="container max-w-3xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading booking confirmation...
          </div>
        ) : !appointment ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Booking not found.</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Booking confirmation</h1>
              <p className="text-muted-foreground">Your appointment has been scheduled.</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ApptIcon className="h-5 w-5" />
                  Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{apptLabel}</Badge>
                  {appointment.status ? <Badge variant="outline">{appointment.status}</Badge> : null}
                </div>

                <div className="space-y-2">
                  {doctor?.profile_full_name ? (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Dr. {doctor.profile_full_name}</span>
                      {doctor.specialty ? (
                        <span className="text-muted-foreground text-sm">• {doctor.specialty}</span>
                      ) : null}
                    </div>
                  ) : null}

                  {entityName || doctor?.practice_name ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{doctor?.practice_name || entityName}</span>
                    </div>
                  ) : null}

                  {doctor?.practice_address ? (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5" />
                      <span>{doctor.practice_address}</span>
                    </div>
                  ) : null}

                  {dtText ? (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{dtText}</span>
                    </div>
                  ) : null}

                  {timeText ? (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{timeText}</span>
                    </div>
                  ) : null}
                </div>

                {appointment.notes ? (
                  <div className="pt-2 border-t">
                    <div className="text-sm font-medium mb-1">Notes</div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">{appointment.notes}</div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={() => navigate("/patient-dashboard")} className="flex-1">
                Go to dashboard
              </Button>
              <Button onClick={() => navigate(`/appointments/${appointment.id}`)} className="flex-1">
                View appointment
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
