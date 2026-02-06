import { useState, useEffect, useMemo } from "react";
import { format, parseISO, startOfDay, isBefore, isToday, isSameDay } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  Lock,
  User,
  Building2,
  Stethoscope,
  DollarSign,
} from "lucide-react";
import { useAvailability } from "@/hooks/useAvailability";
import { useBookAppointment } from "@/hooks/useBookAppointment";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AppointmentBookingPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  entityName: string;
  providerId?: string;
  providerName?: string;
  appointmentType?: string;

  /**
   * Optional: when booking is initiated from a referral.
   * We carry this into the booking confirmation URL (query param) so confirmation
   * can link the finalized appointment back to the referral.
   */
  referralId?: string;

  onSuccess?: (appointmentId: string) => void;
}

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

export function AppointmentBookingPopup({
  open,
  onOpenChange,
  entityId,
  entityName,
  providerId,
  providerName,
  appointmentType = "consultation",
  referralId,
  onSuccess,
}: AppointmentBookingPopupProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const todayStart = startOfDay(new Date());

  const [resolvedProviderName, setResolvedProviderName] = useState<string>(providerName || "");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(todayStart);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"date" | "time" | "confirm" | "success">("date");
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [workingDays, setWorkingDays] = useState<Record<string, boolean>>({});

  // Procedures for this doctor + selection
  const [procedures, setProcedures] = useState<BookableProcedure[]>([]);
  const [loadingProcedures, setLoadingProcedures] = useState(false);
  const [selectedProcedureId, setSelectedProcedureId] = useState<string>("none");

  const selectedProcedure = useMemo(() => {
    if (selectedProcedureId === "none") return null;
    return procedures.find((p) => p.id === selectedProcedureId) || null;
  }, [procedures, selectedProcedureId]);

  // Referral context: prop wins; otherwise fallback to URL query string
  const effectiveReferralId = useMemo(() => {
    if (referralId && String(referralId).trim()) return String(referralId).trim();
    try {
      const params = new URLSearchParams(location.search);
      const rid = params.get("referralId");
      return rid && rid.trim() ? rid.trim() : null;
    } catch {
      return null;
    }
  }, [referralId, location.search]);

  const { loading: slotsLoading, fetchAvailability, getAvailableSlotsForDate, slots } = useAvailability({
    entityId,
    providerId,
    appointmentType,
  });

  const { bookAppointment, loading: bookingLoading, result } = useBookAppointment();

  // Keep prop in sync (if parent updates it later)
  useEffect(() => {
    setResolvedProviderName(providerName || "");
  }, [providerName]);

  // If providerName isn't provided, fetch it using providerId (doctor -> profiles full_name)
  useEffect(() => {
    const run = async () => {
      if (!open) return;
      if (resolvedProviderName) return;
      if (!providerId) return;

      const { data, error } = await supabase
        .from("doctors")
        .select("id, profiles:user_id(full_name)")
        .eq("id", providerId)
        .maybeSingle();

      if (!error && data?.profiles?.full_name) {
        setResolvedProviderName(data.profiles.full_name);
      }
    };

    run().catch(console.error);
  }, [open, providerId, resolvedProviderName]);

  // Load doctor's bookable procedures for patient to request
  useEffect(() => {
    const load = async () => {
      if (!open) return;
      if (!providerId) {
        setProcedures([]);
        setSelectedProcedureId("none");
        return;
      }

      setLoadingProcedures(true);
      try {
        const { data, error } = await supabase
          .from("procedures")
          .select("id,name,category,price,default_cost,duration_minutes,is_bookable,is_active")
          .eq("dentist_id", providerId)
          .eq("is_active", true)
          .eq("is_bookable", true)
          .order("name", { ascending: true });

        if (error) throw error;

        const rows = (data || []) as any[];
        const normalized: BookableProcedure[] = rows.map((r) => ({
          id: String(r.id),
          name: String(r.name ?? ""),
          category: r.category ?? null,
          price: r.price == null ? null : Number(r.price),
          default_cost: r.default_cost == null ? null : Number(r.default_cost),
          duration_minutes: r.duration_minutes == null ? null : Number(r.duration_minutes),
          is_bookable: r.is_bookable ?? null,
          is_active: r.is_active ?? null,
        }));

        setProcedures(normalized);

        // keep selection if still exists, otherwise reset
        if (selectedProcedureId !== "none" && !normalized.some((p) => p.id === selectedProcedureId)) {
          setSelectedProcedureId("none");
        }
      } catch (e) {
        console.error(e);
        setProcedures([]);
        setSelectedProcedureId("none");
      } finally {
        setLoadingProcedures(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, providerId]);

  // Load blocked dates and working days for calendar disabled dates
  useEffect(() => {
    const run = async () => {
      if (!open || !providerId) return;

      try {
        // Fetch doctor's schedule settings, blocked dates, etc. (if available in your app)
        // This block remains minimal to avoid breaking existing behavior.
        // If your project has dedicated schedule tables, keep existing logic as-is.
        setBlockedDates([]);
        setWorkingDays({});
      } catch (e) {
        console.error(e);
      }
    };

    run();
  }, [open, providerId]);

  // When popup opens, reset state
  useEffect(() => {
    if (!open) return;

    setSelectedDate(todayStart);
    setSelectedSlot(null);
    setNotes("");
    setStep("date");
  }, [open, todayStart]);

  // Fetch availability whenever date changes (small window around selected date)
  useEffect(() => {
    const run = async () => {
      if (!open) return;
      if (!providerId) return;
      if (!selectedDate) return;

      const day = format(selectedDate, "yyyy-MM-dd");
      await fetchAvailability(day, day);
    };

    run().catch(console.error);
  }, [open, providerId, selectedDate, fetchAvailability]);

  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;

    // Fallback: embed requested procedure into notes so doctor still sees it
    const composedNotes = [
      selectedProcedure ? `Requested Procedure: ${selectedProcedure.name}` : null,
      notes.trim() ? notes.trim() : null,
    ]
      .filter(Boolean)
      .join("\n");

    const res = await bookAppointment({
      entityId,
      providerId: providerId as string,
      slotStart: selectedSlot,
      appointmentType,
      notes: composedNotes || undefined,
      procedureId: selectedProcedure ? selectedProcedure.id : null,
    });

    if (res) {
      setStep("success");
      onSuccess?.(res.hold_id);
    }
  };

  const handleLoginRedirect = () => {
    onOpenChange(false);
    const redirectPath = window.location.pathname + window.location.search;
    navigate("/auth?redirect=" + encodeURIComponent(redirectPath));
  };

  // Get available slots for selected date
  const availableSlots = selectedDate
    ? getAvailableSlotsForDate(format(selectedDate, "yyyy-MM-dd"))
    : [];

  const nowWithBufferMs = Date.now() + 60_000; // 1 min buffer

  const filteredSlots = useMemo(() => {
    // Remove duplicates and past times
    const seen = new Set<string>();
    return (availableSlots || [])
      .filter((s) => s?.available)
      .filter((s) => {
        const start = parseISO(s.start_at).getTime();
        if (!Number.isFinite(start) || start <= nowWithBufferMs) return false;
        if (seen.has(s.start_at)) return false;
        seen.add(s.start_at);
        return true;
      });
  }, [availableSlots, nowWithBufferMs]);

  const disableDate = (date: Date) => {
    // disable before today
    if (isBefore(date, todayStart) && !isToday(date)) return true;

    // blocked dates
    if (blockedDates.some((d) => isSameDay(d, date))) return true;

    // optional working days logic (if present)
    // if workingDays has keys like "1".."7"
    if (Object.keys(workingDays).length > 0) {
      // JS: 0=Sun..6=Sat; convert to 1=Mon..7=Sun
      const js = date.getDay();
      const day = js === 0 ? 7 : js;
      if (workingDays[String(day)] === false) return true;
    }

    return false;
  };

  const canProceedToTime = Boolean(selectedDate);
  const canProceedToConfirm = Boolean(selectedSlot);

  const confirmationUrl = useMemo(() => {
    if (!result?.hold_id) return null;
    const base = `/booking-confirmation/${result.hold_id}`;
    if (!effectiveReferralId) return base;
    const qs = new URLSearchParams({ referralId: effectiveReferralId }).toString();
    return `${base}?${qs}`;
  }, [result?.hold_id, effectiveReferralId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Book Appointment</DialogTitle>
          <DialogDescription>
            Choose a date and time. You can also request a specific procedure (if offered by this doctor).
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Sign in required</p>
                <p className="text-sm text-muted-foreground">
                  Please sign in to book an appointment.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleLoginRedirect}>
                Sign In
              </Button>
            </div>
          </div>
        ) : null}

        {user && step === "date" && (
          <div className="py-2 space-y-4">
            <div className="bg-muted/40 rounded-lg p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="inline-flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  {entityName}
                </Badge>

                {resolvedProviderName ? (
                  <Badge variant="outline" className="inline-flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    Dr. {resolvedProviderName}
                  </Badge>
                ) : null}

                {effectiveReferralId ? (
                  <Badge variant="outline" className="inline-flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" />
                    Referral booking
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    setSelectedDate(d);
                    setSelectedSlot(null);
                  }}
                  disabled={disableDate}
                  className="rounded-md border"
                />
              </div>

              <div className="w-full md:w-72 space-y-3">
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    Selected date
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Choose a date"}
                  </p>
                </div>

                <Button
                  className="w-full"
                  disabled={!canProceedToTime}
                  onClick={() => setStep("time")}
                >
                  Continue
                </Button>

                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5" />
                  Booking holds your slot temporarily until you confirm.
                </div>
              </div>
            </div>
          </div>
        )}

        {user && step === "time" && selectedDate && (
          <div className="py-2 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <p className="font-medium">{format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
                <p className="text-sm text-muted-foreground">Select an available time</p>
              </div>

              <Button variant="outline" onClick={() => setStep("date")}>
                Back
              </Button>
            </div>

            {slotsLoading ? (
              <div className="py-10 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading slots...
              </div>
            ) : filteredSlots.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-60" />
                <p>No available slots for this date.</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px] pr-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredSlots.map((s) => {
                    const time = parseISO(s.start_at);
                    const isSelected = selectedSlot === s.start_at;

                    return (
                      <Button
                        key={s.start_at}
                        variant={isSelected ? "default" : "outline"}
                        className={cn("justify-center", isSelected && "shadow-sm")}
                        onClick={() => setSelectedSlot(s.start_at)}
                      >
                        {isSelected ? (
                          <span className="inline-flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5" />
                            {format(time, "h:mm a")}
                          </span>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            {format(time, "h:mm a")}
                          </>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("date")}>
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={() => setStep("confirm")}
                disabled={!canProceedToConfirm}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {user && step === "confirm" && selectedDate && selectedSlot && (
          <div className="py-4 space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <span className="font-medium">{format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>{format(parseISO(selectedSlot), "h:mm a")}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Badge variant="secondary" className="inline-flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  {entityName}
                </Badge>

                {resolvedProviderName ? (
                  <Badge variant="outline" className="inline-flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    Dr. {resolvedProviderName}
                  </Badge>
                ) : null}

                {effectiveReferralId ? (
                  <Badge variant="outline" className="inline-flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" />
                    Referral booking
                  </Badge>
                ) : null}
              </div>
            </div>

            {/* Procedure request */}
            <div className="space-y-2">
              <Label>Requested procedure (optional)</Label>

              {loadingProcedures ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading procedures...
                </div>
              ) : procedures.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No bookable procedures configured for this doctor.
                </div>
              ) : (
                <div className="space-y-2">
                  <Select value={selectedProcedureId} onValueChange={setSelectedProcedureId}>
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
                        Estimate:{" "}
                        {typeof (selectedProcedure.price ?? selectedProcedure.default_cost) === "number"
                          ? (selectedProcedure.price ?? selectedProcedure.default_cost)
                          : "—"}
                      </span>
                      {typeof selectedProcedure.duration_minutes === "number" && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {selectedProcedure.duration_minutes} min
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special requests or information..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("time")}
                disabled={bookingLoading}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirmBooking}
                disabled={bookingLoading}
              >
                {bookingLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : (
                  "Confirm Booking"
                )}
              </Button>
            </div>
          </div>
        )}

        {user && step === "success" && result && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Almost there!</h3>
            <p className="text-muted-foreground mb-4">
              Your slot is reserved for{" "}
              {format(parseISO(`${result.appointment_date}T${result.start_time}`), "EEEE, MMMM d")}{" "}
              at{" "}
              {format(parseISO(`${result.appointment_date}T${result.start_time}`), "h:mm a")}
              . Please confirm to finalize your appointment.
            </p>

            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => confirmationUrl && navigate(confirmationUrl)} disabled={!confirmationUrl}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Appointment
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AppointmentBookingPopup;
