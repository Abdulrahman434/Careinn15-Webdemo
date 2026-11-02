import type { PinService, PinResult, PinLockState } from "./PinService";
import { validateNewPin, lockoutDurationMs } from "./pinPolicy";
import {
  PIN_MAX_ATTEMPTS, PIN_LOCKOUT_SCHEDULE_MS, PIN_STORAGE_KEYS,
} from "./pinConfig";

/* ═══════════════════════════════════════════════════════════════════════════
 * MockPinService — a STAND-IN for the hospital PIN API. NOT SECURE.
 *
 * It exists so the UI can be built and tested before the backend exists.
 * It runs entirely in this browser, so anyone with access to the device can
 * read or change what it does. Do not ship it as the real PIN check.
 *
 * What it simulates:
 *  - The PIN "server record" is a salted hash held in JS memory only. It is
 *    never written to storage, so a page refresh behaves like a server that
 *    lost its data: hasPin stays true but verifyPin answers "unavailable"
 *    and the patient must use Forgot PIN. A real server would not do this.
 *  - The attempt counter, lock level and lock expiry are persisted (no PIN in
 *    them) so a lockout survives a refresh, as the real server's would.
 *  - Latency, network failures and hangs can be injected for testing.
 *
 * Replace with the real API client via setPinServiceImpl() in pinClient.ts.
 * ═══════════════════════════════════════════════════════════════════════════ */

interface ServerState {
  hasPin: boolean;
  failedAttempts: number;
  lockLevel: number;
  lockedUntil: number | null;
}

const EMPTY: ServerState = { hasPin: false, failedAttempts: 0, lockLevel: 0, lockedUntil: null };

export interface MockPinOptions {
  latencyMs?: number;
  now?: () => number;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
}

export class MockPinService implements PinService {
  private latencyMs: number;
  private now: () => number;
  private storage: MockPinOptions["storage"] | null;
  /** In-memory only. Never persisted, never logged. */
  private record: { salt: string; hash: string } | null = null;
  private nextFailure: "network" | "hang" | null = null;

  constructor(opts: MockPinOptions = {}) {
    this.latencyMs = opts.latencyMs ?? 400;
    this.now = opts.now ?? (() => Date.now());
    this.storage = opts.storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
  }

  /* ── test controls ── */
  failNext(kind: "network" | "hang"): void { this.nextFailure = kind; }
  setLatency(ms: number): void { this.latencyMs = ms; }

  /* ── PinService ── */

  async setPin(pin: string): Promise<PinResult> {
    await this.respond();
    if (validateNewPin(pin)) return { ok: false, error: "invalid" };
    this.record = await this.hash(pin);
    // BACKEND-REQUIRED: persist the hash server-side, scoped to patient + admission.
    this.save({ ...EMPTY, hasPin: true });
    return { ok: true, value: undefined };
  }

  async verifyPin(pin: string): Promise<PinResult> {
    await this.respond();
    const s = this.load();
    const now = this.now();

    if (s.lockedUntil && now < s.lockedUntil) return { ok: false, error: "locked", lock: this.view(s) };
    if (s.lockedUntil && now >= s.lockedUntil) s.lockedUntil = null;
    if (!s.hasPin) return { ok: false, error: "no-pin", lock: this.view(s) };
    // Mock-only: the in-memory record was lost on refresh (see header).
    if (!this.record) return { ok: false, error: "unavailable", lock: this.view(s) };

    const candidate = await this.hash(pin, this.record.salt);
    if (candidate.hash === this.record.hash) {
      this.save({ ...s, failedAttempts: 0, lockLevel: 0, lockedUntil: null });
      return { ok: true, value: undefined };
    }

    // BACKEND-REQUIRED: this counter must live on the server, because browser storage can be cleared.
    s.failedAttempts += 1;
    if (s.failedAttempts >= PIN_MAX_ATTEMPTS) {
      s.lockLevel += 1;
      s.failedAttempts = 0;
      s.lockedUntil = now + lockoutDurationMs(s.lockLevel, PIN_LOCKOUT_SCHEDULE_MS);
      this.save(s);
      return { ok: false, error: "locked", lock: this.view(s) };
    }
    this.save(s);
    return { ok: false, error: "wrong", lock: this.view(s) };
  }

  async requestReset(): Promise<PinResult> {
    await this.respond();
    // BACKEND-REQUIRED: require a freshly re-authenticated patient session.
    this.record = null;
    this.save({ ...EMPTY });
    return { ok: true, value: undefined };
  }

  async getLockState(): Promise<PinResult<PinLockState>> {
    await this.respond();
    return { ok: true, value: this.view(this.load()) };
  }

  async clearOnDischarge(): Promise<void> {
    // BACKEND-REQUIRED: delete the stored PIN per the hospital retention policy.
    this.record = null;
    try { this.storage?.removeItem(PIN_STORAGE_KEYS.mockServerState); } catch { /* ignore */ }
  }

  /* ── internals ── */

  private async respond(): Promise<void> {
    const failure = this.nextFailure;
    this.nextFailure = null;
    if (failure === "hang") await new Promise(() => { /* never resolves */ });
    if (this.latencyMs > 0) await new Promise(r => setTimeout(r, this.latencyMs));
    if (failure === "network") throw new TypeError("Failed to fetch");
  }

  private view(s: ServerState): PinLockState {
    const lockedUntil = s.lockedUntil && s.lockedUntil > this.now() ? s.lockedUntil : null;
    return { hasPin: s.hasPin, failedAttempts: s.failedAttempts, lockedUntil };
  }

  private load(): ServerState {
    try {
      const raw = this.storage?.getItem(PIN_STORAGE_KEYS.mockServerState);
      if (!raw) return { ...EMPTY };
      const p = JSON.parse(raw);
      return {
        hasPin: !!p.hasPin,
        failedAttempts: Number(p.failedAttempts) || 0,
        lockLevel: Number(p.lockLevel) || 0,
        lockedUntil: typeof p.lockedUntil === "number" ? p.lockedUntil : null,
      };
    } catch { return { ...EMPTY }; }
  }

  private save(s: ServerState): void {
    try { this.storage?.setItem(PIN_STORAGE_KEYS.mockServerState, JSON.stringify(s)); } catch { /* ignore */ }
  }

  private async hash(pin: string, salt?: string): Promise<{ salt: string; hash: string }> {
    const useSalt = salt ?? Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    const input = useSalt + pin;
    // crypto.subtle is missing on plain-http origins (some kiosk installs).
    // This mock record lives in memory only, so a simple digest is enough
    // there; the real server must use a slow salted hash.
    if (!crypto?.subtle) {
      let h = 0x811c9dc5;
      for (let i = 0; i < input.length; i++) { h ^= input.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
      return { salt: useSalt, hash: h.toString(16) };
    }
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    return { salt: useSalt, hash };
  }
}
