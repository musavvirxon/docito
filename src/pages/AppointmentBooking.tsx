import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
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
import { toast } from "sonner";

type DoctorInfo = {
  id: string;
  specialty: string;
  consultation_fee: number | null;
  practice_id: string | null;
  profiles: {
    full_name: string;
    phone: string | null;
    email: string | null;
  } | null;
  practices: {
    name: string;
    address: string | null;
  } | null;
};

type AvailabilitySlot = {
  start_at: string; // YYYY-MM-DDTHH:MM:SS
  end_at: string;   // YYYY-MM-DDTHH:MM:SS
  available: boolean;
  reason?: string | null;
};

const DURATION_OPTIONS_MINUTES = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180];

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function AppointmentBooking() {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState<DoctorInfo | null>(null);

  const [loadingDoctor, setLoadingDoctor] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [durationMinutes, setDurationMinutes] = useState<number>(30);

  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlotStart, setSelectedSlotStart] = useState<string>("");

  // Patient details (ONLY phone is required; others optional)
  const [patientPhone, setPatientPhone] = useState<string>("");
  const [patientName, setPatientName] = useState<string>("");
  const [patientEmail, setPatientEmail] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Prefill email/phone from profile when logged in (optional convenience)
  useEffect(() => {
    const prefill = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) return;

      if (user.email) setPatientEmail(user.email);

      const { data: profile } = await supabase
        .from("profiles")
        .select("phone")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.phone) setPatientPhone(profile.phone);
    };

    prefill().catch(console.error);
  }, []);

  // Load doctor
  useEffect(() => {
    const loadDoctor = async () => {
      if (!doctorId) return;

      setLoadingDoctor(true);
      try {
        const { data, error } = await supabase
          .from("doctors")
          .select(
            `
            id,
            specialty,
            consultation_fee,
            practice_id,
            profiles:user_id ( full_name, phone, email ),
            practices:practice_id ( name, address )
          `
          )
          .eq("id", doctorId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setDoctor(null);
          return;
        }

        setDoctor(data as DoctorInfo);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? "Failed to load doctor");
        setDoctor(null);
      } finally {
        setLoadingDoctor(false);
      }
    };

    loadDoctor();
  }, [doctorId]);

  // Load availability slots using Edge Function (service-role reads all blocks/appointments)
  useEffect(() => {
    const loadSlots = async () => {
      if (!doctorId) return;

      setLoadingSlots(true);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");

        const { data, error } = await supabase.functions.invoke("get-availability", {
          body: {
            provider_id: doctorId,
            entity_id: doctor?.practice_id ?? undefined,
            from: dateStr,
            to: dateStr,
            duration_minutes: durationMinutes,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const newSlots: AvailabilitySlot[] = (data?.slots ?? []) as AvailabilitySlot[];
        setSlots(newSlots);

        // If the selected slot is no longer available, clear it
        const stillAvailable = newSlots.some((s) => s.available && s.start_at === selectedSlotStart);
        if (selectedSlotStart && !stillAvailable) setSelectedSlotStart("");
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? "Failed to load availability");
        setSlots([]);
        setSelectedSlotStart("");
      } finally {
        setLoadingSlots(false);
      }
    };

    loadSlots();
  }, [doctorId, doctor?.practice_id, selectedDate, durationMinutes, selectedSlotStart]);

  const availableSlots = useMemo(() => {
    const seen = new Set<string>();
    return slots
      .filter((s) => s.available)
      .filter((s) => {
        if (seen.has(s.start_at)) return false;
        seen.add(s.start_at);
        return true;
      });
  }, [slots]);

  const canBook = Boolean(selectedSlotStart) && Boolean(patientPhone.trim()) && !booking;

  const handleBook = async () => {
    if (!doctorId) return;

    const phone = patientPhone.trim();
    if (!phone) {
      toast.error("Phone number is required");
      return;
    }

    if (!selectedSlotStart) {
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

    setBooking(true);
    try {
      // Best-effort: save phone to profile (if profile exists + RLS allows)
      try {
        await supabase.from("profiles").update({ phone }).eq("user_id", user.id);
      } catch {
        // ignore
      }

      // Always capture phone in notes so the doctor can see it even if profile isn't readable.
      const combinedNotes = [
        phone ? `Phone: ${phone}` : null,
        patientName.trim() ? `Name: ${patientName.trim()}` : null,
        patientEmail.trim() ? `Email: ${patientEmail.trim()}` : null,
        notes.trim() ? notes.trim() : null,
      ]
        .filter(Boolean)
        .join("\n");

      const { data, error } = await supabase.functions.invoke("book-appointment", {
        body: {
          patient_id: user.id,
          entity_id: doctor?.practice_id ?? undefined,
          provider_id: doctorId,
          slot_start: selectedSlotStart,
          duration_minutes: durationMinutes,
          notes: combinedNotes || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const appointmentId = data?.appointment_id || data?.id;
      if (!appointmentId) throw new Error("Booking succeeded but no appointment id returned");

      toast.success("Appointment booked!");
      navigate(`/booking-confirmation/${appointmentId}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to book appointment");
    } finally {
      setBooking(false);
    }
  };

  if (loadingDoctor) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading doctor...
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <Alert className="max-w-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Doctor not found.</AlertDescription>
          </Alert>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container max-w-5xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Book an appointment</h1>
            <p className="text-muted-foreground">
              Choose a date, a start time, and the appointment duration. Only phone is required.
            </p>
          </div>

          {/* Doctor summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>{doctor.profiles?.full_name ?? "Doctor"}</span>
                <Badge variant="secondary">{doctor.specialty}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {doctor.practices?.name ?? "Practice"}
                  {doctor.practices?.address ? ` • ${doctor.practices.address}` : ""}
                </span>
              </div>
              {typeof doctor.consultation_fee === "number" && (
                <div className="text-muted-foreground">
                  Consultation fee: <span className="font-medium text-foreground">${doctor.consultation_fee}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: date + duration */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Date & Duration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm">Appointment duration</Label>
                  <Select value={String(durationMinutes)} onValueChange={(v) => setDurationMinutes(Number(v))}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS_MINUTES.map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {formatDuration(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Duration is the only required appointment detail (besides phone).
                  </p>
                </div>

                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  // Disable dates before today (but allow today)
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            {/* Middle: time slots */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Available times
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-6">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading available slots...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No available slots for {format(selectedDate, "PPP")} (try another date or duration).
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableSlots.map((slot) => {
                      const selected = selectedSlotStart === slot.start_at;
                      const label = format(parseISO(slot.start_at), "HH:mm");
                      return (
                        <Button
                          key={slot.start_at}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          onClick={() => setSelectedSlotStart(slot.start_at)}
                          className="justify-center"
                        >
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: patient details */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Patient details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="e.g. +998 90 123 45 67"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Name (optional)</Label>
                  <Input
                    id="name"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Reason for visit, symptoms, special instructions..."
                    className="min-h-[110px]"
                  />
                </div>

                <Button
                  type="button"
                  className="w-full"
                  onClick={handleBook}
                  disabled={!canBook}
                >
                  {booking ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Booking...
                    </span>
                  ) : (
                    "Confirm booking"
                  )}
                </Button>

                {!selectedSlotStart && (
                  <p className="text-xs text-muted-foreground">
                    Select a time slot to enable booking.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
