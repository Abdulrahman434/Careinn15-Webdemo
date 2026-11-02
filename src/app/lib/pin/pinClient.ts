import { useEffect, useState } from "react";
import type { PinService, PinResult, PinLockState } from "./PinService";
import { MockPinService } from "./MockPinService";
import { pinSession } from "./pinSession";
import {
  PIN_REQUEST_TIMEOUT_MS, PIN_RECONNECT_POLL_MS, LEGACY_PIN_HASH_KEY,
} from "./pinConfig";

/* ═══════════════════════════════════════════════════════════════════════════
 * pinClient — wraps whichever PinService is active with:
 *   - fail-closed offline handling (navigator.onLine + failed requests),
 *   - a hard request timeout,
 *   - automatic recovery polling while offline,
 *   - the cached hasPin flag in pinSession.
 * UI code calls getPinService() and nothing else.
 * ═══════════════════════════════════════════════════════════════════════════ */

let impl: PinService = new MockPinService();
let timeoutMs = PIN_REQUEST_TIMEOUT_MS;

/** Swap the implementation (the real API client, or a test double). */
export function setPinServiceImpl(next: PinService): void { impl = next; }

/** Tests only: shorten the timeout so a "hang" does not take 10 s. */
export function setPinRequestTimeoutForTests(ms: number): void { timeoutMs = ms; }

/* ── connectivity ─────────────────────────────────────────────────────── */

type OnlineListener = (online: boolean) => void;
const onlineListeners = new Set<OnlineListener>();

/** Browser / Android radio state. Only an explicit `false` counts as offline
 *  so non-browser runtimes (tests) are not treated as offline. */
let deviceOnline = typeof navigator === "undefined" || navigator.onLine !== false;
/** False after a request failed at the network level, until one succeeds. */
let serverReachable = true;
let consecutiveFailures = 0;
let pollTimer: ReturnType<typeof setInterval> | null = null;

export function isPinOnline(): boolean { return deviceOnline && serverReachable; }
export function getConsecutivePinFailures(): number { return consecutiveFailures; }

function emitOnline() {
  const v = isPinOnline();
  onlineListeners.forEach(l => { try { l(v); } catch { /* ignore */ } });
  if (v) stopPolling(); else startPolling();
}

function startPolling() {
  if (pollTimer || !deviceOnline) return;
  pollTimer = setInterval(() => { void probe(); }, PIN_RECONNECT_POLL_MS);
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

/** Re-check the PIN backend directly (bypasses the offline short-circuit). */
async function probe(): Promise<void> {
  if (!deviceOnline) return;
  const r = await withTimeout(() => impl.getLockState());
  if (r.ok) {
    serverReachable = true;
    consecutiveFailures = 0;
    pinSession.setHasPin(r.value.hasPin);
    emitOnline();
  }
}

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("online", () => { deviceOnline = true; emitOnline(); void probe(); });
  window.addEventListener("offline", () => { deviceOnline = false; emitOnline(); });
  // The Android shell reports connectivity on this event (see connectionStatus.ts).
  window.addEventListener("network-status", (e: Event) => {
    const online = !!(e as CustomEvent).detail?.online;
    deviceOnline = online;
    emitOnline();
    if (online) void probe();
  });
}

export function subscribePinOnline(l: OnlineListener): () => void {
  onlineListeners.add(l);
  return () => { onlineListeners.delete(l); };
}

export function usePinOnline(): boolean {
  const [v, setV] = useState(isPinOnline);
  useEffect(() => subscribePinOnline(setV), []);
  return v;
}

/** Manual "Retry" on the offline message. */
export function retryPinConnection(): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.onLine !== false) deviceOnline = true;
  return probe();
}

/* ── call wrapper ─────────────────────────────────────────────────────── */

async function withTimeout<T>(fn: () => Promise<PinResult<T>>): Promise<PinResult<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<PinResult<T>>(resolve => {
    timer = setTimeout(() => resolve({ ok: false, error: "timeout" }), timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve().then(fn), timeout]);
  } catch {
    // Never forward the error object: a real client's error could echo the
    // request body, which would contain the PIN.
    return { ok: false, error: "network" };
  } finally {
    clearTimeout(timer);
  }
}

async function run<T>(fn: () => Promise<PinResult<T>>): Promise<PinResult<T>> {
  if (!isPinOnline()) return { ok: false, error: "offline" };
  const r = await withTimeout(fn);
  if (!r.ok && (r.error === "network" || r.error === "timeout")) {
    consecutiveFailures++;
    if (r.error === "network") { serverReachable = false; emitOnline(); }
  } else {
    consecutiveFailures = 0;
    if (!serverReachable) { serverReachable = true; emitOnline(); }
  }
  return r;
}

function track(r: PinResult<any>, lock?: PinLockState) {
  const l = lock ?? (!r.ok ? r.lock : undefined);
  if (l) pinSession.setHasPin(l.hasPin);
}

const wrapped: PinService = {
  async setPin(pin) {
    const r = await run(() => impl.setPin(pin));
    if (r.ok) pinSession.setHasPin(true);
    else track(r);
    return r;
  },
  async verifyPin(pin) {
    const r = await run(() => impl.verifyPin(pin));
    if (r.ok) pinSession.markUnlocked();
    else track(r);
    return r;
  },
  async requestReset() {
    const r = await run(() => impl.requestReset());
    if (r.ok) { pinSession.lock(); pinSession.setHasPin(false); }
    return r;
  },
  async getLockState() {
    const r = await run(() => impl.getLockState());
    if (r.ok) track(r, r.value);
    return r;
  },
  async clearOnDischarge() {
    // Must work offline and must never throw: it only forgets things.
    try { await impl.clearOnDischarge(); } catch { /* still clear locally */ }
    consecutiveFailures = 0;
    pinSession.reset();
  },
};

export function getPinService(): PinService { return wrapped; }

/** Removes the pre-6-digit PIN hash (lib/accountAuth) from this device.
 *  Wired at startup in a later step, together with moving the per-app locks
 *  onto PinService — doing it earlier would leave those locks with no PIN. */
export function purgeLegacyPinHash(): void {
  try { localStorage.removeItem(LEGACY_PIN_HASH_KEY); } catch { /* ignore */ }
}
