import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { AlertCircle, Calendar as CalendarIcon, Clock, Loader2, MapPin } from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { appointmentApi } from "@/lib/api/supabase-api";
import { toast } from "sonner";

type WorkingHours = {
  enabled: boolean;
  start_time: string;
  end_time: string;
  breaks: { start_time: string; end_time: string; name: string }[];
};

type ScheduleSettings = {
  working_days: Record<string, WorkingHours>;
  buffer_time: number;
  holidays: string[];
};

const DEFAULT_SCHEDULE: ScheduleSettings = {
  working_days: {
    monday: { enabled: true, start_time: "09:00", end_time: "17:00", breaks: [{ start_time: "12:00", end_time: "13:00", name: "Lunch" }] },
    tuesday: { enabled: true, start_time: "09:00", end_time: "17:00", breaks: [{ start_time: "12:00", end_time: "13:00", name: "Lunch" }] },
    wednesday: { enabled: true, start_time: "09:00", end_time: "17:00", breaks: [{ start_time: "12:00", end_time: "13:00", name: "Lunch" }] },
    thursday: { enabled: true, start_time: "09:00", end_time: "17:00", breaks: [{ start_time: "12:00", end_time: "13:00", name: "Lunch" }] },
    friday: { enabled: true, start_time: "09:00", end_time: "17:00", breaks: [{ start_time: "12:00", end_time: "13:00", name: "Lunch" }] },
    saturday: { enabled: false, start_time: "10:00", end_time: "14:00", breaks: [] },
    sunday: { enabled: false, start_time: "10:00", end_time: "14:00", breaks: [] },
  },
  buffer_time: 15,
  holidays: [],
};

type DoctorInfo = {
  id: string;
  specialty: string | null;
  practice_id: string | null;
  consultation_fee: number | null;
  profiles?: { full_name: string | null; avatar_url: string | null; email: string | null } | null;
  practices?: { name: string | null; city: string | null; country: string | null; address: string | null } | null;
};

type Procedure = {
  id: string;
  name: string;
  duration_minutes: number | null;
  price: number | null;
  description: string | null;
};

type Slot = { time: string; endTime: string; status: "available" | "booked" | "blocked" | "break" };

