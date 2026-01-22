const RELOAD_KEY = "__chunk_reload_attempts__";
const LAST_RELOAD_KEY = "__chunk_last_reload_ts__";

const MAX_ATTEMPTS = 3;
const WINDOW_MS = 5 * 60_000; // 5 minutes

function isChunkLoadError(err: unknown): boolean {
  const msg =
    typeof err === "string"
      ? err
      : (err as any)?.message || (err as any)?.toString?.() || "";

  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk \d+ failed/i.test(msg) ||
    /Importing a module script failed/i.test(msg)
  );
}

async function unregisterServiceWorkers(): Promise<void> {
  try {
    if (!("serviceWorker" in navigator)) return;
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    // ignore
  }
}

async function clearCaches(): Promise<void> {
  try {
    if (!("caches" in window)) return;
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {
    // ignore
  }
}

function bumpReloadAttempt(): { attempts: number; lastTs: number } {
  const now = Date.now();
  const lastTs = Number(sessionStorage.getItem(LAST_RELOAD_KEY) || "0");
  let attempts = Number(sessionStorage.getItem(RELOAD_KEY) || "0");

  // Reset window
  if (!lastTs || now - lastTs > WINDOW_MS) {
    attempts = 0;
  }

  attempts += 1;
  sessionStorage.setItem(RELOAD_KEY, String(attempts));
  sessionStorage.setItem(LAST_RELOAD_KEY, String(now));

  return { attempts, lastTs: now };
}

function hardReloadWithBuster(): void {
  const url = new URL(window.location.href);
  url.searchParams.set("__r", String(Date.now()));
  // Replace to avoid history pollution
  window.location.replace(url.toString());
}

export async function attemptChunkRecovery(err: unknown): Promise<boolean> {
  if (!isChunkLoadError(err)) return false;

  const { attempts } = bumpReloadAttempt();
  if (attempts > MAX_ATTEMPTS) {
    // Give up to avoid infinite reload loop
    return false;
  }

  // Best-effort: prevent SW/caches from serving stale index.html/assets
  await unregisterServiceWorkers();
  await clearCaches();

  hardReloadWithBuster();
  return true;
}

export function installChunkRecoveryGlobalHandlers() {
  // Catch dynamic import failures surfaced as unhandled rejections
  window.addEventListener("unhandledrejection", (event) => {
    // @ts-ignore
    const reason = event?.reason;
    void attemptChunkRecovery(reason);
  });

  // Catch errors that may bubble to window.onerror
  window.addEventListener("error", (event) => {
    // @ts-ignore
    const err = event?.error ?? event?.message;
    void attemptChunkRecovery(err);
  });
}
