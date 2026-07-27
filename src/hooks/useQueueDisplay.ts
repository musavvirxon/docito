import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type QueueStatus = "arrived" | "called" | "in_progress";

interface QueueEntry {
  room_id: string;
  doctor_name: string;
  patient_name: string;
  queue_status: QueueStatus;
  called_at: string | null;
  start_time: string;
}

interface QueueRoom {
  room_id: string;
  room_name: string;
  room_number?: string | null;
  primary_doctor_id?: string | null;
  primary_doctor_name?: string | null;
}

interface QueueDisplayPayload {
  practice_id: string;
  practice_name: string;
  rooms: QueueRoom[];
  queue: QueueEntry[];
}

export interface RoomView {
  roomId: string;
  roomName: string;
  roomNumber: string | null;
  doctorName: string | null;
  busy: boolean;
  currentPatient: string | null;
  nextPatient: string | null;
}

export interface CalledEvent {
  roomName: string;
  doctorName: string;
  patientName: string;
  calledAt: string;
}

interface QueueDisplayState {
  loading: boolean;
  error: string | null;
  practiceId: string | null;
  practiceName: string | null;
  rooms: RoomView[];
  lastCalled: CalledEvent | null;
}

const POLL_INTERVAL_MS = 2500;
const FRESH_CALL_WINDOW_MS = 60_000;

function buildRooms(rooms: QueueRoom[], queue: QueueEntry[]): RoomView[] {
  return rooms.map((room) => {
    const entries = queue.filter((q) => q.room_id === room.room_id);
    const inProgress = entries.find((q) => q.queue_status === "in_progress");
    const upNext = entries
      .filter((q) => q.queue_status === "arrived" || q.queue_status === "called")
      .sort((a, b) => a.start_time.localeCompare(b.start_time))[0];

    return {
      roomId: room.room_id,
      roomName: room.room_name,
      roomNumber: room.room_number ?? null,
      doctorName:
        room.primary_doctor_name ||
        inProgress?.doctor_name ||
        upNext?.doctor_name ||
        null,
      busy: Boolean(inProgress),
      currentPatient: inProgress?.patient_name || null,
      nextPatient: upNext?.patient_name || null,
    };
  });
}


/**
 * Drives a paired waiting-room display: polls get_queue_display() on
 * an interval (the resilient baseline — self-heals after a dropped
 * connection or a sleeping tab) and layers an instant Realtime
 * broadcast on top so "call next" feels immediate.
 */
export function useQueueDisplay(token: string | undefined) {
  const [state, setState] = useState<QueueDisplayState>({
    loading: true,
    error: null,
    practiceId: null,
    practiceName: null,
    rooms: [],
    lastCalled: null,
  });

  const lastCalledAtRef = useRef<string | null>(null);

  const fetchOnce = useCallback(async () => {
    if (!token) return;
    const { data, error } = await supabase.rpc("get_queue_display", { _token: token });

    if (error || !data) {
      setState((s) => ({
        ...s,
        loading: false,
        error: "This display link is invalid or has been disconnected. Ask your clinic admin to reconnect it.",
      }));
      return;
    }

    const payload = data as unknown as QueueDisplayPayload;

    const freshestCalled = payload.queue
      .filter((q) => q.queue_status === "called" && q.called_at)
      .sort((a, b) => (b.called_at as string).localeCompare(a.called_at as string))[0];

    let lastCalled: CalledEvent | null = null;
    if (freshestCalled && freshestCalled.called_at !== lastCalledAtRef.current) {
      lastCalledAtRef.current = freshestCalled.called_at;
      const age = Date.now() - new Date(freshestCalled.called_at as string).getTime();
      if (age < FRESH_CALL_WINDOW_MS) {
        const room = payload.rooms.find((r) => r.room_id === freshestCalled.room_id);
        lastCalled = {
          roomName: room?.room_name || "",
          doctorName: freshestCalled.doctor_name,
          patientName: freshestCalled.patient_name,
          calledAt: freshestCalled.called_at as string,
        };
      }
    }

    setState((s) => ({
      loading: false,
      error: null,
      practiceId: payload.practice_id,
      practiceName: payload.practice_name,
      rooms: buildRooms(payload.rooms, payload.queue),
      lastCalled: lastCalled ?? s.lastCalled,
    }));
  }, [token]);

  // Resilient baseline: poll regardless of broadcasts. If wifi drops
  // for a few seconds or the tab was asleep, this is what makes the
  // screen catch back up on its own, with no special-casing needed.
  useEffect(() => {
    if (!token) return;
    fetchOnce();
    const interval = setInterval(fetchOnce, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [token, fetchOnce]);

  // Instant push: once we know which practice this display belongs
  // to, listen for the broadcast reception sends right after calling
  // a patient, and refetch immediately instead of waiting for the poll.
  useEffect(() => {
    if (!state.practiceId) return;
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(`display:${state.practiceId}:${suffix}`)
      .on("broadcast", { event: "call" }, () => fetchOnce())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `practice_id=eq.${state.practiceId}` },
        () => fetchOnce()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clinic_rooms", filter: `practice_id=eq.${state.practiceId}` },
        () => fetchOnce()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.practiceId, fetchOnce]);

  // Catch back up instantly when a sleeping tab/TV wakes or the
  // network comes back, without waiting for the next poll tick.
  useEffect(() => {
    if (!token) return;
    const onWake = () => {
      if (document.visibilityState === "visible") fetchOnce();
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("online", onWake);
    window.addEventListener("focus", onWake);
    return () => {
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("online", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, [token, fetchOnce]);

  return state;
}
