import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "./App";
import "./index.css";
import "./i18n/config";

import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Prevent blank screens on Vite/Lovable deploys when the browser has cached old chunk names.
 * If a dynamic import fails ("Failed to fetch dynamically imported module" / chunk load error),
 * we do a single hard reload WITH a cache-busting query param to force fresh assets.
 */
(function installChunkLoadRecovery() {
  const KEY = "chunk_reload_once_v2";

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

  const cacheBustReloadOnce = () => {
    try {
      const already = window.sessionStorage.getItem(KEY);
      if (already === "1") return;
      window.sessionStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }

    const url = new URL(window.location.href);
    url.searchParams.set("__v", String(Date.now()));
    window.location.replace(url.toString());
  };

  window.addEventListener("unhandledrejection", (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    const msg =
      typeof reason === "string"
        ? reason
        : reason?.message
        ? String(reason.message)
        : reason?.toString
        ? String(reason.toString())
        : "";

    if (msg && shouldReloadFor(msg)) cacheBustReloadOnce();
  });

  window.addEventListener("error", (event) => {
    const e = event as ErrorEvent;
    const msg = e?.message ? String(e.message) : "";
    if (msg && shouldReloadFor(msg)) cacheBustReloadOnce();
  });
})();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
);
