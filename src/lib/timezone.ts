export type TimeZoneString = string;

const DEFAULT_TZ = 'UTC';

export function getBrowserTimeZone(): TimeZoneString {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === 'string' && tz.length > 0 ? tz : DEFAULT_TZ;
  } catch {
    return DEFAULT_TZ;
  }
}

export function getEffectiveTimeZone(tz?: string | null): TimeZoneString {
  const v = (tz || '').trim();
  return v.length > 0 ? v : getBrowserTimeZone();
}

type Parts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function getDtf(timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${timeZone}::${JSON.stringify(options)}`;
  const cached = dtfCache.get(key);
  if (cached) return cached;
  const dtf = new Intl.DateTimeFormat(undefined, { timeZone, ...options });
  dtfCache.set(key, dtf);
  return dtf;
}

function partsFromDate(date: Date, timeZone: string): Parts {
  const dtf = getDtf(timeZone, {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const p = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of p) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/**
 * Returns the time zone offset in milliseconds for the given instant.
 * Positive means the time zone is ahead of UTC.
 */
export function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const z = partsFromDate(date, timeZone);
  const asUTC = Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second);
  return asUTC - date.getTime();
}

function parseTimeToHMS(time: string): { h: number; m: number; s: number } {
  const t = time.trim();
  const [hh, mm, ss] = t.split(':');
  const h = Number(hh ?? 0);
  const m = Number(mm ?? 0);
  const s = Number(ss ?? 0);
  return {
    h: Number.isFinite(h) ? h : 0,
    m: Number.isFinite(m) ? m : 0,
    s: Number.isFinite(s) ? s : 0,
  };
}

function parseYMD(dateStr: string): { y: number; mo: number; d: number } {
  const [y, mo, d] = dateStr.split('-').map((x) => Number(x));
  return {
    y: Number.isFinite(y) ? y : 1970,
    mo: Number.isFinite(mo) ? mo : 1,
    d: Number.isFinite(d) ? d : 1,
  };
}

/**
 * Convert a local date+time in a given IANA time zone to a UTC Date.
 * dateStr: YYYY-MM-DD
 * timeStr: HH:MM or HH:MM:SS
 */
export function zonedLocalToUtcDate(dateStr: string, timeStr: string, timeZone: string): Date {
  const tz = getEffectiveTimeZone(timeZone);
  const { y, mo, d } = parseYMD(dateStr);
  const { h, m, s } = parseTimeToHMS(timeStr);

  // Initial guess: interpret the local wall time as UTC.
  const guess = new Date(Date.UTC(y, mo - 1, d, h, m, s));

  // Compute tz offset at the guess instant, then correct.
  const offset = getTimeZoneOffsetMs(guess, tz);
  return new Date(guess.getTime() - offset);
}

export function formatTimeInTimeZone(value: Date | string, timeZone: string): string {
  const tz = getEffectiveTimeZone(timeZone);
  const date = typeof value === 'string' ? new Date(value) : value;
  return getDtf(tz, { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function formatDateInTimeZone(value: Date | string, timeZone: string): string {
  const tz = getEffectiveTimeZone(timeZone);
  const date = typeof value === 'string' ? new Date(value) : value;
  return getDtf(tz, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function formatWeekdayDateInTimeZone(value: Date | string, timeZone: string): string {
  const tz = getEffectiveTimeZone(timeZone);
  const date = typeof value === 'string' ? new Date(value) : value;
  return getDtf(tz, { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
}

export function formatFullDateInTimeZone(value: Date | string, timeZone: string): string {
  const tz = getEffectiveTimeZone(timeZone);
  const date = typeof value === 'string' ? new Date(value) : value;
  return getDtf(tz, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

export function getISODateInTimeZone(value: Date | string, timeZone: string): string {
  const tz = getEffectiveTimeZone(timeZone);
  const date = typeof value === 'string' ? new Date(value) : value;
  const p = partsFromDate(date, tz);
  const mm = String(p.month).padStart(2, '0');
  const dd = String(p.day).padStart(2, '0');
  return `${p.year}-${mm}-${dd}`;
}

export function getGmtOffsetLabel(value: Date | string, timeZone: string): string {
  const tz = getEffectiveTimeZone(timeZone);
  const date = typeof value === 'string' ? new Date(value) : value;
  const offset = getTimeZoneOffsetMs(date, tz); // ms ahead of UTC
  const totalMinutes = Math.round(offset / 60000);
  const sign = totalMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(totalMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `GMT${sign}${hh}:${mm}`;
}
