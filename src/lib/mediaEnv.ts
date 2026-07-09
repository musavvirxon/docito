// Helpers for diagnosing camera/microphone access failures — mostly the
// Lovable preview iframe, which lacks `allow="camera; microphone; display-capture"`.

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
    const url = window.location.href;
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win && window.top) {
      // Popup blocked — fall back to top-level navigation.
      (window.top as Window).location.href = url;
    }
  } catch {
    window.location.href = window.location.href;
  }
};
