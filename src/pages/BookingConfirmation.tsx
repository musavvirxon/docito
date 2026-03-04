// File: src/pages/BookingConfirmation.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { parseISO } from "date-fns";
import {
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { TimezoneNotice } from "@/components/time/TimezoneNotice";
import { formatAppointmentForViewer, getAppointmentUtcRange } from "@/lib/appointmentTime";
import { formatDateInTimeZone, formatTimeInTimeZone, getEffectiveTimeZone } from "@/lib/timezone";
import { supabase } from "@/integrations/supabase/client";

type HoldDetails = {
  id: string;
  patient_id: string | null;
  doctor_id: string;
  practice_id: string | null;
  start_at: string; // timestamptz
  end_at: string; // timestamptz
  expires_at: string; // timestamptz
  status: "pending" | "confirmed" | "expired" | "canceled";
  appointment_type: string; // in_person | video | home_visit | messaging | follow_up
  notes?: string | null;
  procedure_id?: string | null;
};

type ConfirmedAppointment = {
  id: string;
  doctor_id: string;
  practice_id: string | null;
  appointment_type: string;
  appointment_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  notes?: string | null;
};

type DoctorInfo = {
  id: string;
  specialty?: string | null;
  profiles?: { full_name: string | null; timezone?: string | null } | null;
  practices?: {
    name?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
};

type ClinicalItem = {
  id: string;
  item_type: "diagnosis" | "treatment" | "note" | "procedure";
  title: string;
  details?: string | null;
};

const escapeIcs = (str: string) =>
  str.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

function extractRequestedProcedure(notes?: string | null) {
  if (!notes) return { requested: null as string | null, remaining: null as string | null };

  const lines = notes.split("\n");
  const idx = lines.findIndex((l) => l.toLowerCase().startsWith("requested procedure:"));
  if (idx === -1) return { requested: null, remaining: notes };

  const requested = lines[idx].split(":").slice(1).join(":").trim() || null;
  const remaining = [...lines.slice(0, idx), ...lines.slice(idx + 1)].join("\n").trim() || null;

  return { requested, remaining };
}

export default function BookingConfirmation() {
  const { appointmentId: bookingId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  const viewerTimeZone = useMemo(() => getEffectiveTimeZone((profile as any)?.timezone), [profile]);
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const referralId =
    searchParams.get("referralId") || searchParams.get("referral_id") || searchParams.get("referral") || null;

  const appointmentIdFromQuery =
    searchParams.get("appointmentId") || searchParams.get("appointment_id") || null;

  const storageKey = useMemo(() => (bookingId ? `docito.booking.${bookingId}.appointment_id` : ""), [bookingId]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  const [holdDetails, setHoldDetails] = useState<HoldDetails | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<ConfirmedAppointment | null>(null);

  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);

  const [clinicalItems, setClinicalItems] = useState<ClinicalItem[]>([]);
  const [clinicalLoading, setClinicalLoading] = useState(false);

  const [patientNotes, setPatientNotes] = useState<string>("");

  const [confirming, setConfirming] = useState(false);

  const [linkingReferral, setLinkingReferral] = useState(false);
  const [referralLinked, setReferralLinked] = useState<boolean | null>(null);

  const confirmed = Boolean(confirmedAppointment);

  const providerTimeZone = useMemo(
    () => getEffectiveTimeZone(doctorInfo?.profiles?.timezone),
    [doctorInfo?.profiles?.timezone],
  );

  const requestedProcedure = useMemo(() => extractRequestedProcedure(confirmedAppointment?.notes ?? null), [confirmedAppointment?.notes]);

  const fetchDoctorInfo = useCallback(async (doctorId: string, practiceId?: string | null) => {
    // Use doctor_profiles_view for name (bypasses profiles RLS)
    const { data: dpv, error: dpvErr } = await supabase
      .from("doctor_profiles_view")
      .select("id, specialty, full_name, avatar_url, practice_id")
      .eq("id", doctorId)
      .maybeSingle();

    if (dpvErr) throw dpvErr;

    const d = dpv as any;
    const info: any = {
      id: doctorId,
      specialty: d?.specialty ?? null,
      profiles: { full_name: d?.full_name ?? null, timezone: null },
      practices: null,
    };

    // Try to get timezone from profiles (best-effort)
    if (d?.user_id) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("user_id", d.user_id)
        .maybeSingle();
      if (prof) info.profiles.timezone = (prof as any).timezone ?? null;
    }

    const effectivePracticeId = practiceId || d?.practice_id;
    if (effectivePracticeId) {
      const { data: practice } = await supabase
        .from("practices")
        .select("name,address,city,country")
        .eq("id", effectivePracticeId)
        .maybeSingle();
      if (practice) info.practices = practice;
    }

    setDoctorInfo(info);
  }, []);

  const fetchAppointment = useCallback(
    async (appointmentId: string) => {
      const { data, error: apptErr } = await supabase
        .from("appointments")
        .select("id, doctor_id, practice_id, appointment_type, appointment_date, start_time, end_time, notes")
        .eq("id", appointmentId)
        .maybeSingle();

      if (apptErr) throw apptErr;
      if (!data) return null;

      const appt = data as any;

      const normalized: ConfirmedAppointment = {
        id: appt.id,
        doctor_id: appt.doctor_id,
        practice_id: appt.practice_id ?? null,
        appointment_type: appt.appointment_type,
        appointment_date: appt.appointment_date,
        start_time: appt.start_time,
        end_time: appt.end_time,
        notes: appt.notes ?? null,
      };

      setConfirmedAppointment(normalized);
      setPatientNotes(appt.notes ?? "");
      await fetchDoctorInfo(normalized.doctor_id, normalized.practice_id);

      return normalized;
    },
    [fetchDoctorInfo],
  );

  const load = useCallback(async () => {
    if (!bookingId) return;

    setLoading(true);
    setError(null);

    try {
      // 1) Try to load hold (pending confirmation)
      const { data: hold, error: holdErr } = await supabase
        .from("appointment_holds")
        .select("id, patient_id, doctor_id, practice_id, start_at, end_at, expires_at, status, appointment_type, notes, procedure_id")
        .eq("id", bookingId)
        .maybeSingle();

      if (holdErr) throw holdErr;

      if (hold) {
        const h = hold as any as HoldDetails;
        setHoldDetails(h);
        setConfirmedAppointment(null);
        setPatientNotes(h.notes ?? "");
        setReferralLinked(null);
        await fetchDoctorInfo(h.doctor_id, h.practice_id);
        return;
      }

      // 2) If hold is gone (likely confirmed), use appointment_id from query or storage
      const storedApptId = storageKey ? sessionStorage.getItem(storageKey) : null;
      const apptId = appointmentIdFromQuery || storedApptId;

      if (!apptId) {
        setHoldDetails(null);
        setConfirmedAppointment(null);
        setDoctorInfo(null);
        setError({
          title: "Booking Not Found",
          message: "This booking hold no longer exists. Please start a new booking from the doctor's page.",
        });
        return;
      }

      setHoldDetails(null);
      await fetchAppointment(apptId);
    } catch (e: any) {
      console.error(e);
      setError({
        title: "Unable to Load Booking",
        message: e?.message || "Something went wrong loading your booking. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [appointmentIdFromQuery, bookingId, fetchAppointment, fetchDoctorInfo, storageKey]);

  useEffect(() => {
    load();
  }, [load]);

  // Countdown timer for holds
  const [remainingMs, setRemainingMs] = useState<number>(0);

  useEffect(() => {
    if (!holdDetails?.expires_at) return;

    const update = () => {
      const exp = new Date(holdDetails.expires_at).getTime();
      setRemainingMs(Math.max(0, exp - Date.now()));
    };

    update();
    const t = setInterval(update, 500);
    return () => clearInterval(t);
  }, [holdDetails?.expires_at]);

  const holdExpired = useMemo(() => {
    if (!holdDetails?.expires_at) return false;
    return new Date(holdDetails.expires_at).getTime() <= Date.now() || holdDetails.status === "expired";
  }, [holdDetails?.expires_at, holdDetails?.status]);

  const startAtUtc = useMemo(() => (holdDetails?.start_at ? parseISO(holdDetails.start_at) : null), [holdDetails?.start_at]);
  const endAtUtc = useMemo(() => (holdDetails?.end_at ? parseISO(holdDetails.end_at) : null), [holdDetails?.end_at]);

  const pendingTimeLabel = useMemo(() => {
    if (!startAtUtc) return "";
    const dateLabel = formatDateInTimeZone(startAtUtc, viewerTimeZone);
    const startLabel = formatTimeInTimeZone(startAtUtc, viewerTimeZone);
    const endLabel = endAtUtc ? formatTimeInTimeZone(endAtUtc, viewerTimeZone) : "";
    return endLabel ? `${dateLabel} • ${startLabel} – ${endLabel}` : `${dateLabel} • ${startLabel}`;
  }, [endAtUtc, startAtUtc, viewerTimeZone]);

  const providerTimeLabel = useMemo(() => {
    if (!startAtUtc) return "";
    const dateLabel = formatDateInTimeZone(startAtUtc, providerTimeZone);
    const startLabel = formatTimeInTimeZone(startAtUtc, providerTimeZone);
    const endLabel = endAtUtc ? formatTimeInTimeZone(endAtUtc, providerTimeZone) : "";
    return endLabel ? `${dateLabel} • ${startLabel} – ${endLabel}` : `${dateLabel} • ${startLabel}`;
  }, [endAtUtc, providerTimeZone, startAtUtc]);

  const locationLabel = useMemo(() => {
    const p = doctorInfo?.practices;
    if (!p) return null;

    const parts = [p.name, p.address, p.city, p.country].filter(Boolean) as string[];
    if (!parts.length) return null;
    return parts.join(", ");
  }, [doctorInfo?.practices]);

  const confirmAppointment = useCallback(async () => {
    if (!bookingId) return;

    setConfirming(true);

    try {
      if (!user) {
        toast.error("Please sign in to confirm this booking.");
        navigate(`/auth?returnTo=${encodeURIComponent(`/booking-confirmation/${bookingId}${location.search || ""}`)}`);
        return;
      }

      // Update hold notes (best-effort)
      if (holdDetails) {
        const normalizedNotes = patientNotes?.trim() || null;
        const prevNotes = holdDetails.notes?.trim?.() ?? (holdDetails.notes ?? "");
        const changed = (normalizedNotes ?? "") !== String(prevNotes ?? "");
        if (changed) {
          await supabase
            .from("appointment_holds")
            .update({ notes: normalizedNotes })
            .eq("id", bookingId);
        }
      }

      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;

      const { data, error: fnErr } = await supabase.functions.invoke("confirm-appointment", {
        body: { hold_id: bookingId },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      if (fnErr) throw fnErr;
      if (!data?.ok) throw new Error(data?.error || "Failed to confirm appointment.");

      const newAppointmentId = data.appointment_id as string;
      if (!newAppointmentId) throw new Error("Booking confirmed but no appointment_id returned.");

      // Persist mapping for refresh safety
      if (storageKey) {
        sessionStorage.setItem(storageKey, newAppointmentId);
      }

      // Update URL to include appointmentId (so refresh works)
      const params = new URLSearchParams(location.search);
      params.set("appointmentId", newAppointmentId);
      if (referralId) params.set("referralId", referralId);

      navigate(`/booking-confirmation/${bookingId}?${params.toString()}`, { replace: true });

      // Load confirmed appointment record
      await fetchAppointment(newAppointmentId);

      toast.success("Appointment confirmed!");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unable to confirm appointment.");
    } finally {
      setConfirming(false);
    }
  }, [
    bookingId,
    fetchAppointment,
    holdDetails,
    location.search,
    navigate,
    patientNotes,
    referralId,
    storageKey,
    user,
  ]);

  // Load clinical items after confirmation
  useEffect(() => {
    const run = async () => {
      if (!confirmedAppointment?.id) return;

      setClinicalLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("appointment-clinical-items", {
          body: { action: "list", appointment_id: confirmedAppointment.id },
        });

        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error || "Failed to load clinical items.");

        setClinicalItems((data?.items ?? []) as ClinicalItem[]);
      } catch {
        setClinicalItems([]);
      } finally {
        setClinicalLoading(false);
      }
    };

    run();
  }, [confirmedAppointment?.id]);

  // Link referral to appointment (best-effort, idempotent)
  const linkReferral = useCallback(
    async (apptId: string) => {
      if (!referralId) return;
      if (!apptId) return;
      if (referralLinked === true) return;

      setLinkingReferral(true);

      try {
        const { data: session } = await supabase.auth.getSession();
        const accessToken = session.session?.access_token;

        const { data, error } = await supabase.functions.invoke("referral-link-appointment", {
          body: { referral_id: referralId, appointment_id: apptId },
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });

        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error || "Failed to update referral.");

        setReferralLinked(true);
      } catch (e: any) {
        console.error(e);
        setReferralLinked(false);
        toast.error(e?.message || "Referral link failed.");
      } finally {
        setLinkingReferral(false);
      }
    },
    [referralId, referralLinked],
  );

  // Attempt linking once after appointment is confirmed/loaded
  const linkedOnceRef = useRef(false);
  useEffect(() => {
    if (!referralId) return;
    if (!confirmedAppointment?.id) return;
    if (linkedOnceRef.current) return;

    linkedOnceRef.current = true;
    linkReferral(confirmedAppointment.id);
  }, [confirmedAppointment?.id, linkReferral, referralId]);

  const downloadIcs = useCallback(() => {
    if (!confirmedAppointment) return;

    const srcTz = providerTimeZone;
    const { startUtc, endUtc } = getAppointmentUtcRange(confirmedAppointment, srcTz);

    if (!startUtc) {
      toast.error("Could not generate calendar event.");
      return;
    }

    const dtStart = startUtc.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const dtEnd =
      (endUtc ?? new Date(startUtc.getTime() + 30 * 60 * 1000)).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const doctorName = doctorInfo?.profiles?.full_name || "Doctor";
    const summary = `Appointment with ${doctorName}`;
    const locationText = locationLabel || "Docito";

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Docito//Booking//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${confirmedAppointment.id}@docito.app`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeIcs(summary)}`,
      `LOCATION:${escapeIcs(locationText)}`,
      `DESCRIPTION:${escapeIcs("Booked via docito.app")}`,
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `docito-appointment-${confirmedAppointment.id}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, [confirmedAppointment, doctorInfo?.profiles?.full_name, locationLabel, providerTimeZone]);

  const downloadTextSummary = useCallback(() => {
    if (!confirmedAppointment) return;

    const fmt = formatAppointmentForViewer({
      appt: confirmedAppointment,
      sourceTimeZone: providerTimeZone,
      viewerTimeZone,
      includeEnd: true,
    });

    const doctorName = doctorInfo?.profiles?.full_name || "Doctor";
    const specialty = doctorInfo?.specialty ? ` (${doctorInfo.specialty})` : "";
    const locationText = locationLabel || "Docito";
    const notes = confirmedAppointment.notes?.trim() ? confirmedAppointment.notes.trim() : "(none)";

    const content = [
      "Docito Appointment Confirmation",
      "============================",
      "",
      `Doctor: ${doctorName}${specialty}`,
      `When: ${fmt.combinedLabel} (${fmt.viewerTimeZone})`,
      `Provider Time: ${formatAppointmentForViewer({
        appt: confirmedAppointment,
        sourceTimeZone: providerTimeZone,
        viewerTimeZone: providerTimeZone,
        includeEnd: true,
      }).combinedLabel} (${providerTimeZone})`,
      `Location: ${locationText}`,
      "",
      "Notes:",
      notes,
      "",
      "Booked via https://docito.app",
      "",
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `docito-appointment-${confirmedAppointment.id}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, [confirmedAppointment, doctorInfo?.profiles?.full_name, doctorInfo?.specialty, locationLabel, providerTimeZone, viewerTimeZone]);

  if (loading) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading booking...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <Alert className="max-w-2xl mx-auto" variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>{error.title}</AlertTitle>
          <AlertDescription className="mt-2">{error.message}</AlertDescription>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={() => load()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button variant="outline" onClick={() => navigate("/patient/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  const displayDoctorName = doctorInfo?.profiles?.full_name || "Doctor";
  const displaySpecialty = doctorInfo?.specialty || null;

  const confirmedFmt = confirmedAppointment
    ? formatAppointmentForViewer({
        appt: confirmedAppointment,
        sourceTimeZone: providerTimeZone,
        viewerTimeZone,
        includeEnd: true,
      })
    : null;

  const providerFmt = confirmedAppointment
    ? formatAppointmentForViewer({
        appt: confirmedAppointment,
        sourceTimeZone: providerTimeZone,
        viewerTimeZone: providerTimeZone,
        includeEnd: true,
      })
    : null;

  return (
    <div className="container max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Booking Confirmation</h1>
          <p className="text-muted-foreground mt-1">
            {confirmed ? "Your appointment is confirmed." : "Confirm your appointment to finalize the booking."}
          </p>
        </div>

        <TimezoneNotice timezone={viewerTimeZone} />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  {confirmed ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      Appointment Confirmed
                    </>
                  ) : (
                    <>
                      <Clock className="h-5 w-5" />
                      Pending Confirmation
                    </>
                  )}
                </CardTitle>

                <div className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{displayDoctorName}</span>
                    {displaySpecialty ? <Badge variant="secondary">{displaySpecialty}</Badge> : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => load()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {confirmed && confirmedFmt ? (
                <>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="font-medium">{confirmedFmt.dateLabel}</div>
                      <div className="text-sm text-muted-foreground">{confirmedFmt.timeLabel}</div>
                      {providerFmt && providerTimeZone !== viewerTimeZone ? (
                        <div className="text-xs text-muted-foreground mt-1">
                          Provider time: {providerFmt.combinedLabel} ({providerTimeZone})
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <Separator />

                  {locationLabel ? (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="font-medium">Location</div>
                        <div className="text-sm text-muted-foreground">{locationLabel}</div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="secondary" onClick={downloadIcs}>
                      <Download className="h-4 w-4 mr-2" />
                      Add to Calendar
                    </Button>
                    <Button variant="outline" onClick={downloadTextSummary}>
                      <FileText className="h-4 w-4 mr-2" />
                      Download Summary
                    </Button>

                    {referralId ? (
                      <Badge variant={referralLinked === false ? "destructive" : "secondary"}>
                        {linkingReferral
                          ? "Updating referral…"
                          : referralLinked === true
                            ? "Referral updated"
                            : referralLinked === false
                              ? "Referral update failed"
                              : "Referral pending"}
                      </Badge>
                    ) : null}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="font-medium">Notes</div>
                    {requestedProcedure.requested ? (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Requested procedure:</span>{" "}
                        <span className="font-medium">{requestedProcedure.requested}</span>
                      </div>
                    ) : null}
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {requestedProcedure.remaining || "(none)"}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">Clinical Items</div>
                      {clinicalLoading ? (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading…
                        </div>
                      ) : null}
                    </div>

                    {!clinicalLoading && clinicalItems.length === 0 ? (
                      <div className="text-sm text-muted-foreground mt-2">No clinical items yet.</div>
                    ) : null}

                    <div className="mt-3 space-y-3">
                      {clinicalItems.map((item) => (
                        <Card key={item.id} className="border-muted">
                          <CardContent className="py-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-medium">{item.title}</div>
                              <Badge variant="outline" className="capitalize">
                                {item.item_type}
                              </Badge>
                            </div>
                            {item.details ? (
                              <div className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{item.details}</div>
                            ) : null}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <Button onClick={() => navigate("/patient/dashboard")}>Go to Dashboard</Button>
                    <Button variant="outline" asChild>
                      <Link to="/patient/appointments">View Appointments</Link>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="font-medium">{pendingTimeLabel || "—"}</div>
                      {providerTimeZone !== viewerTimeZone && providerTimeLabel ? (
                        <div className="text-xs text-muted-foreground mt-1">
                          Provider time: {providerTimeLabel} ({providerTimeZone})
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <Separator />

                  {locationLabel ? (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="font-medium">Location</div>
                        <div className="text-sm text-muted-foreground">{locationLabel}</div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="font-medium">Time remaining</div>
                      <div className="text-sm text-muted-foreground">
                        {holdExpired
                          ? "This hold has expired."
                          : `${Math.floor(remainingMs / 60000)}:${String(Math.floor((remainingMs % 60000) / 1000)).padStart(
                              2,
                              "0",
                            )} minutes`}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="font-medium">Notes (optional)</div>
                    <Textarea
                      value={patientNotes}
                      onChange={(e) => setPatientNotes(e.target.value)}
                      placeholder="Add any notes for your doctor…"
                      className="min-h-[120px]"
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <Button onClick={confirmAppointment} disabled={confirming || holdExpired}>
                      {confirming ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Confirming…
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirm Appointment
                        </>
                      )}
                    </Button>

                    <Button variant="outline" onClick={() => navigate(-1)}>
                      Back
                    </Button>
                  </div>

                  {holdExpired ? (
                    <Alert variant="destructive" className="mt-4">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Hold expired</AlertTitle>
                      <AlertDescription>
                        The held slot is no longer reserved. Please go back and select a new time.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Help</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <div>
                Booking is only finalized after you confirm. If you refresh after confirming, we’ll use your stored
                appointment reference to show the confirmed details.
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline">docito.app</Badge>
                {referralId ? <Badge variant="secondary">Referral flow</Badge> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Next steps</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <div>• Arrive a few minutes early for in-person appointments.</div>
              <div>• If this is a video visit, check your camera and microphone.</div>
              <div>• Bring any relevant documents or test results.</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
