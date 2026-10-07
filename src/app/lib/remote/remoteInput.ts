/**
 * Turns phone-remote messages into what a finger on this screen would do.
 *
 * The pointer is drawn by RemoteControl (a pointer-events:none element, so it
 * never gets in the way of hit-testing). A tap replays the event sequence a
 * real touch produces — pointerdown, touchstart, pointerup, touchend, then
 * the compatibility mousedown/mouseup and click, which a cancelled touchend
 * suppresses exactly as on real hardware — so components written for touch,
 * for pointers or for clicks all respond, and none respond twice.
 *
 * Anything inside [data-no-remote] (PIN entry, nurse view, admin, clearing
 * data) is out of reach: the patient has to use the screen itself for those.
 */

export type TapOutcome =
  | { kind: "none" }
  | { kind: "blocked" }
  | { kind: "pressed" }
  | { kind: "field"; value: string; type: string; max: number };

/** Phone deltas are in pixels of a 1920-wide screen; scaled to this one. */
const REF_WIDTH = 1920;
const POINTER_ID = 2741;
const LONG_PRESS_MS = 750;

let x = 0;
let y = 0;
let cursorEl: HTMLElement | null = null;
let drawQueued = false;
let lastNudge = 0;
let field: HTMLInputElement | HTMLTextAreaElement | null = null;
let fieldLeft: (() => void) | null = null;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const scale = () => Math.max(0.5, window.innerWidth / REF_WIDTH);

function draw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => {
    drawQueued = false;
    if (cursorEl) cursorEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  });
}

/** The screensaver watches window for mousemove; moving the pointer is use. */
function nudgeIdle() {
  const now = Date.now();
  if (now - lastNudge < 1000) return;
  lastNudge = now;
  window.dispatchEvent(new MouseEvent("mousemove"));
}

export function attachCursor(el: HTMLElement | null): void {
  cursorEl = el;
  if (el) {
    if (x === 0 && y === 0) {
      x = Math.round(window.innerWidth / 2);
      y = Math.round(window.innerHeight / 2);
    }
    draw();
  }
}

export function resetRemoteInput(): void {
  releaseField();
  x = 0;
  y = 0;
  drawQueued = false;
}

export function onFieldLeft(cb: (() => void) | null): void {
  fieldLeft = cb;
}

export function moveBy(dx: number, dy: number): void {
  const s = scale();
  x = clamp(x + clamp(dx, -400, 400) * s, 0, window.innerWidth - 2);
  y = clamp(y + clamp(dy, -400, 400) * s, 0, window.innerHeight - 2);
  draw();
  nudgeIdle();
}

function hit(): HTMLElement | null {
  const el = document.elementFromPoint(x, y);
  return el instanceof HTMLElement ? el : el?.parentElement ?? null;
}

const blocked = (el: Element) => !!el.closest("[data-no-remote]");

function pointer(type: string): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true, cancelable: true, composed: true, view: window,
    clientX: x, clientY: y, screenX: x, screenY: y,
    pointerId: POINTER_ID, pointerType: "touch", isPrimary: true,
    width: 10, height: 10, pressure: type === "pointerup" ? 0 : 0.5,
    button: 0, buttons: type === "pointerdown" ? 1 : 0,
  });
}

function touch(type: string, target: Element): TouchEvent | null {
  try {
    const t = new Touch({
      identifier: POINTER_ID, target,
      clientX: x, clientY: y, screenX: x, screenY: y,
      pageX: x + window.scrollX, pageY: y + window.scrollY,
      radiusX: 5, radiusY: 5, force: 0.5,
    });
    const active = type === "touchend" ? [] : [t];
    return new TouchEvent(type, {
      bubbles: true, cancelable: true, composed: true, view: window,
      touches: active, targetTouches: active, changedTouches: [t],
    });
  } catch {
    return null; // no Touch constructor (desktop browser): pointer + mouse still fire
  }
}

function mouse(type: string): MouseEvent {
  return new MouseEvent(type, {
    bubbles: true, cancelable: true, composed: true, view: window,
    clientX: x, clientY: y, screenX: x, screenY: y,
    button: 0, buttons: type === "mousedown" ? 1 : 0, detail: 1,
  });
}

const TEXT_TYPES = new Set(["text", "search", "email", "tel", "number", "url", "password", ""]);

function editable(el: Element): HTMLInputElement | HTMLTextAreaElement | null {
  const f = el.closest("input, textarea");
  if (f instanceof HTMLTextAreaElement) return f.disabled || f.readOnly ? null : f;
  if (f instanceof HTMLInputElement && TEXT_TYPES.has(f.type)) return f.disabled || f.readOnly ? null : f;
  return null;
}

