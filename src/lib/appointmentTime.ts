// File: src/lib/appointmentTime.ts

import {
  formatDateInTimeZone,
  formatTimeInTimeZone,
  getEffectiveTimeZone,
  zonedLocalToUtcDate,
} from "@/lib/timezone";

export type AppointmentLike = {
  appointment_date?: string | null; // YYYY-MM-DD
  start_time?: string | null; // HH:MM:SS or HH:MM
  end_time?: string | null; // HH:MM:SS or HH:MM
};

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function normalizeDate(dateStr: string): string {
  const v = dateStr.trim();
  // Expect YYYY-MM-DD; if not, try to coerce from ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const isoMatch = v.match(/^(\d{4}-\d{2}-\d{2})/);
  return isoMatch?.[1] ?? "";
}

function normalizeTime(timeStr: string): string {
  const v = timeStr.trim();
  if (!v) return "";
  // Accept HH:MM or HH:MM:SS, keep HH:MM:SS
  const m = v.match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return "";
  const hh = m[1];
  const mm = m[2];
  const ss = m[3] ?? "00";
  return `${hh}:${mm}:${ss}`;
}

export function getAppointmentUtcRange(
  appt: AppointmentLike,
  sourceTimeZone: string,
): { startUtc: Date | null; endUtc: Date | null; sourceTimeZone: string } {
  const srcTz = getEffectiveTimeZone(sourceTimeZone);

  const date = normalizeDate(safeStr(appt.appointment_date));
  const start = normalizeTime(safeStr(appt.start_time));
  const end = normalizeTime(safeStr(appt.end_time));

  if (!date || !start) return { startUtc: null, endUtc: null, sourceTimeZone: srcTz };

  const startUtc = zonedLocalToUtcDate(date, start, srcTz);

  let endUtc: Date | null = null;
  if (end) {
    endUtc = zonedLocalToUtcDate(date, end, srcTz);
    if (endUtc.getTime() <= startUtc.getTime()) {
      endUtc = new Date(endUtc.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  return { startUtc, endUtc, sourceTimeZone: srcTz };
}

export function formatAppointmentForViewer(params: {
  appt: AppointmentLike;
  sourceTimeZone: string;
  viewerTimeZone: string;
  includeEnd?: boolean;
}): {
  startUtc: Date | null;
  endUtc: Date | null;
  dateLabel: string;
  timeLabel: string;
  combinedLabel: string;
  sourceTimeZone: string;
  viewerTimeZone: string;
} {
  const viewerTz = getEffectiveTimeZone(params.viewerTimeZone);
  const { startUtc, endUtc, sourceTimeZone } = getAppointmentUtcRange(params.appt, params.sourceTimeZone);

  if (!startUtc) {
    return {
      startUtc: null,
      endUtc: null,
      dateLabel: "",
      timeLabel: "",
      combinedLabel: "",
      sourceTimeZone,
      viewerTimeZone: viewerTz,
    };
  }

  const dateLabel = formatDateInTimeZone(startUtc, viewerTz);

  const showEnd = params.includeEnd !== false && !!endUtc;

  const timeLabel = showEnd && endUtc
    ? `${formatTimeInTimeZone(startUtc, viewerTz)} – ${formatTimeInTimeZone(endUtc, viewerTz)}`
    : `${formatTimeInTimeZone(startUtc, viewerTz)}`;

  const combinedLabel = `${dateLabel} • ${timeLabel}`;

  return {
    startUtc,
    endUtc,
    dateLabel,
    timeLabel,
    combinedLabel,
    sourceTimeZone,
    viewerTimeZone: viewerTz,
  };
}

export function isoLocalToUtcFromSourceTz(isoLocal: string, sourceTimeZone: string): Date | null {
  const srcTz = getEffectiveTimeZone(sourceTimeZone);
  const raw = safeStr(isoLocal).trim();
  if (!raw) return null;

  const m = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?/);
  if (!m) return null;

  const date = m[1];
  const time = `${m[2]}:${m[3] ?? "00"}`;
  return zonedLocalToUtcDate(date, time, srcTz);
}

export function isIsoLocalInPastFromSourceTz(isoLocal: string, sourceTimeZone: string, nowMs = Date.now()): boolean {
  const utc = isoLocalToUtcFromSourceTz(isoLocal, sourceTimeZone);
  if (!utc) return true;
  return utc.getTime() <= nowMs;
}
