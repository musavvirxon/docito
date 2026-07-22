import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, Stethoscope, Volume2 } from "lucide-react";
import { useQueueDisplay, type CalledEvent } from "@/hooks/useQueueDisplay";

// Synthesizes a short two-note chime with the Web Audio API so this
// page needs zero bundled audio assets. Safe to call repeatedly.
function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const notes = [880, 1108.73]; // A5, C#6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.35, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 1);
    });
  } catch {
    // Audio isn't available on every device — the visual banner still works.
  }
}

export default function QueueDisplay() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation("rooms");
  const { loading, error, practiceName, rooms, lastCalled } = useQueueDisplay(token);

  const [soundEnabled, setSoundEnabled] = useState(false);
  const [banner, setBanner] = useState<CalledEvent | null>(null);
  const lastAnnouncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastCalled || lastCalled.calledAt === lastAnnouncedRef.current) return;
    lastAnnouncedRef.current = lastCalled.calledAt;
    setBanner(lastCalled);
    if (soundEnabled) playChime();
    const timer = setTimeout(() => setBanner(null), 14000);
    return () => clearTimeout(timer);
  }, [lastCalled, soundEnabled]);

  const enableSound = () => {
    playChime();
    setSoundEnabled(true);
  };

  // Kiosk browsers launched with --autoplay-policy=no-user-gesture-required
  // never need this screen — soundEnabled can default to true there if you
  // prefer; it's left as an explicit tap for anything else (cast tabs,
  // smart-TV browsers) since those still enforce the autoplay restriction.
  if (!soundEnabled) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-950 text-white cursor-pointer"
        onClick={enableSound}
      >
        <Volume2 className="h-16 w-16 opacity-70" />
        <p className="text-2xl font-medium">{t("display.tapToStart", "Tap anywhere to start the display")}</p>
        <p className="text-slate-400">{t("display.tapToStartHint", "This unlocks sound for patient call announcements")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-950 text-white px-8 text-center">
        <p className="text-2xl font-medium">{t("display.invalidTitle", "Display not connected")}</p>
        <p className="text-slate-400 max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-10 relative overflow-hidden">
      <div className="flex items-baseline justify-between mb-10">
        <h1 className="text-3xl font-semibold">{practiceName}</h1>
        <p className="text-slate-400 text-lg">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <div
            key={room.roomId}
            className={`rounded-2xl border p-6 transition-colors ${
              room.busy ? "border-rose-500/40 bg-rose-500/10" : "border-emerald-500/40 bg-emerald-500/10"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="min-w-0">
                <h2 className="text-2xl font-semibold truncate">{room.roomName}</h2>
                {room.roomNumber && (
                  <p className="text-sm text-slate-400 mt-0.5">#{room.roomNumber}</p>
                )}
              </div>
              <span
                className={`text-sm font-medium px-3 py-1 rounded-full shrink-0 ${
                  room.busy ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
                }`}
              >
                {room.busy ? t("display.busy", "In consultation") : t("display.free", "Free")}
              </span>
            </div>

            {room.doctorName && (
              <p className="flex items-center gap-2 text-slate-300 mb-4">
                <Stethoscope className="h-4 w-4" />
                {t("display.withDoctor", "Dr. {{name}}", { name: room.doctorName })}
              </p>
            )}

            <div className="space-y-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">{t("display.now", "Now serving")}</p>
                <p className="text-xl font-medium">{room.currentPatient || "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">{t("display.next", "Next")}</p>
                <p className="text-lg text-slate-300">{room.nextPatient || "—"}</p>
              </div>
            </div>
          </div>
        ))}

        {rooms.length === 0 && (
          <p className="text-slate-500 col-span-full text-center py-20 text-lg">
            {t("display.noRooms", "No rooms are set up for this display yet.")}
          </p>
        )}
      </div>

      {banner && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 px-6 z-50">
          <div className="bg-white text-slate-900 rounded-3xl px-16 py-12 text-center shadow-2xl max-w-2xl">
            <p className="text-lg uppercase tracking-wide text-slate-500 mb-2">{t("display.nowCalling", "Now calling")}</p>
            <p className="text-5xl font-semibold mb-4">{banner.patientName}</p>
            <p className="text-2xl text-slate-600">
              {t("display.goTo", "{{room}} · Dr. {{doctor}}", { room: banner.roomName, doctor: banner.doctorName })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
