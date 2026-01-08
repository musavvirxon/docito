import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { Calendar, CheckCircle, Clock, Download, MapPin, Printer, User } from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Details = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  status: string | null;
  doctor?: {
    id: string;
    specialty: string | null;
    profiles?: { full_name: string | null } | null;
    practices?: { name: string | null; address: string | null; city: string | null; country: string | null } | null;
  } | null;
};

export default function BookingConfirmation() {
  const { appointmentId } = useParams();
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<Details | null>(null);

  useEffect(() => {
    if (!appointmentId) return;

    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("appointments")
          .select(
            `
            id,
            appointment_date,
            start_time,
            end_time,
            notes,
            status,
            doctor:doctor_id(
              id,
              specialty,
              profiles:user_id(full_name),
              practices:practice_id(name,address,city,country)
            )
          `
          )
          .eq("id", appointmentId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setDetails(null);
          return;
        }
        setDetails(data as any);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to load appointment confirmation");
      } finally {
        setLoading(false);
      }
    })();
  }, [appointmentId]);

  const location = useMemo(() => {
    const p = details?.doctor?.practices;
    return [p?.name, p?.address, p?.city, p?.country].filter(Boolean).join(", ");
  }, [details]);

  const handlePrint = () => window.print();

  const downloadIcs = () => {
    if (!details) return;
    const start = new Date(`${details.appointment_date}T${details.start_time}`);
    const end = new Date(`${details.appointment_date}T${details.end_time}`);
    const title = `Appointment - ${details.doctor?.profiles?.full_name || "Doctor"}`;
    const desc = details.notes ? details.notes.replace(/\n/g, "\\n") : "";
    const dt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MedicalBook//EN",
      "BEGIN:VEVENT",
      `UID:${details.id}@medicalbook`,
      `DTSTAMP:${dt(new Date())}`,
      `DTSTART:${dt(start)}`,
      `DTEND:${dt(end)}`,
      `SUMMARY:${escapeIcs(title)}`,
      `DESCRIPTION:${escapeIcs(desc)}`,
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

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-8 flex items-center justify-center">
                <Loader />
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-destructive mb-2">Appointment Not Found</h1>
            <p className="text-muted-foreground mb-6">We couldn't find the appointment you're looking for.</p>
            <Link to="/">
              <Button>Return Home</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const doctorName = details.doctor?.profiles?.full_name || "Doctor";
  const specialty = details.doctor?.specialty || "";

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                Appointment Confirmed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {details.status && <Badge variant="secondary">{details.status}</Badge>}
                <Badge variant="outline">ID: {details.id}</Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{doctorName}</div>
                    {specialty && <div className="text-sm text-muted-foreground">{specialty}</div>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(details.appointment_date), "PPP")}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {details.start_time} – {details.end_time}
                  </span>
                </div>

                {location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{location}</span>
                  </div>
                )}
              </div>

              {details.notes && (
                <>
                  <Separator />
                  <div>
                    <div className="font-medium mb-2">Notes</div>
                    <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{details.notes}</pre>
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
                <Link to="/patient-dashboard">
                  <Button>Go to Dashboard</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function escapeIcs(value: string) {
  return (value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function Loader() {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      Loading...
    </div>
  );
}
