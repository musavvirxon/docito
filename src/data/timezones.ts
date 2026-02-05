// File: src/data/timezones.ts
export const COMMON_TIMEZONES = [
  "UTC",
  "Asia/Tashkent",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Moscow",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Sao_Paulo",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Australia/Sydney",
] as const;

export type CommonTimezone = (typeof COMMON_TIMEZONES)[number];
