/**
 * Single source of truth for patient-facing booking URLs.
 *
 * Public booking links always point at the production patient domain
 * (`docito.app`) so doctors can share a stable URL with their patients
 * regardless of which environment they're using internally.
 */

export const PUBLIC_BOOKING_ORIGIN = 'https://docito.app';

/** Resolve a slug (custom_profile_link or doctor.id) to a full booking URL. */
export function getBookingUrl(slug: string | null | undefined): string {
  if (!slug) return PUBLIC_BOOKING_ORIGIN;
  return `${PUBLIC_BOOKING_ORIGIN}/book-appointment/${slug}`;
}

/** In-app navigation path (relative). Use with react-router `navigate`. */
export function getBookingPath(slug: string | null | undefined): string {
  return slug ? `/book-appointment/${slug}` : '/';
}