export default function AppointmentBooking() {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [doctor, setDoctor] = useState<DoctorInfo | null>(null);
  const [schedule, setSchedule] = useState<ScheduleSettings>(DEFAULT_SCHEDULE);
  const [procedures, setProcedures] = useState<Procedure[]>([]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [procedureId, setProcedureId] = useState<string>("");
  const selectedProcedure = useMemo(
    () => procedures.find((p) => p.id === procedureId) || null,
    [procedures, procedureId]
  );

  const [timeSlots, setTimeSlots] = useState<Slot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>("");

  const [patientName, setPatientName] = useState<string>("");
  const [patientEmail, setPatientEmail] = useState<string>("");
  const [purposeOfVisit, setPurposeOfVisit] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Prefill patient info from auth
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setPatientEmail(data.user.email || "");
        setPatientName(data.user.user_metadata?.full_name || "");
      }
    })();
  }, []);

  // Load doctor + procedures + schedule
  useEffect(() => {
    if (!doctorId) return;
    (async () => {
      setLoading(true);
      try {
        const [{ data: doc, error: docErr }, { data: sched }] = await Promise.all([
          supabase
            .from("doctors")
            .select(
              `
              id,
              specialty,
              practice_id,
              consultation_fee,
              profiles:user_id(full_name, avatar_url, email),
              practices:practice_id(name, city, country, address)
            `
            )
            .eq("id", doctorId)
            .maybeSingle(),
          supabase.from("schedule_settings").select("*").eq("doctor_id", doctorId).maybeSingle(),
        ]);

        if (docErr) throw docErr;
        if (!doc) {
          toast.error("Doctor not found");
          navigate("/");
          return;
        }
        setDoctor(doc as any);

        if (sched) {
          setSchedule({
            working_days: (sched.working_days as any) || DEFAULT_SCHEDULE.working_days,
            buffer_time: typeof sched.buffer_time === "number" ? sched.buffer_time : DEFAULT_SCHEDULE.buffer_time,
            holidays: sched.holidays || [],
          });
        } else {
          setSchedule(DEFAULT_SCHEDULE);
        }

        const { data: procs, error: procErr } = await supabase
          .from("procedures")
          .select("id,name,duration_minutes,price,description")
          .eq("dentist_id", doctorId)
          .eq("is_active", true)
          .eq("is_bookable", true)
          .order("name");

        if (procErr) throw procErr;
        setProcedures((procs as any) || []);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to load booking details");
      } finally {
        setLoading(false);
      }
    })();
  }, [doctorId, navigate]);

  // Load slots when date or procedure changes
  useEffect(() => {
    if (!doctorId || !selectedProcedure) {
      setTimeSlots([]);
      setSelectedTime("");
      return;
    }

    (async () => {
      const dateString = format(selectedDate, "yyyy-MM-dd");
      try {
        const [{ data: appts }, { data: blocked }] = await Promise.all([
          supabase
            .from("appointments")
            .select("*")
            .eq("doctor_id", doctorId)
            .eq("appointment_date", dateString)
            .neq("status", "canceled"),
          supabase.from("blocked_times").select("*").eq("doctor_id", doctorId).eq("blocked_date", dateString),
        ]);

        const slots = generateSlots({
          selectedDate,
          schedule,
          procedureMinutes: selectedProcedure.duration_minutes || 30,
          bufferMinutes: schedule.buffer_time || 0,
          appointments: appts || [],
          blockedTimes: blocked || [],
        });

        setTimeSlots(slots);
        // if previously selected time is no longer available, clear it
        if (!slots.some((s) => s.status === "available" && s.time === selectedTime)) {
          setSelectedTime("");
        }
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to load time slots");
      }
    })();
  }, [doctorId, selectedDate, selectedProcedure, schedule, selectedTime]);

  const handleBook = async () => {
    if (!doctorId) return;
    if (!selectedProcedure) {
      toast.error("Please select a procedure");
      return;
    }
    if (!selectedTime) {
      toast.error("Please select a time slot");
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) {
      toast.error("Please sign in to book an appointment");
      navigate(`/auth?returnTo=${encodeURIComponent(`/book-appointment/${doctorId}`)}`);
      return;
    }

    setSubmitting(true);
    try {
      const startTime = selectedTime;
      const endTime = addMinutesToTime(startTime, selectedProcedure.duration_minutes || 30);
      const appointmentDate = format(selectedDate, "yyyy-MM-dd");

      const fullNotes = [
        purposeOfVisit ? `Purpose: ${purposeOfVisit}` : null,
        notes ? `Notes: ${notes}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const res = await appointmentApi.bookAppointment({
        doctor_id: doctorId,
        patient_id: user.id,
        practice_id: doctor?.practice_id || undefined,
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTime,
        notes: fullNotes || undefined,
      });

      if ("error" in res) return;
      navigate(`/booking-confirmation/${res.data.id}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to book appointment");
    } finally {
      setSubmitting(false);
    }
  };

  const doctorName = doctor?.profiles?.full_name || "Doctor";
  const doctorLocation = [doctor?.practices?.name, doctor?.practices?.city, doctor?.practices?.country]
    .filter(Boolean)
    .join(", ");

  const isHoliday = schedule.holidays?.includes(format(selectedDate, "yyyy-MM-dd"));

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-3xl mx-auto">
            <CardContent className="p-10 flex items-center justify-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading booking details...
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (!doctorId || !doctor) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Doctor not found.</AlertDescription>
          </Alert>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Doctor summary */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Appointment with {doctorName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {doctor.specialty && <Badge variant="secondary">{doctor.specialty}</Badge>}
              {doctorLocation && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{doctorLocation}</span>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                Consultation fee:{" "}
                <span className="font-medium text-foreground">
                  {doctor.consultation_fee ? `${doctor.consultation_fee}` : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Booking form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Book an appointment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Procedure */}
              <div className="space-y-2">
                <Label>Procedure</Label>
                <Select value={procedureId} onValueChange={(v) => setProcedureId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a procedure" />
                  </SelectTrigger>
                  <SelectContent>
                    {procedures.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        No bookable procedures found
                      </SelectItem>
                    ) : (
                      procedures.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.duration_minutes ? `(${p.duration_minutes} min)` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedProcedure?.description && (
                  <p className="text-xs text-muted-foreground">{selectedProcedure.description}</p>
                )}
              </div>

              {/* Date + slots */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Select date
                  </Label>
                  <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} className="rounded-md border" />
                  {isHoliday && (
                    <Alert>
                      <AlertDescription>This date is marked as a holiday. Slots may be unavailable.</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Available time slots
                  </Label>

                  {!selectedProcedure ? (
                    <div className="text-sm text-muted-foreground">Select a procedure to view available time slots.</div>
                  ) : timeSlots.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No slots available for this date.</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {timeSlots
                        .filter((s) => s.status === "available")
                        .map((s) => (
                          <Button
                            key={s.time}
                            type="button"
                            variant={selectedTime === s.time ? "default" : "outline"}
                            onClick={() => setSelectedTime(s.time)}
                          >
                            {s.time}
                          </Button>
                        ))}
                    </div>
                  )}

                  {selectedProcedure && timeSlots.some((s) => s.status !== "available") && (
                    <div className="text-xs text-muted-foreground">
                      Some times are unavailable due to bookings, blocks, or breaks.
                    </div>
                  )}
                </div>
              </div>

              {/* Patient info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Your name" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} placeholder="you@email.com" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Purpose of visit</Label>
                <Input value={purposeOfVisit} onChange={(e) => setPurposeOfVisit(e.target.value)} placeholder="e.g., cleaning, pain, consultation..." />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={() => navigate(-1)}>
                  Back
                </Button>
                <Button type="button" onClick={handleBook} disabled={submitting || !selectedProcedure || !selectedTime}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    "Confirm booking"
                  )}
                </Button>
              </div>

              {!selectedTime && selectedProcedure && (
                <p className="text-xs text-muted-foreground">Choose a time slot to enable booking.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function generateSlots(opts: {
  selectedDate: Date;
  schedule: ScheduleSettings;
  procedureMinutes: number;
  bufferMinutes: number;
  appointments: any[];
  blockedTimes: any[];
}): Slot[] {
  const { selectedDate, schedule, procedureMinutes, bufferMinutes, appointments, blockedTimes } = opts;

  const dayName = format(selectedDate, "EEEE").toLowerCase();
  const daySchedule = schedule.working_days[dayName];
  if (!daySchedule?.enabled) return [];

  const startMinutes = timeToMinutes(daySchedule.start_time);
  const endMinutes = timeToMinutes(daySchedule.end_time);
  let current = startMinutes;
  const slots: Slot[] = [];

  while (current < endMinutes) {
    const slotStart = current;
    const procedureEnd = slotStart + procedureMinutes;
    const bufferEnd = procedureEnd + bufferMinutes;

    if (procedureEnd > endMinutes) break;

    // Breaks
    const br = daySchedule.breaks?.find((b) => timesOverlap(slotStart, bufferEnd, timeToMinutes(b.start_time), timeToMinutes(b.end_time)));
    if (br) {
      slots.push({ time: br.start_time, endTime: br.end_time, status: "break" });
      current = timeToMinutes(br.end_time);
      continue;
    }

    // Blocked
    const bl = blockedTimes.find((bt) => timesOverlap(slotStart, bufferEnd, timeToMinutes(bt.start_time), timeToMinutes(bt.end_time)));
    if (bl) {
      slots.push({ time: bl.start_time, endTime: bl.end_time, status: "blocked" });
      current = timeToMinutes(bl.end_time);
      continue;
    }

    // Appointments
    const ap = appointments.find((a) => timesOverlap(slotStart, procedureEnd, timeToMinutes(a.start_time), timeToMinutes(a.end_time)));
    if (ap) {
      slots.push({ time: ap.start_time, endTime: ap.end_time, status: "booked" });
      current = timeToMinutes(ap.end_time);
      continue;
    }

    slots.push({ time: minutesToTime(slotStart), endTime: minutesToTime(procedureEnd), status: "available" });
    current = bufferEnd;
  }

  return slots;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
  return start1 < end2 && end1 > start2;
}

function addMinutesToTime(startTime: string, minutesToAdd: number): string {
  const base = timeToMinutes(startTime);
  return minutesToTime(base + minutesToAdd);
}
