import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { AlertCircle, AlertTriangle, Calendar as CalendarIcon, Clock, Loader2, MapPin, Video, MessageSquare, Building2 } from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
  start_at: string; // YYYY-MM-DDTHH:MM
  end_at: string; // YYYY-MM-DDTHH:MM
  available: boolean;
  reason?: string | null;
};

type AppointmentType = "video" | "messaging" | "in-person";

const DURATION_OPTIONS_MINUTES = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180];

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const isSameMinuteOrPast = (isoLocal: string, nowMs: number) => {
  const t = parseISO(isoLocal).getTime();
  return Number.isFinite(t) ? t <= nowMs : true;
};

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
  const [appointmentType, setAppointmentType] = useState<AppointmentType>("video");

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

      const { data: profile } = await supabase.from("profiles").select("phone").eq("user_id", user.id).maybeSingle();

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
          `,
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
            appointment_type: appointmentType,
            procedure_duration_minutes: durationMinutes,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const newSlots: AvailabilitySlot[] = (data?.slots ?? []) as AvailabilitySlot[];
        setSlots(newSlots);

        const nowMs = Date.now() + 60_000; // 1-minute safety buffer
        const stillAvailable = newSlots.some((s) => s.available && s.start_at === selectedSlotStart && !isSameMinuteOrPast(s.start_at, nowMs));
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
  }, [doctorId, doctor?.practice_id, selectedDate, durationMinutes, selectedSlotStart, appointmentType]);

  const availableSlots = useMemo(() => {
    const nowMs = Date.now() + 60_000; // 1-minute safety buffer
    const seen = new Set<string>();

    return slots
      .filter((s) => s.available)
      .filter((s) => !isSameMinuteOrPast(s.start_at, nowMs))
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

    // ✅ Client-side hard stop: prevent booking in the past
    const nowMs = Date.now() + 60_000; // 1-minute safety buffer
    if (isSameMinuteOrPast(selectedSlotStart, nowMs)) {
      toast.error("You can't book an appointment in the past.");
      setSelectedSlotStart("");
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
        `Appointment Type: ${appointmentType}`,
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
          appointment_type: appointmentType,
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

          {/* Independent Practitioner Warning */}
          {!doctor.practice_id && (
            <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-700 dark:text-amber-400">Independent Practitioner</AlertTitle>
              <AlertDescription className="text-amber-600 dark:text-amber-300">
                This doctor has not yet confirmed a clinic or practice location. Only <strong>video call</strong> and <strong>messaging</strong> appointments are available.
                <span className="block mt-2 font-medium">⚠️ Do not visit any physical location the doctor may suggest until they have verified their practice affiliation.</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Doctor summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>{doctor.profiles?.full_name ?? "Doctor"}</span>
                <div className="flex items-center gap-2">
                  {!doctor.practice_id && (
                    <Badge variant="outline" className="border-amber-500 text-amber-600">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Independent
                    </Badge>
                  )}
                  <Badge variant="secondary">{doctor.specialty}</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {doctor.practice_id && doctor.practices ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {doctor.practices.name}
                    {doctor.practices.address ? ` • ${doctor.practices.address}` : ""}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Building2 className="h-4 w-4" />
                  <span>No verified clinic - Remote consultations only</span>
                </div>
              )}
              {typeof doctor.consultation_fee === "number" && (
                <div className="text-muted-foreground">
                  Consultation fee: <span className="font-medium text-foreground">${doctor.consultation_fee}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appointment Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Appointment Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={appointmentType}
                onValueChange={(v) => setAppointmentType(v as AppointmentType)}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <div className="relative">
                  <RadioGroupItem value="video" id="video" className="peer sr-only" />
                  <Label
                    htmlFor="video"
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                  >
                    <Video className="h-6 w-6 mb-2" />
                    <span className="font-medium">Video Call</span>
                    <span className="text-xs text-muted-foreground">Live video consultation</span>
                  </Label>
                </div>

                <div className="relative">
                  <RadioGroupItem value="messaging" id="messaging" className="peer sr-only" />
                  <Label
                    htmlFor="messaging"
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                  >
                    <MessageSquare className="h-6 w-6 mb-2" />
                    <span className="font-medium">Messaging</span>
                    <span className="text-xs text-muted-foreground">Chat consultation</span>
                  </Label>
                </div>

                <div className="relative">
                  <RadioGroupItem
                    value="in-person"
                    id="in-person"
                    className="peer sr-only"
                    disabled={!doctor.practice_id}
                  />
                  <Label
                    htmlFor="in-person"
                    className={`flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 transition-colors ${
                      doctor.practice_id
                        ? 'hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <Building2 className="h-6 w-6 mb-2" />
                    <span className="font-medium">In-Person</span>
                    <span className="text-xs text-muted-foreground">
                      {doctor.practice_id ? 'Visit the clinic' : 'Not available'}
                    </span>
                  </Label>
                </div>
              </RadioGroup>
              {!doctor.practice_id && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
                  In-person appointments are not available for independent practitioners without a verified clinic.
                </p>
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
                    placeholder="e.g. +1 415 555 2671"
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

                <Button type="button" className="w-full" onClick={handleBook} disabled={!canBook}>
                  {booking ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Booking...
                    </span>
                  ) : (
                    "Book appointment"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
