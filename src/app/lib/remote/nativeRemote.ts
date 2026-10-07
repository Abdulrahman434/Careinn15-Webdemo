/**
 * `AndroidRemote`, from the Android kiosk app (RemoteBridge): a real finger
 * for the phone remote, able to reach other websites and apps on screen.
 * Absent in browsers, the desktop app and older APKs; absent or "off" means
 * the remote stays inside this page.
 *
 * Distances are in pixels of a 1920-wide screen, as the phone sends them.
 */
export interface NativeRemote {
  status(): string;
  openSettings(): void;
  begin(): boolean;
  end(): void;
  move(dx: number, dy: number): void;
  /** JSON: {"self":true,"x","y"} in this page's CSS px, or {"self":false}. */
  where(): string;
  tap(): void;
  longPress(): void;
  scroll(dx: number, dy: number): void;
  /** JSON {"v","type","max"} of the focused field in another app, or "". */
  field(): string;
  text(value: string): void;
  enter(): void;
}

export function nativeRemote(): NativeRemote | null {
  const r = (window as unknown as { AndroidRemote?: NativeRemote }).AndroidRemote;
  return r && typeof r.begin === "function" ? r : null;
}

export function nativeRemoteStatus(): "ready" | "off" | "absent" {
  const r = nativeRemote();
  if (!r) return "absent";
  try { return r.status() === "ready" ? "ready" : "off"; } catch { return "absent"; }
}
