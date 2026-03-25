/**
 * Detects if the current hostname is a known landing subdomain.
 * Returns true for landing.docito.live and landing.docito.app.
 */
export function isLandingSubdomain(): boolean {
  const hostname = window.location.hostname;
  return (
    hostname === 'landing.docito.live' ||
    hostname === 'landing.docito.app'
  );
}

/** Returns the main site origin for redirects from subdomains */
export function getMainSiteUrl(): string {
  const hostname = window.location.hostname;
  if (hostname === 'landing.docito.live') return 'https://docito.live';
  if (hostname === 'landing.docito.app') return 'https://docito.app';
  return window.location.origin;
}
