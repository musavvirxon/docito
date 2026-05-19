import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "./App";
import "./index.css";
import "./i18n/config";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Defer chunk load recovery to avoid blocking main thread.
// Safari (macOS + iOS) does not implement requestIdleCallback, so we fall back
// to setTimeout to avoid a top-level ReferenceError that would prevent React
// from mounting at all (the splash screen would stay forever).
const scheduleIdle = (cb: () => void, timeout = 2000) => {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
      .requestIdleCallback(cb, { timeout });
  } else {
    setTimeout(cb, 1);
  }
};

scheduleIdle(() => {
  const ATTEMPTS_KEY = "__chunk_reload_attempts__";
  const LAST_TS_KEY = "__chunk_reload_last_ts__";
  const MAX_ATTEMPTS = 8;
  const WINDOW_MS = 10 * 60_000;

  const shouldReloadFor = (msg: string) => {
    const m = msg.toLowerCase();
    return (
      m.includes("failed to fetch dynamically imported module") ||
      m.includes("loading chunk") ||
      m.includes("chunkloaderror") ||
      m.includes("importing a module script failed") ||
      (m.includes("module script") && m.includes("failed"))
    );
  };

  const bumpAttempt = () => {
    const now = Date.now();
    let attempts = 0;
    let lastTs = 0;
    try {
      attempts = Number(window.sessionStorage.getItem(ATTEMPTS_KEY) || "0");
      lastTs = Number(window.sessionStorage.getItem(LAST_TS_KEY) || "0");
    } catch { /* ignore */ }
    if (!lastTs || now - lastTs > WINDOW_MS) attempts = 0;
    attempts += 1;
    try {
      window.sessionStorage.setItem(ATTEMPTS_KEY, String(attempts));
      window.sessionStorage.setItem(LAST_TS_KEY, String(now));
    } catch { /* ignore */ }
    return attempts;
  };

  const unregisterServiceWorkers = async () => {
    try {
      if (!("serviceWorker" in navigator)) return;
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch { /* ignore */ }
  };

  const clearCaches = async () => {
    try {
      if (!("caches" in window)) return;
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch { /* ignore */ }
  };

  const cacheBustReload = async () => {
    const attempt = bumpAttempt();
    if (attempt > MAX_ATTEMPTS) return;
    await unregisterServiceWorkers();
    await clearCaches();
    const url = new URL(window.location.href);
    url.searchParams.set("__v", String(Date.now()));
    window.location.replace(url.toString());
  };

  const extractMessage = (reason: unknown) => {
    if (!reason) return "";
    if (typeof reason === "string") return reason;
    if (typeof (reason as { message?: string })?.message === "string") return (reason as { message: string }).message;
    try { return String(reason); } catch { return ""; }
  };

  window.addEventListener("unhandledrejection", (event) => {
    const msg = extractMessage((event as PromiseRejectionEvent).reason);
    if (msg && shouldReloadFor(msg)) void cacheBustReload();
  });

  window.addEventListener("error", (event) => {
    const msg = (event as ErrorEvent)?.message ? String((event as ErrorEvent).message) : "";
    if (msg && shouldReloadFor(msg)) void cacheBustReload();
  });

  window.setTimeout(() => {
    try {
      window.sessionStorage.removeItem(ATTEMPTS_KEY);
      window.sessionStorage.removeItem(LAST_TS_KEY);
    } catch { /* ignore */ }
  }, 12_000);

  // Unregister service workers
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => { /* ignore */ });
  }
});

// Hide initial loader once React takes over rendering
function hideInitialLoader() {
  const loader = document.getElementById('initial-loader');
  if (!loader) return;
  // Immediately hide via inline style (fastest visual switch)
  loader.style.opacity = '0';
  loader.style.pointerEvents = 'none';
  // Defer DOM removal to idle time to avoid layout thrash
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => loader.remove());
  } else {
    setTimeout(() => loader.remove(), 100);
  }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>,
);

// Loader hides after React has mounted and painted
hideInitialLoader();
