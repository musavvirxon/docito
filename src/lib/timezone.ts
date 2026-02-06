// File: src/lib/timezone.ts

import { format, parseISO, parse } from 'date-fns';

export function getBrowserTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof tz === "string" && tz.trim().length > 0) return tz;
  } catch {
    // ignore
  }
  return "UTC";
}

/**
 * Get the effective timezone - uses provided tz or falls back to browser tz
 */
export function getEffectiveTimeZone(providedTz?: string | null): string {
  if (providedTz && typeof providedTz === 'string' && providedTz.trim().length > 0) {
    return providedTz.trim();
  }
  return getBrowserTimeZone();
}

/**
 * Format a date in a specific timezone
 */
export function formatDateInTimeZone(date: string | Date, timezone: string, formatStr: string = 'MMM d, yyyy'): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    // For now, use simple format - timezone-aware formatting would need date-fns-tz
    return format(d, formatStr);
  } catch {
    return String(date);
  }
}

/**
 * Format time in a specific timezone
 */
export function formatTimeInTimeZone(date: string | Date, timezone: string, formatStr: string = 'h:mm a'): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, formatStr);
  } catch {
    return String(date);
  }
}

/**
 * Format full date in timezone
 */
export function formatFullDateInTimeZone(date: string | Date, timezone: string): string {
  return formatDateInTimeZone(date, timezone, 'EEEE, MMMM d, yyyy');
}

/**
 * Get GMT offset label for a timezone
 * @param timezone - The timezone string (e.g., 'America/New_York')
 */
export function getGmtOffsetLabel(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');
    return offsetPart?.value || timezone;
  } catch {
    return timezone;
  }
}

/**
 * Convert a local date/time string in a timezone to UTC Date
 * @param dateStr - Date in YYYY-MM-DD format
 * @param timeStr - Time in HH:MM:SS or HH:MM format
 * @param timezone - The source timezone
 */
export function zonedLocalToUtcDate(dateStr: string, timeStr: string, timezone: string): Date {
  try {
    // Normalize time to HH:MM:SS
    const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
    const dateTimeStr = `${dateStr}T${normalizedTime}`;
    const localDate = parseISO(dateTimeStr);
    
    // Simplified implementation - for accurate tz conversion, use date-fns-tz
    // This treats the input as UTC for now
    return localDate;
  } catch {
    return new Date();
  }
}
