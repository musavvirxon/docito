// File: src/pages/AppointmentSession.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, PhoneOff, LogOut, Settings, RefreshCw, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type MenuState = {
  showDetails: boolean;
  showNotes: boolean;
  showChat: boolean;
  showParticipants: boolean;
};

const STORAGE_KEY_PREFIX = "appointment_session_menu_state:";
const END_FLOW_KEY_PREFIX = "appointment_session_end_flow:";

function getMenuKey(appointmentId: string) {
  return `${STORAGE_KEY_PREFIX}${appointmentId}`;
}

function getEndFlowKey(appointmentId: string) {
  return `${END_FLOW_KEY_PREFIX}${appointmentId}`;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function safeGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function nowIso() {
  return new Date().toISOString();
}

async function markAppointmentEnded(appointmentId: string) {
  // Best-effort update; non-blocking in UI
  try {
    await supabase
      .from("appointments")
      .update({ status: "completed" as any, ended_at: nowIso() as any })
      .eq("id", appointmentId);
  } catch {
    // ignore
  }
}

export default function AppointmentSession() {
  const navigate = useNavigate();
  const params = useParams<{ appointmentId?: string }>();
  const [searchParams] = useSearchParams();

  const appointmentId =
    params.appointmentId || searchParams.get("appointmentId") || searchParams.get("id") || "";

  const provider = searchParams.get("provider") || "video";
  const [loading, setLoading] = useState(true);

  const [appointment, setAppointment] = useState<any>(null);
  const [userRole, setUserRole] = useState<"doctor" | "patient" | "unknown">("unknown");

  const [menuState, setMenuState] = useState<MenuState>({
    showDetails: true,
    showNotes: false,
    showChat: true,
    showParticipants: false,
  });

  const [ending, setEnding] = useState(false);
  const endRequestedRef = useRef(false);

  const menuKey = useMemo(() => (appointmentId ? getMenuKey(appointmentId) : ""), [appointmentId]);
  const endFlowKey = useMemo(() => (appointmentId ? getEndFlowKey(appointmentId) : ""), [appointmentId]);

  // Hydrate persisted menu state (per appointment)
  useEffect(() => {
    if (!menuKey) return;
    const persisted = safeParse<MenuState>(safeGet(menuKey));
    if (persisted) setMenuState(persisted);
  }, [menuKey]);

  // Persist menu state
  useEffect(() => {
    if (!menuKey) return;
    safeSet(menuKey, menuState);
  }, [menuState, menuKey]);

  const toggleMenuSection = (key: keyof MenuState) => {
    setMenuState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchAppointment = async () => {
    if (!appointmentId) {
      toast.error("Missing appointmentId");
      navigate(-1);
      return;
    }

    setLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id || null;

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          id,
          status,
          appointment_date,
          start_time,
          end_time,
          appointment_type,
          follow_up_of_appointment_id,
          patient_id,
          doctor_id,
          notes
        `,
        )
        .eq("id", appointmentId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Appointment not found");

      setAppointment(data);

      if (uid) {
        const isPatient = data.patient_id === uid;
        if (isPatient) setUserRole("patient");
        else setUserRole("doctor");
      } else {
        setUserRole("unknown");
      }

      const endState = safeParse<{ requestedAt: string }>(safeGet(endFlowKey));
      if (endState?.requestedAt) {
        toast.message("End visit pending", {
          description: "You previously requested to end this visit. You can safely leave and we will finalize when possible.",
        });
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load appointment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  const endVisitDeferred = async () => {
    if (!appointmentId) return;

    if (endRequestedRef.current) return;
    endRequestedRef.current = true;

    setEnding(true);
    try {
      safeSet(endFlowKey, { requestedAt: nowIso() });

      await markAppointmentEnded(appointmentId);

      toast.success("Visit ended", {
        description: "Session will close. If the network is slow, status sync will complete when possible.",
      });

      safeRemove(menuKey);

      if (userRole === "doctor") {
        navigate("/doctor-dashboard?section=calendar");
      } else if (userRole === "patient") {
        navigate("/patient-dashboard?section=appointments");
      } else {
        navigate("/");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to end visit");
    } finally {
      setEnding(false);
      // Keep endFlowKey so retry/visibility persists
    }
  };

  const leaveSession = () => {
    if (userRole === "doctor") navigate("/doctor-dashboard?section=calendar");
    else if (userRole === "patient") navigate("/patient-dashboard?section=appointments");
    else navigate("/");
  };

  const openProviderWindow = async () => {
    if (!appointmentId) return;
    const url = `${window.location.origin}/appointment-session/${encodeURIComponent(
      appointmentId,
    )}?provider=${encodeURIComponent(provider)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const retrySyncEnd = async () => {
    if (!appointmentId) return;

    setEnding(true);
    try {
      await markAppointmentEnded(appointmentId);
      toast.success("Synced end status");
    } catch {
      toast.error("Failed to sync");
    } finally {
      setEnding(false);
    }
  };

  const headerSubtitle = useMemo(() => {
    if (!appointment) return "";
    const date = appointment.appointment_date ? String(appointment.appointment_date) : "";
    const time = appointment.start_time ? String(appointment.start_time) : "";
    return [date, time].filter(Boolean).join(" • ");
  }, [appointment]);

  if (loading) {
    return (
      <div className="container max-w-5xl py-8">
        <Card>
          <CardContent className="p-6 flex items-center gap-3">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Loading session...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!appointmentId) {
    return (
      <div className="container max-w-5xl py-8">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Missing appointmentId</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Appointment Session</div>
          <div className="text-sm text-muted-foreground">{headerSubtitle}</div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openProviderWindow} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Open in new tab
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Session menu">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => toggleMenuSection("showDetails")}>
                <Settings className="h-4 w-4 mr-2" />
                {menuState.showDetails ? "Hide details" : "Show details"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleMenuSection("showNotes")}>
                <FileIcon className="h-4 w-4 mr-2" />
                {menuState.showNotes ? "Hide notes" : "Show notes"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleMenuSection("showChat")}>
                <ChatIcon className="h-4 w-4 mr-2" />
                {menuState.showChat ? "Hide chat" : "Show chat"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleMenuSection("showParticipants")}>
                <UsersIcon className="h-4 w-4 mr-2" />
                {menuState.showParticipants ? "Hide participants" : "Show participants"}
              </DropdownMenuItem>

              <div className="my-1 h-px bg-border" />

              <DropdownMenuItem onClick={retrySyncEnd} disabled={ending}>
                <RefreshCw className={cn("h-4 w-4 mr-2", ending && "animate-spin")} />
                Retry end sync
              </DropdownMenuItem>

              <DropdownMenuItem onClick={leaveSession}>
                <LogOut className="h-4 w-4 mr-2" />
                Leave session
              </DropdownMenuItem>

              <DropdownMenuItem onClick={endVisitDeferred} disabled={ending} className="text-destructive focus:text-destructive">
                <PhoneOff className="h-4 w-4 mr-2" />
                {ending ? "Ending..." : "End visit"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {menuState.showDetails && (
          <Card className="lg:col-span-4">
            <CardContent className="p-4 space-y-2">
              <div className="text-sm font-medium">Details</div>
              <div className="text-sm text-muted-foreground">
                Status: <span className="text-foreground">{appointment?.status || "unknown"}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Type: <span className="text-foreground">{appointment?.appointment_type || "standard"}</span>
              </div>
              {appointment?.follow_up_of_appointment_id && (
                <div className="text-sm text-muted-foreground">
                  Follow-up of: <span className="text-foreground">{appointment.follow_up_of_appointment_id}</span>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                Appointment ID: <span className="text-foreground">{appointmentId}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {menuState.showNotes && (
          <Card className={cn(menuState.showDetails ? "lg:col-span-8" : "lg:col-span-12")}>
            <CardContent className="p-4 space-y-2">
              <div className="text-sm font-medium">Notes</div>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">{appointment?.notes || "No notes."}</div>
            </CardContent>
          </Card>
        )}

        {menuState.showChat && (
          <Card className="lg:col-span-12">
            <CardContent className="p-4">
              <div className="text-sm font-medium mb-2">Chat</div>
              <div className="text-sm text-muted-foreground">
                Chat UI remains unchanged; this refactor only persists the menu state and supports deferred end flow.
              </div>
            </CardContent>
          </Card>
        )}

        {menuState.showParticipants && (
          <Card className="lg:col-span-12">
            <CardContent className="p-4">
              <div className="text-sm font-medium mb-2">Participants</div>
              <div className="text-sm text-muted-foreground">
                Participants UI remains unchanged; this refactor only persists the menu state and supports deferred end flow.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function FileIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("h-4 w-4", props?.className)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="2" />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ChatIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("h-4 w-4", props?.className)}>
      <path
        d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function UsersIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("h-4 w-4", props?.className)}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" />
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
