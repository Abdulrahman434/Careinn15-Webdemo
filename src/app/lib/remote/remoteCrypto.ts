/**
 * Pairing secret and message sealing for the phone remote.
 *
 * The terminal makes a random secret and shows it only in the QR code (in the
 * URL fragment, which browsers never send to a server). Both sides derive
 * from it: a room id the relay uses to put them together, and an AES-GCM key
 * that seals every message. The relay therefore sees neither the secret nor
 * anything said, and nobody without the QR can steer the screen.
 *
 * public/remote.html carries the same derivation; the two must stay in step.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

export function toB64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromB64url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

async function sha256(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(text)));
}

export function newSecret(): string {
  return toB64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function roomIdFor(secret: string): Promise<string> {
  const h = await sha256("careinn-remote-room:" + secret);
  return Array.from(h, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function keyFor(secret: string): Promise<CryptoKey> {
  const raw = await sha256("careinn-remote-key:" + secret);
  return crypto.subtle.importKey("raw", raw as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function seal(key: CryptoKey, message: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(message)));
  return toB64url(iv) + "." + toB64url(new Uint8Array(ct));
}

/** Null when the payload was not sealed with this key (or was tampered with). */
export async function unseal<T = unknown>(key: CryptoKey, sealed: string): Promise<T | null> {
  try {
    const [iv, ct] = sealed.split(".");
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64url(iv) as BufferSource }, key, fromB64url(ct) as BufferSource);
    return JSON.parse(dec.decode(pt)) as T;
  } catch {
    return null;
  }
}
