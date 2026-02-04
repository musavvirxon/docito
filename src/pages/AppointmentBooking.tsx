// File: src/pages/AppointmentBooking.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, parseISO, startOfDay } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar as CalendarIcon,
  Clock,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  Video,
  ClipboardList,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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

type DoctorProcedure = {
  id: string;
  name: string;
  category: string | null;
  default_cost: number | null;
  price: number | null;
  duration_minutes: number | null;
  estimated_duration_minutes: number | null;
};

const DURATION_OPTIONS_MINUTES = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180];

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatMoney(n: number) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
  } catch {
    return `$${n}`;
  }
}

const isSameMinuteOrPast = (isoLocal: string, nowMs: number) => {
  const t = parseISO(isoLocal).getTime();
  return Number.isFinite(t) ? t <= nowMs : true;
};

function isMissingColumnError(err: any, col: string) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes(col.toLowerCase()) && (msg.includes("does not exist") || msg.includes("schema cache") || msg.includes("column"));
}

function nearestDurationOption(m: number) {
  const clamped = Math.max(15, Math.min(180, Math.round(m / 15) * 15));
  let best = DURATION_OPTIONS_MINUTES[0];
  let bestDiff = Math.abs(best - clamped);
  for (const opt of DURATION_OPTIONS_MINUTES) {
    const d = Math.abs(opt - clamped);
    if (d < bestDiff) {
      best = opt;
      bestDiff = d;
    }
  }
  return best;
}

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

  // ✅ NEW: procedure request (no dental chart shown)
  const [proceduresLoading, setProceduresLoading] = useState(false);
  const [proceduresError, setProceduresError] = useState<string | null>(null);
  const [doctorProcedures, setDoctorProcedures] = useState<DoctorProcedure[]>([]);
  const [selectedProcedureId, setSelectedProcedureId] = useState<string | null>(null);

  // Patient details
  const [patientPhone, setPatientPhone] = useState<string>("");
  const [patientName, setPatientName] = useState<string>("");
  const [patientEmail, setPatientEmail] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const today = useMemo(() => startOfDay(new Date()), []);

  const isDentalSpecialty = useMemo(() => {
    const s = (doctor?.specialty || "").toLowerCase();
    return s.includes("dent") || s.includes("dental");
  }, [doctor?.specialty]);

  const selectedProcedure = useMemo(() => {
    if (!selectedProcedureId) return null;
    return doctorProcedures.find((p) => p.id === selectedProcedureId) || null;
  }, [doctorProcedures, selectedProcedureId]);

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

  // ✅ NEW: load doctor procedures (dentist_id first; fallback doctor_id)
  useEffect(() => {
    const loadProcedures = async () => {
      if (!doctorId) return;
      if (!isDentalSpecialty) {
        setDoctorProcedures([]);
        setSelectedProcedureId(null);
        return;
      }

      setProceduresLoading(true);
      setProceduresError(null);

      try {
        const baseSelect =
          "id,name,category,default_cost,price,duration_minutes,estimated_duration_minutes,is_active,is_bookable,dentist_id,doctor_id";

        // Try dentist_id
        let { data, error } = await (supabase as any)
          .from("procedures")
          .select(baseSelect)
          .eq("dentist_id", doctorId)
          .eq("is_active", true)
          .or("is_bookable.is.null,is_bookable.eq.true")
          .order("name", { ascending: true });

        // Fallback to doctor_id if dentist_id column missing
        if (error && isMissingColumnError(error, "dentist_id")) {
          ({ data, error } = await (supabase as any)
            .from("procedures")
            .select(baseSelect)
            .eq("doctor_id", doctorId)
            .eq("is_active", true)
            .or("is_bookable.is.null,is_bookable.eq.true")
            .order("name", { ascending: true }));
        }

        if (error) throw error;

        const list: DoctorProcedure[] = (Array.isArray(data) ? data : []).map((r: any) => ({
          id: String(r.id),
          name: String(r.name ?? ""),
          category: r.category ?? null,
          default_cost: r.default_cost == null ? null : Number(r.default_cost),
          price: r.price == null ? null : Number(r.price),
          duration_minutes: r.duration_minutes == null ? null : Number(r.duration_minutes),
          estimated_duration_minutes: r.estimated_duration_minutes == null ? null : Number(r.estimated_duration_minutes),
        }));

        setDoctorProcedures(list);
        setSelectedProcedureId((prev) => (prev && list.some((p) => p.id === prev) ? prev : null));
      } catch (e: any) {
        console.error(e);
        setDoctorProcedures([]);
        setSelectedProcedureId(null);
        setProceduresError(e?.message || "Failed to load procedures");
      } finally {
        setProceduresLoading(false);
      }
    };

    loadProcedures();
  }, [doctorId, isDentalSpecialty]);

  // Optional: when selecting a procedure, auto-set duration to procedure duration (nearest option)
  useEffect(() => {
    if (!selectedProcedure) return;
    const d = selectedProcedure.estimated_duration_minutes ?? selectedProcedure.duration_minutes;
    if (d && Number.isFinite(d) && d > 0) {
      setDurationMinutes(nearestDurationOption(Number(d)));
    }
  }, [selectedProcedureId]); // eslint-disable-line react-hooks/exhaustive-deps

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
          (s) => s.available && s.start_at === selectedSlotStart && !isSameMinuteOrPast(s.start_at, Date.now() + 60_000)
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
      .filter((s) => !isSameMinuteOrPast(s.start_at, bufferNow))
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
        selectedProcedure?.name ? `Requested Procedure: ${selectedProcedure.name}` : null,
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

          // ✅ NEW: request procedure
          procedure_id: selectedProcedureId ?? null,
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to book appointment");

      if (data?.hold_id) {
        toast.success("Slot held. Please confirm your appointment.");
        navigate(`/booking-confirmation/${data.hold_id}?mode=pending`);
        return;
      }

      const appointmentId = data?.appointment_id || data?.id;
      if (appointmentId) {
        toast.success("Appointment booked!");
        navigate(`/booking-confirmation/${appointmentId}`);
        return;
      }

      throw new Error("Booking succeeded but no hold_id/appointment_id returned");
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
                ⚠️ Do not visit any physical location the doctor may suggest until they have verified their practice affiliation.
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
          <CardContent className="space-y-4">
            <RadioGroup
              value={appointmentType}
              onValueChange={(v) => setAppointmentType(v as AppointmentType)}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40">
                <RadioGroupItem value="video" id="video" />
                <Video className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Video</div>
                  <div className="text-xs text-muted-foreground">Real-time consultation</div>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40">
                <RadioGroupItem value="messaging" id="messaging" />
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Messaging</div>
                  <div className="text-xs text-muted-foreground">Chat-based visit</div>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40 ${
                  !doctor.practice_id ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <RadioGroupItem value="in-person" id="in-person" />
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium flex items-center gap-2">
                    In-person {!doctor.practice_id && <Lock className="h-3.5 w-3.5" />}
                  </div>
                  <div className="text-xs text-muted-foreground">Clinic visit</div>
                </div>
              </label>
            </RadioGroup>

            {!doctor.practice_id && <div className="text-sm text-muted-foreground">In-person appointments require a verified practice location.</div>}
          </CardContent>
        </Card>

        {/* ✅ NEW: Procedure request (only for dental specialties) */}
        {isDentalSpecialty && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Requested procedure (optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Choose a procedure from this doctor</Label>
                <Select
                  value={selectedProcedureId ?? "none"}
                  onValueChange={(v) => setSelectedProcedureId(v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={proceduresLoading ? "Loading procedures..." : "Select a procedure"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific procedure</SelectItem>
                    {doctorProcedures.map((p) => {
                      const cost = p.default_cost ?? p.price;
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                          {cost != null ? ` • ${formatMoney(Number(cost))}` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {proceduresError ? (
                  <div className="text-xs text-destructive">{proceduresError}</div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    You can request a procedure here. The doctor confirms the final treatment plan and pricing.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Pick a date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(startOfDay(d))}
                disabled={(d) => startOfDay(d) < today}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Choose time & duration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={String(durationMinutes)} onValueChange={(v) => setDurationMinutes(Number(v))}>
                  <SelectTrigger>
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

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Available times</Label>
                  {loadingSlots && (
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading...
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableSlots.length === 0 && !loadingSlots ? (
                    <div className="col-span-2 sm:col-span-3 text-sm text-muted-foreground">
                      No available slots for this date.
                    </div>
                  ) : (
                    availableSlots.map((s) => {
                      const selected = selectedSlotStart === s.start_at;
                      return (
                        <Button
                          key={s.start_at}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          onClick={() => setSelectedSlotStart(s.start_at)}
                        >
                          {format(parseISO(s.start_at), "h:mm a")}
                        </Button>
                      );
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Patient details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} placeholder="+1 555 123 4567" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional: describe your symptoms, history, or questions"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleBook} disabled={!canBook}>
                {booking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : (
                  "Book appointment"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
