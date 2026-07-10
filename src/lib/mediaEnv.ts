// Helpers for diagnosing camera/microphone access failures — mostly the
// Lovable preview iframe, which lacks `allow="camera; microphone; display-capture"`.
import { getPublicAppUrl } from '@/lib/publicUrl';


export const isInIframe = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin frame access throws — that itself means we're framed.
    return true;
  }
};

export const isSecureMediaContext = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (window.isSecureContext) return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

export const featurePolicyBlocks = (feature: 'camera' | 'microphone' | 'display-capture'): boolean => {
  try {
    const fp = (document as any).featurePolicy || (document as any).permissionsPolicy;
    if (fp && typeof fp.allowsFeature === 'function') {
      return fp.allowsFeature(feature) === false;
    }
  } catch { /* noop */ }
  return false;
};

export const openCallInNewTab = () => {
  try {
    // Build the canonical URL on the real production origin so the new
    // tab never lands back on the Lovable preview iframe host.
    // Lazy-imported to avoid a circular dep with publicUrl.ts.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getPublicAppUrl } = require('@/lib/publicUrl') as typeof import('@/lib/publicUrl');
    const origin = getPublicAppUrl();
    const url = `${origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win && window.top) {
      (window.top as Window).location.href = url;
    }
  } catch {
    try {
      const win = window.open(window.location.href, '_blank', 'noopener,noreferrer');
      if (!win) window.location.reload();
    } catch { /* noop */ }
  }
};

