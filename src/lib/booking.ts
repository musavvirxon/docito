/**
 * Single source of truth for patient-facing booking URLs.
 *
 * In production we always point at the public patient domain (`docito.app`)
 * so doctors can share a stable link with their patients. In non-production
 * environments (Lovable preview, staging, localhost) we use the current
 * origin so the link actually resolves to the running app.
 */

export const PUBLIC_BOOKING_ORIGIN = 'https://docito.app';

const PROD_HOSTS = new Set(['docito.app', 'docito.live', 'www.docito.live']);

/** Resolve which origin patient-facing booking links should use. */
export function getPublicBookingOrigin(): string {
  if (typeof window === 'undefined') return PUBLIC_BOOKING_ORIGIN;
  const host = window.location.hostname;
  const isProd = PROD_HOSTS.has(host) || host.endsWith('.docito.live');
  return isProd ? PUBLIC_BOOKING_ORIGIN : window.location.origin;
}

/** Resolve a slug (custom_profile_link or doctor.id) to a full booking URL. */
export function getBookingUrl(slug: string | null | undefined): string {
  const origin = getPublicBookingOrigin();
  if (!slug) return origin;
  return `${origin}/book-appointment/${slug}`;
}

/** In-app navigation path (relative). Use with react-router `navigate`. */
export function getBookingPath(slug: string | null | undefined): string {
  return slug ? `/book-appointment/${slug}` : '/';
}

