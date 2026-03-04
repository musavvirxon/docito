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
  Stethoscope,
  DollarSign,
  Info,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
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
  profile_avatar_url: string | null;
  practice_name: string | null;
  practice_address: string | null;
};

type AvailabilitySlot = {
  start_at: string;
  end_at: string;
  available: boolean;
  reason?: string | null;
};

type AppointmentType = "video" | "messaging" | "in-person";

type BookableProcedure = {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
  default_cost: number | null;
  duration_minutes: number | null;
  is_bookable: boolean | null;
  is_active: boolean | null;
};

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

  const [notes, setNotes] = useState<string>("");

  // Procedures (available for all doctors)
  const [procedures, setProcedures] = useState<BookableProcedure[]>([]);
  const [loadingProcedures, setLoadingProcedures] = useState(false);
  const [selectedProcedureId, setSelectedProcedureId] = useState<string>("none");

  const today = useMemo(() => startOfDay(new Date()), []);

  const selectedProcedure = useMemo(() => {
    if (selectedProcedureId === "none") return null;
    return procedures.find((p) => p.id === selectedProcedureId) || null;
  }, [procedures, selectedProcedureId]);

  // Load doctor using doctor_profiles_view for name visibility
  useEffect(() => {
    const loadDoctor = async () => {
      if (!doctorId) return;

      setLoadingDoctor(true);
      try {
        // Use doctor_profiles_view to bypass profiles RLS
        const { data: d, error: dErr } = await supabase
          .from("doctor_profiles_view")
          .select("id, user_id, specialty, consultation_fee, practice_id, full_name, avatar_url")
          .eq("id", doctorId)
          .maybeSingle();

        if (dErr) throw dErr;
        if (!d) {
          setDoctor(null);
          return;
        }

        const doctorRow = d as any;

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
          profile_full_name: doctorRow.full_name ?? null,
          profile_avatar_url: doctorRow.avatar_url ?? null,
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

  // Load bookable procedures for ALL doctors (not just dentists)
  useEffect(() => {
    const load = async () => {
      if (!doctorId) return;

      setLoadingProcedures(true);
      try {
        // Try doctor_id first, fall back to dentist_id
        let data: any[] | null = null;
        const { data: d1, error: e1 } = await (supabase as any)
          .from("procedures")
          .select("id,name,category,price,default_cost,duration_minutes,is_active,is_bookable")
          .eq("doctor_id", doctorId)
          .eq("is_active", true)
          .eq("is_bookable", true)
          .order("name", { ascending: true })
          .limit(200);

        if (!e1 && d1 && d1.length > 0) {
          data = d1;
        } else {
          // Fallback: try dentist_id column
          const { data: d2, error: e2 } = await (supabase as any)
            .from("procedures")
            .select("id,name,category,price,default_cost,duration_minutes,is_active,is_bookable")
            .eq("dentist_id", doctorId)
            .eq("is_active", true)
            .eq("is_bookable", true)
            .order("name", { ascending: true })
            .limit(200);
          if (e2) throw e2;
          data = d2;
        }

        const rows = (data || []) as any[];
        const normalized: BookableProcedure[] = rows.map((r) => ({
          id: String(r.id),
          name: String(r.name ?? ""),
          category: r.category ?? null,
          price: r.price == null ? null : Number(r.price),
          default_cost: r.default_cost == null ? null : Number(r.default_cost),
          duration_minutes: r.duration_minutes == null ? null : Number(r.duration_minutes),
          is_active: r.is_active ?? null,
          is_bookable: r.is_bookable ?? null,
        }));

        setProcedures(normalized);

        if (selectedProcedureId !== "none" && !normalized.some((p) => p.id === selectedProcedureId)) {
          setSelectedProcedureId("none");
        }
      } catch (e: any) {
        console.error(e);
        setProcedures([]);
        setSelectedProcedureId("none");
      } finally {
        setLoadingProcedures(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      .filter((s) => !isSameMinuteOrPast(s.start_at, bufferNow))
      .filter((s) => {
        if (seen.has(s.start_at)) return false;
        seen.add(s.start_at);
        return true;
      });
  }, [slots]);

  const canBook = Boolean(selectedSlotStart) && !booking;

  const handleBook = async () => {
    if (!doctorId) return;

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
      const combinedNotes = [
        selectedProcedure ? `Requested Procedure: ${selectedProcedure.name}` : null,
        `Appointment Type: ${appointmentType}`,
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
          procedure_id: selectedProcedure ? selectedProcedure.id : null,
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
            Choose a date, time, and appointment type. Your profile details will be shared with the doctor automatically.
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
              <div className="flex items-start gap-4">
                {doctor.profile_avatar_url && (
                  <img
                    src={doctor.profile_avatar_url}
                    alt={doctorName}
                    className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                  />
                )}
                <div className="space-y-1">
                  <div className="text-xl font-semibold">{doctorName}</div>
                  <div className="text-sm text-muted-foreground">{doctor.specialty}</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <Badge variant="secondary">Estimated fee</Badge>
                    <span>{doctor.consultation_fee != null ? `$${doctor.consultation_fee}` : "Not set"}</span>
                  </div>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-sm"
                    onClick={() => navigate(`/doctor/${doctor.id}`)}
                  >
                    View full profile →
                  </Button>
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

            {!doctor.practice_id && (
              <div className="text-sm text-muted-foreground">In-person appointments require a verified practice location.</div>
            )}
          </CardContent>
        </Card>

        {/* Requested procedure (available for all doctors) */}
        <Card>
          <CardHeader>
            <CardTitle>Request a procedure (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingProcedures ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading procedures...
              </div>
            ) : procedures.length === 0 ? (
              <div className="text-sm text-muted-foreground">This doctor has no bookable procedures configured yet.</div>
            ) : (
              <div className="space-y-2">
                <Select
                  value={selectedProcedureId}
                  onValueChange={(v) => {
                    setSelectedProcedureId(v);
                    if (v === "none") return;
                    const p = procedures.find((x) => x.id === v);
                    if (!p?.duration_minutes) return;
                    if (DURATION_OPTIONS_MINUTES.includes(p.duration_minutes) && p.duration_minutes !== durationMinutes) {
                      setDurationMinutes(p.duration_minutes);
                      setSelectedSlotStart("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a procedure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific procedure</SelectItem>
                    {procedures.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedProcedure && (
                  <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <Stethoscope className="h-3.5 w-3.5" />
                      {selectedProcedure.category || "Procedure"}
                    </span>

                    <span className="inline-flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      Estimated cost (charged after appointment):{" "}
                      {typeof (selectedProcedure.price ?? selectedProcedure.default_cost) === "number"
                        ? `$${selectedProcedure.price ?? selectedProcedure.default_cost}`
                        : "—"}
                    </span>

                    {typeof selectedProcedure.duration_minutes === "number" && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Suggested: {selectedProcedure.duration_minutes} min
                        {DURATION_OPTIONS_MINUTES.includes(selectedProcedure.duration_minutes) ? " (auto-applied)" : ""}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>Payment will only be charged after appointment completion and doctor confirmation.</span>
            </div>
          </CardContent>
        </Card>

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
                <Select
                  value={String(durationMinutes)}
                  onValueChange={(v) => {
                    setDurationMinutes(Number(v));
                    setSelectedSlotStart("");
                  }}
                >
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
            <CardTitle>Notes for your doctor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional: describe your symptoms, history, or questions"
            />

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