function releaseField() {
  if (field) field.removeEventListener("blur", onBlur);
  field = null;
}

function onBlur() {
  releaseField();
  fieldLeft?.();
}

function focusField(f: HTMLInputElement | HTMLTextAreaElement): TapOutcome {
  releaseField();
  f.focus({ preventScroll: true });
  field = f;
  f.addEventListener("blur", onBlur);
  return {
    kind: "field",
    value: f.value,
    type: f instanceof HTMLInputElement ? f.type : "text",
    max: f.maxLength > 0 ? f.maxLength : 0,
  };
}

export function tap(): TapOutcome {
  const el = hit();
  if (!el) return { kind: "none" };
  if (blocked(el)) return { kind: "blocked" };

  const pointerDownOk = el.dispatchEvent(pointer("pointerdown"));
  const ts = touch("touchstart", el);
  if (ts) el.dispatchEvent(ts);
  el.dispatchEvent(pointer("pointerup"));
  const te = touch("touchend", el);
  const touchEndOk = te ? el.dispatchEvent(te) : true;
  if (touchEndOk) {
    if (pointerDownOk) {
      el.dispatchEvent(mouse("mousedown"));
      el.dispatchEvent(mouse("mouseup"));
    }
    el.dispatchEvent(mouse("click"));
  }

  const f = editable(el);
  return f ? focusField(f) : { kind: "pressed" };
}

export function longPress(): Promise<TapOutcome> {
  const el = hit();
  if (!el) return Promise.resolve({ kind: "none" });
  if (blocked(el)) return Promise.resolve({ kind: "blocked" });
  el.dispatchEvent(pointer("pointerdown"));
  const ts = touch("touchstart", el);
  if (ts) el.dispatchEvent(ts);
  return new Promise((resolve) => {
    setTimeout(() => {
      // A long press on a real screen ends without a click.
      el.dispatchEvent(pointer("pointerup"));
      const te = touch("touchend", el);
      if (te) el.dispatchEvent(te);
      resolve({ kind: "pressed" });
    }, LONG_PRESS_MS);
  });
}

const scrolls = (overflow: string) => overflow === "auto" || overflow === "scroll" || overflow === "overlay";

/** Scrolls the nearest thing under the pointer that scrolls that way. */
export function scrollBy(dx: number, dy: number): TapOutcome {
  const el = hit();
  if (el && blocked(el)) return { kind: "blocked" };
  const left = clamp(dx, -800, 800) * scale();
  const top = clamp(dy, -800, 800) * scale();
  const across = Math.abs(left) > Math.abs(top);
  for (let n: HTMLElement | null = el; n && n !== document.body; n = n.parentElement) {
    const cs = getComputedStyle(n);
    const ok = across
      ? scrolls(cs.overflowX) && n.scrollWidth > n.clientWidth + 1
      : scrolls(cs.overflowY) && n.scrollHeight > n.clientHeight + 1;
    if (ok) {
      n.scrollBy(across ? { left } : { top });
      nudgeIdle();
      return { kind: "pressed" };
    }
  }
  (document.scrollingElement || document.documentElement).scrollBy(across ? { left } : { top });
  nudgeIdle();
  return { kind: "pressed" };
}

// ── For the native finger (see nativeRemote): the page only vets the spot. ──

/** Whether a page point (CSS px) lands in a [data-no-remote] zone. */
export function blockedAt(px: number, py: number): boolean {
  const el = document.elementFromPoint(px, py);
  return !!el && blocked(el);
}

/** Pointer movement counts as use for the screensaver. */
export function noteActivity(): void {
  nudgeIdle();
}

/** After a native tap on this page: adopt the field it focused, if any. */
export function adoptFocusedField(): TapOutcome {
  const a = document.activeElement;
  const f = a ? editable(a) : null;
  if (!f) {
    releaseField();
    return { kind: "pressed" };
  }
  return focusField(f);
}

/** Whether typing should go to a field on this page. */
export function hasPageField(): boolean {
  return !!field && field.isConnected && document.activeElement === field;
}

/** Writes the phone's text into the focused field the way typing would. */
export function setText(value: string): void {
  if (!field || !field.isConnected || document.activeElement !== field) return;
  const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  const v = field.maxLength > 0 ? value.slice(0, field.maxLength) : value;
  if (setter) setter.call(field, v); else field.value = v;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

export function pressEnter(): void {
  const f = field;
  if (!f || !f.isConnected) return;
  const key = (type: string) =>
    new KeyboardEvent(type, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true });
  const ok = f.dispatchEvent(key("keydown"));
  f.dispatchEvent(key("keypress"));
  f.dispatchEvent(key("keyup"));
  if (ok && f instanceof HTMLInputElement && f.form) f.form.requestSubmit();
  f.blur();
}
