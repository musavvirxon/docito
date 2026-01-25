// File: src/pages/AppointmentBooking.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, parseISO, startOfDay, isBefore, isSameDay } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  Calendar as CalendarIcon,
  Clock,
  Loader2,
  MapPin,
  Video,
  MessageSquare,
  Building2,
  Lock,
} from "lucide-react";

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
  user_id: string | null;
  specialty: string;
  consultation_fee: number | null;
  practice_id: string | null;
  profile_full_name: string | null;
  practice_name: string | null;
  practice_address: string | null;
};

type AvailabilitySlot = {
  start_at: string; // local ISO
  end_at: string; // local ISO
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

  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [durationMinutes, setDurationMinutes] = useState<number>(30);

  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlotStart, setSelectedSlotStart] = useState<string>("");
  const [appointmentType, setAppointmentType] = useState<AppointmentType>("video");

  // Patient details
  const [patientPhone, setPatientPhone] = useState<string>("");
  const [patientName, setPatientName] = useState<string>("");
  const [patientEmail, setPatientEmail] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const today = useMemo(() => startOfDay(new Date()), []);

  // Prefill email/phone
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
        const { data: d, error: dErr } = await supabase
          .from("doctors")
          .select("id, user_id, specialty, consultation_fee, practice_id")
          .eq("id", doctorId)
          .maybeSingle();

        if (dErr) throw dErr;
        if (!d) {
          setDoctor(null);
          return;
        }

        const doctorRow = d as any;

        let profile_full_name: string | null = null;
        if (doctorRow.user_id) {
          const { data: p } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", doctorRow.user_id)
            .maybeSingle();
          if (p) profile_full_name = (p as any).full_name ?? null;
        }

        let practice_name: string | null = null;
        let practice_address: string | null = null;

        if (doctorRow.practice_id) {
          const { data: pr } = await supabase
            .from("practices")
            .select("name, address")
            .eq("id", doctorRow.practice_id)
            .maybeSingle();
          if (pr) {
            practice_name = (pr as any).name ?? null;
            practice_address = (pr as any).address ?? null;
          }
        }

        setDoctor({
          id: String(doctorRow.id),
          user_id: doctorRow.user_id ? String(doctorRow.user_id) : null,
          specialty: String(doctorRow.specialty ?? ""),
          consultation_fee: doctorRow.consultation_fee == null ? null : Number(doctorRow.consultation_fee),
          practice_id: doctorRow.practice_id ? String(doctorRow.practice_id) : null,
          profile_full_name,
          practice_name,
          practice_address,
        });
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

  // Load slots
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

        const stillAvailable = newSlots.some(
          (s) => s.available && s.start_at === selectedSlotStart && !isSameMinuteOrPast(s.start_at, Date.now() + 60_000),
        );
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
    const seen = new Set<string>();
    const bufferNow = Date.now() + 60_000;

    return slots
      .filter((s) => s.available)
      .filter((s) => !isSameMinuteOrPast(s.start_at, bufferNow)) // ✅ lock old times
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

    const nowMs = Date.now() + 60_000;
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
      try {
        await supabase.from("profiles").update({ phone }).eq("user_id", user.id);
      } catch {
        // ignore
      }

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
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading doctor...
          </div>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <Alert className="max-w-lg mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Doctor not found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const doctorName = doctor.profile_full_name?.trim() || "Doctor";

  return (
    <main className="container max-w-5xl mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Book an appointment</h1>
          <p className="text-muted-foreground">
            Choose a date, a start time, and the appointment duration. Only phone is required.
          </p>
        </div>

        {!doctor.practice_id && (
          <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-700 dark:text-amber-400">Independent Practitioner</AlertTitle>
            <AlertDescription className="text-amber-600 dark:text-amber-300">
              This doctor has not yet confirmed a clinic or practice location. Only <strong>video call</strong> and{" "}
              <strong>messaging</strong> appointments are available.
              <span className="block mt-2 font-medium">
                ⚠️ Do not visit any physical location the doctor may suggest until they have verified their practice
                affiliation.
              </span>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Doctor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xl font-semibold">{doctorName}</div>
                <div className="text-sm text-muted-foreground">{doctor.specialty}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <Badge variant="secondary">Consultation fee</Badge>
                  <span>{doctor.consultation_fee != null ? `$${doctor.consultation_fee}` : "Not set"}</span>
                </div>
              </div>

              <div className="space-y-2">
                {doctor.practice_id && doctor.practice_name ? (
                  <div className="flex items-start gap-2 text-sm">
                    <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{doctor.practice_name}</div>
                      {doctor.practice_address && (
                        <div className="text-muted-foreground flex items-start gap-2 mt-1">
                          <MapPin className="h-4 w-4 mt-0.5" />
                          <span>{doctor.practice_address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No verified clinic location yet.</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appointment type</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={appointmentType} onValueChange={(v) => setAppointmentType(v as AppointmentType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="video" id="video" />
                <Label htmlFor="video" className="flex items-center gap-2 cursor-pointer">
                  <Video className="h-4 w-4" />
                  <span>Video call</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2 mt-3">
                <RadioGroupItem value="messaging" id="messaging" />
                <Label htmlFor="messaging" className="flex items-center gap-2 cursor-pointer">
                  <MessageSquare className="h-4 w-4" />
                  <span>Messaging</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2 mt-3">
                <RadioGroupItem value="in-person" id="inperson" disabled={!doctor.practice_id} />
                <Label htmlFor="inperson" className="flex items-center gap-2 cursor-pointer">
                  <MapPin className="h-4 w-4" />
                  <span className={doctor.practice_id ? "" : "text-muted-foreground"}>
                    {doctor.practice_id ? "In-person" : "In-person (clinic required)"}
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
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Date &amp; Duration
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
              </div>

              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(startOfDay(d))}
                weekStartsOn={1}
                // ✅ old days disabled (not bookable) + today highlighted by Calendar component styling
                disabled={(d) => isBefore(startOfDay(d), today)}
                className="rounded-md border"
              />

              <div className="text-xs text-muted-foreground">
                {isSameDay(selectedDate, today)
                  ? "Today is outlined. Past days are disabled."
                  : "Past days are disabled. Select a future date to book."}
              </div>
            </CardContent>
          </Card>

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
                    No bookable future times for {format(selectedDate, "PPP")} (try another date or duration).
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableSlots.map((slot) => {
                    const selected = selectedSlotStart === slot.start_at;
                    const label = format(parseISO(slot.start_at), "HH:mm");
                    const locked = isSameMinuteOrPast(slot.start_at, Date.now() + 60_000);

                    return (
                      <Button
                        key={slot.start_at}
                        type="button"
                        variant={selected ? "default" : "outline"}
                        onClick={() => setSelectedSlotStart(slot.start_at)}
                        disabled={locked} // ✅ old times locked (not bookable)
                        className={cn(
                          "justify-center rounded-md border-2",
                          selected ? "border-primary" : "border-muted-foreground/20",
                          locked ? "bg-muted/40 text-muted-foreground/60 border-muted-foreground/20" : "",
                        )}
                      >
                        {locked ? (
                          <span className="inline-flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5" />
                            {label}
                          </span>
                        ) : (
                          label
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}
              <div className="mt-3 text-xs text-muted-foreground">
                Past time slots are shown as locked and cannot be selected.
              </div>
            </CardContent>
          </Card>

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
                  placeholder="Any details for the doctor..."
                  rows={4}
                />
              </div>

              <Button onClick={handleBook} disabled={!canBook} className="w-full">
                {booking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : (
                  "Book appointment"
                )}
              </Button>

              {selectedSlotStart ? (
                <div className="text-xs text-muted-foreground">
                  Selected: {format(parseISO(selectedSlotStart), "PPP")} at {format(parseISO(selectedSlotStart), "HH:mm")}{" "}
                  ({durationMinutes} min)
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Select a time slot to continue.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function cn(...inputs: Array<string | undefined | null | false>) {
  return inputs.filter(Boolean).join(" ");
}
