/**
 * Canonical public origin used for shareable links (e.g. waiting-room
 * display screens). The Lovable preview host must never be pasted into
 * an on-premise TV browser, so we normalize to the real production
 * domain unless the admin is already on a real production host.
 */
export function getPublicAppUrl(): string {
  if (typeof window === "undefined") return "https://docito.app";
  const host = window.location.hostname;

  // Keep docito.live users on their own canonical origin so nothing changes for them.
  if (host === "docito.live" || host === "www.docito.live") {
    return "https://docito.live";
  }

  // Preview, lovable subdomains, localhost, or any other non-production host → docito.app.
  return "https://docito.app";
}
