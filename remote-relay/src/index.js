/**
 * CareInn phone remote: a dumb relay between one bedside terminal and one phone.
 *
 * The terminal makes a random secret and shows it as a QR code. Both sides
 * connect here with room = SHA-256 of that secret, so the relay never sees
 * the secret. Everything they say to each other is AES-GCM sealed with a key
 * derived from it, so the relay passes along bytes it cannot read or forge.
 *
 * One Durable Object per room. It uses the WebSocket Hibernation API, so an
 * open but quiet pairing costs no compute time.
 */
import { DurableObject } from "cloudflare:workers";

const ROOM_RE = /^[0-9a-f]{64}$/;
const MAX_MESSAGE_CHARS = 8192;
const MAX_ROOM_AGE_MS = 2 * 60 * 60 * 1000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return new Response("ok");
    if (url.pathname !== "/ws") return new Response("Not found", { status: 404 });
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected a WebSocket", { status: 426 });
    }
    const room = url.searchParams.get("room") || "";
    const role = url.searchParams.get("role");
    if (!ROOM_RE.test(room) || (role !== "terminal" && role !== "phone")) {
      return new Response("Bad request", { status: 400 });
    }
    return env.ROOMS.get(env.ROOMS.idFromName(room)).fetch(request);
  },
};

/** Close codes the clients act on. */
const CLOSE = {
  ENDED: 4000,       // the terminal ended the session
  EXPIRED: 4001,     // room reached its maximum age
  NO_TERMINAL: 4004, // a phone arrived at a room no terminal opened
  BUSY: 4009,        // that role is already connected
};

function refuse(code, reason) {
  const [client, server] = Object.values(new WebSocketPair());
  server.accept();
  server.close(code, reason);
  return new Response(null, { status: 101, webSocket: client });
}

export class Room extends DurableObject {
  async fetch(request) {
    const role = new URL(request.url).searchParams.get("role");
    const other = role === "terminal" ? "phone" : "terminal";

    if (this.ctx.getWebSockets(role).length > 0) return refuse(CLOSE.BUSY, "busy");
    // Only a terminal can open a room; a phone can only join one.
    if (role === "phone" && this.ctx.getWebSockets("terminal").length === 0) {
      return refuse(CLOSE.NO_TERMINAL, "no terminal");
    }

    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server, [role]);
    server.serializeAttachment({ role });

    const peers = this.ctx.getWebSockets(other);
    for (const peer of peers) send(peer, { t: "peer", on: true });
    if (peers.length > 0) send(server, { t: "peer", on: true });

    if (role === "terminal") await this.ctx.storage.setAlarm(Date.now() + MAX_ROOM_AGE_MS);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    if (typeof message !== "string" || message.length > MAX_MESSAGE_CHARS) return;
    const { role } = ws.deserializeAttachment() || {};
    const other = role === "terminal" ? "phone" : "terminal";
    for (const peer of this.ctx.getWebSockets(other)) {
      try { peer.send(message); } catch { /* peer already gone */ }
    }
  }

  async webSocketClose(ws, code, reason) {
    this.#left(ws);
    try { ws.close(code, reason); } catch { /* already closed */ }
  }

  async webSocketError(ws) {
    this.#left(ws);
  }

  async alarm() {
    for (const ws of this.ctx.getWebSockets()) end(ws, CLOSE.EXPIRED, "expired");
  }

  #left(ws) {
    const { role } = ws.deserializeAttachment() || {};
    if (role === "terminal") {
      // The terminal is the session: when it goes, the phone goes with it.
      for (const phone of this.ctx.getWebSockets("phone")) end(phone, CLOSE.ENDED, "ended");
    } else {
      for (const terminal of this.ctx.getWebSockets("terminal")) send(terminal, { t: "peer", on: false });
    }
  }
}

function send(ws, obj) {
  try { ws.send(JSON.stringify(obj)); } catch { /* socket closing */ }
}

/** Say why before closing: a client whose close handshake stalls still knows. */
function end(ws, code, reason) {
  send(ws, { t: "end", reason });
  try { ws.close(code, reason); } catch { /* already closed */ }
}
