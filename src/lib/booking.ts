/**
 * Single source of truth for patient-facing booking URLs.
 *
 * In production we always point at the public patient domain (`docito.app`)
 * so doctors can share a stable link with their patients. In non-production
 * environments (Lovable preview, staging, localhost) we use the current
 * origin so the link actually resolves to the running app.
 */

export const PUBLIC_BOOKING_ORIGIN = 'https://docito.app';

/** Resolve which origin patient-facing booking links should use.
 *  Always returns the canonical patient domain so shared links are stable
 *  regardless of which host (preview, staging, docito.live, etc.) the
 *  doctor is currently viewing the dashboard from. */
export function getPublicBookingOrigin(): string {
  return PUBLIC_BOOKING_ORIGIN;
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

