// File: src/main.tsx

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

(function installChunkLoadRecovery() {
  const ATTEMPTS_KEY = "__chunk_reload_attempts__";
  const LAST_TS_KEY = "__chunk_reload_last_ts__";

  const MAX_ATTEMPTS = 3;
  const WINDOW_MS = 5 * 60_000; // 5 minutes

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
    } catch {
      // ignore
    }

    // Reset attempts if outside window
    if (!lastTs || now - lastTs > WINDOW_MS) {
      attempts = 0;
    }

    attempts += 1;

    try {
      window.sessionStorage.setItem(ATTEMPTS_KEY, String(attempts));
      window.sessionStorage.setItem(LAST_TS_KEY, String(now));
    } catch {
      // ignore
    }

    return attempts;
  };

  const unregisterServiceWorkers = async () => {
    try {
      if (!("serviceWorker" in navigator)) return;
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch {
      // ignore
    }
  };

  const clearCaches = async () => {
    try {
      if (!("caches" in window)) return;
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {
      // ignore
    }
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

  const extractMessage = (reason: any) => {
    if (!reason) return "";
    if (typeof reason === "string") return reason;
    if (typeof reason?.message === "string") return reason.message;
    try {
      return String(reason);
    } catch {
      return "";
    }
  };

  window.addEventListener("unhandledrejection", (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    const msg = extractMessage(reason);
    if (msg && shouldReloadFor(msg)) {
      void cacheBustReload();
    }
  });

  window.addEventListener("error", (event) => {
    const e = event as ErrorEvent;
    const msg = e?.message ? String(e.message) : "";
    if (msg && shouldReloadFor(msg)) {
      void cacheBustReload();
    }
  });
})();

// Proactively unregister any Service Worker that might cache old assets/index.html
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {
      // ignore
    });
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
