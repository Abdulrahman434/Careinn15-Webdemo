/**
 * `AndroidRemote`, from the Android kiosk app (RemoteBridge): runs the phone
 * remote natively with a real finger, so it reaches other websites and apps
 * and keeps going while they are in front. Absent in browsers, the desktop
 * app and older APKs; absent or "off" means the page runs the remote itself.
 */
export interface NativeRemote {
  /** "ready" when the app's accessibility service is on, otherwise "off". */
  status(): string;
  openSettings(): void;
  /** Starts the session for this pairing secret; progress arrives as `careinn-remote-native` events. */
  startSession(secret: string, relayUrl: string): boolean;
  stopSession(reason: string): void;
  /** The page field the phone was typing into lost focus. */
  fieldLeft(): void;
}

export function nativeRemote(): NativeRemote | null {
  const r = (window as unknown as { AndroidRemote?: NativeRemote }).AndroidRemote;
  return r && typeof r.status === "function" ? r : null;
}

export function nativeRemoteStatus(): "ready" | "off" | "absent" {
  const r = nativeRemote();
  // 1.2.29 had a different, per-command bridge; treat it as absent.
  if (!r || typeof r.startSession !== "function") return "absent";
  try { return r.status() === "ready" ? "ready" : "off"; } catch { return "absent"; }
}
