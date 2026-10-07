/**
 * One phone-remote session at a time, owned by the terminal.
 *
 * Lifecycle: off → starting → waiting (QR on screen) → connected. A phone
 * that drops (screen lock, network) can come back while the session lives;
 * the session ends on its own after 2 minutes without a scan, 10 minutes
 * without input, or 2 hours in total, and the app ends it on sign-out or a
 * new admission (see RemoteControl).
 */
import { keyFor, newSecret, roomIdFor, seal, unseal } from "./remoteCrypto";
import {
  longPress, moveBy, onFieldLeft, pressEnter, resetRemoteInput, scrollBy, setText, tap,
  type TapOutcome,
} from "./remoteInput";

export const DEFAULT_RELAY_URL = "wss://careinn-remote.abalfaqih.workers.dev";
const RELAY_URL: string = (import.meta.env.VITE_REMOTE_RELAY_URL as string | undefined) || DEFAULT_RELAY_URL;

const PAIR_TIMEOUT_MS = 2 * 60 * 1000;
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_SESSION_MS = 2 * 60 * 60 * 1000;

export type RemotePhase = "off" | "starting" | "waiting" | "connected";
export type RemoteEndReason = "cancelled" | "code-expired" | "expired" | "idle" | "ended" | "unreachable" | "lost" | "signed-out";

export interface RemoteState {
  phase: RemotePhase;
  /** URL the QR code encodes. */
  pairUrl?: string;
  pairExpiresAt?: number;
  /** A phone has paired during this session (so "waiting" means it dropped). */
  phoneSeen: boolean;
  /** Why the last session ended, until the next one starts. */
  endReason?: RemoteEndReason;
}

type PhoneMessage =
  | { t: "m"; x: number; y: number }
  | { t: "tap" }
  | { t: "long" }
  | { t: "scroll"; y: number }
  | { t: "text"; v: string }
  | { t: "enter" }
  | { t: "bye" };

let state: RemoteState = { phase: "off", phoneSeen: false };
const listeners = new Set<(s: RemoteState) => void>();

let ws: WebSocket | null = null;
let key: CryptoKey | null = null;
let inbound: Promise<void> = Promise.resolve();
let outbound: Promise<void> = Promise.resolve();
const timers: Record<"pair" | "idle" | "max", ReturnType<typeof setTimeout> | undefined> = {
  pair: undefined, idle: undefined, max: undefined,
};

function update(next: Partial<RemoteState>) {
  state = { ...state, ...next };
  listeners.forEach((fn) => fn(state));
}

export function getRemoteState(): RemoteState {
  return state;
}

export function subscribeRemote(fn: (s: RemoteState) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function send(message: unknown) {
  outbound = outbound.then(async () => {
    const sock = ws;
    if (!sock || sock.readyState !== WebSocket.OPEN || !key) return;
    sock.send(await seal(key, message));
  });
}

function bumpIdle() {
  clearTimeout(timers.idle);
  timers.idle = setTimeout(() => stopRemote("idle"), IDLE_TIMEOUT_MS);
}

function report(outcome: TapOutcome) {
  if (outcome.kind === "blocked") send({ t: "blocked" });
  else if (outcome.kind === "field") send({ t: "focus", v: outcome.value, type: outcome.type, max: outcome.max });
}

function handle(m: PhoneMessage) {
  bumpIdle();
  switch (m.t) {
    case "m": if (Number.isFinite(m.x) && Number.isFinite(m.y)) moveBy(m.x, m.y); break;
    case "tap": report(tap()); break;
    case "long": void longPress().then(report); break;
    case "scroll": if (Number.isFinite(m.y)) report(scrollBy(m.y)); break;
    case "text": setText(String(m.v ?? "").slice(0, 500)); break;
    case "enter": pressEnter(); break;
    case "bye": stopRemote("ended"); break;
  }
}

function onRelayMessage(raw: string) {
  // Plain JSON comes from the relay itself; everything else is sealed.
  if (raw.startsWith("{")) {
    let m: { t?: string; on?: boolean };
    try { m = JSON.parse(raw); } catch { return; }
    if (m.t === "peer" && m.on) {
      clearTimeout(timers.pair);
      update({ phase: "connected", phoneSeen: true });
      bumpIdle();
    } else if (m.t === "peer") {
      update({ phase: "waiting" });
    } else if (m.t === "end") {
      stopRemote("expired");
    }
    return;
  }
  const k = key;
  if (!k) return;
  // In order: a tap must land where the moves before it put the pointer.
  inbound = inbound.then(async () => {
    const m = await unseal<PhoneMessage>(k, raw);
    if (m && key === k && typeof m === "object" && typeof m.t === "string") handle(m);
  });
}

export async function startRemote(opts: { locale: string; color: string }): Promise<void> {
  if (state.phase !== "off") return;
  update({ phase: "starting", phoneSeen: false, endReason: undefined, pairUrl: undefined });
  try {
    const secret = newSecret();
    const room = await roomIdFor(secret);
    const k = await keyFor(secret);
    if (getRemoteState().phase !== "starting") return; // cancelled meanwhile

    const fragment = new URLSearchParams({ s: secret, l: opts.locale, c: opts.color.replace("#", "") });
    if (RELAY_URL !== DEFAULT_RELAY_URL) fragment.set("relay", RELAY_URL);
    const pairUrl = `${window.location.origin}/remote.html#${fragment.toString()}`;

    const sock = new WebSocket(`${RELAY_URL}/ws?room=${room}&role=terminal`);
    ws = sock;
    key = k;
    onFieldLeft(() => send({ t: "blur" }));

    sock.onopen = () => {
      if (ws !== sock) return;
      update({ phase: "waiting", pairUrl, pairExpiresAt: Date.now() + PAIR_TIMEOUT_MS });
      timers.pair = setTimeout(() => stopRemote("code-expired"), PAIR_TIMEOUT_MS);
      timers.max = setTimeout(() => stopRemote("expired"), MAX_SESSION_MS);
    };
    sock.onmessage = (e) => { if (ws === sock) onRelayMessage(String(e.data)); };
    sock.onclose = () => {
      if (ws === sock) stopRemote(state.phase === "starting" ? "unreachable" : "lost");
    };
  } catch {
    stopRemote("unreachable");
  }
}

export function stopRemote(reason: RemoteEndReason = "cancelled"): void {
  if (state.phase === "off") return;
  const sock = ws;
  ws = null;
  key = null;
  clearTimeout(timers.pair);
  clearTimeout(timers.idle);
  clearTimeout(timers.max);
  onFieldLeft(null);
  resetRemoteInput();
  try { sock?.close(1000, reason); } catch { /* already closed */ }
  update({ phase: "off", phoneSeen: false, pairUrl: undefined, pairExpiresAt: undefined, endReason: reason });
}
