import { useState, useEffect, useCallback, useRef } from "react";

// A tiny static file on the cloud deployment used only as a reachability
// probe. Create public/ping.txt containing the text "ok" so this exists.
const CLOUD_PROBE_URL = "https://demo.careinn.com/ping.txt";
const LAST_CONTACT_KEY = "careinn-last-cloud-contact";
const PROBE_TIMEOUT_MS = 4000;
const REFRESH_AVAILABLE_MS = 30 * 60 * 1000; // 30 min
const TICK_MS = 60 * 1000;                    // recompute "ago" text

export type ConnState = "connected" | "stale" | "offline";

export function getLastContact(): number | null {
  const raw = localStorage.getItem(LAST_CONTACT_KEY);
  return raw ? parseInt(raw, 10) : null;
}
function setLastContact(ts: number) {
  localStorage.setItem(LAST_CONTACT_KEY, String(ts));
}

export async function probeCloud(): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(`${CLOUD_PROBE_URL}?t=${Date.now()}`, {
      method: "GET", mode: "no-cors", cache: "no-store",
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return true;          // resolved = reachable (opaque response is fine)
  } catch {
    clearTimeout(timer);
    return false;         // network error / timeout = unreachable
  }
}

export function timeAgo(ts: number | null): string {
  if (!ts) return "";
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function useConnectionStatus() {
  const [online, setOnline] = useState<boolean>(
    () => (typeof navigator !== "undefined" ? navigator.onLine : true)
  );
  // optimistic so we don't flash yellow before the first probe resolves
  const [cloudReachable, setCloudReachable] = useState(true);
  const [lastContact, setLastContactState] =
    useState<number | null>(getLastContact);
  const [refreshAvailable, setRefreshAvailable] = useState(false);
  const [, tick] = useState(0);
  const probing = useRef(false);

  const runProbe = useCallback(async () => {
    if (probing.current) return;
    probing.current = true;
    const ok = await probeCloud();
    probing.current = false;
    setCloudReachable(ok);
    if (ok) {
      const now = Date.now();
      setLastContact(now);
      setLastContactState(now);
    }
  }, []);

  useEffect(() => {
    const goOnline  = () => { setOnline(true); runProbe(); };
    const goOffline = () => { setOnline(false); setCloudReachable(false); };
    const androidNet = (e: Event) => {
      const d = (e as CustomEvent).detail;
      d?.online ? goOnline() : goOffline();
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener("network-status", androidNet as EventListener);
    if (online) runProbe();   // initial probe
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("network-status",
        androidNet as EventListener);
    };
  // run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reveal refresh icon every 30 min (no network call)
  useEffect(() => {
    const t = setInterval(() => setRefreshAvailable(true),
      REFRESH_AVAILABLE_MS);
    return () => clearInterval(t);
  }, []);

  // recompute "ago" text every minute (no network call)
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), TICK_MS);
    return () => clearInterval(t);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshAvailable(false);
    await runProbe();
    // ask the rest of the app to re-fetch data for any updates
    window.dispatchEvent(new CustomEvent("careinn-manual-refresh"));
  }, [runProbe]);

  const state: ConnState = !online
    ? "offline"
    : cloudReachable ? "connected" : "stale";

  return { state, lastContact, refreshAvailable, refresh };
}
