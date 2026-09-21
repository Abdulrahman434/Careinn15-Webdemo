import { useState, useEffect } from "react";
import { isSafeToReload, reloadBlockers, subscribeHolds } from "./reloadSafety";

/**
 * Keeping a kiosk on the build that is actually deployed.
 *
 * The service worker answers every navigation from its precache, so a reload
 * does not reach the server — it re-serves whatever the worker already holds.
 * A deploy therefore landed like this: the first load rendered the old app
 * while the new worker installed quietly behind it, and only the load after
 * that showed the new one. Always exactly one refresh behind, which is why it
 * looked correct in a private window, where there is no worker at all.
 *
 * Nothing was watching for the handover. registerSW.js registers and stops,
 * and the banner that was meant to catch this polled a version.json holding
 * the string "placeholder-b1a2c3d4" — so it could never differ from itself
 * and never appeared.
 *
 * Now: the worker is asked for an update when the screen is looked at again
 * and every quarter of an hour, and when a new one takes over, the page
 * reloads as soon as it is safe to.
 *
 * Safe is not "nobody is looking". A tab switched away from can be holding a
 * half-built meal order or a half-typed form, and reloading it throws that
 * away with nothing to undo. Safe is "no unsaved input, no unplaced order, no
 * request in flight" — see reloadSafety.ts, which the forms and the meal
 * ordering register with. Until that is true the update waits, the banner
 * offers it, and the app takes it at a point it already knows is safe: on
 * logout, where the screen is being handed on and nothing of theirs is left.
 */

const UPDATE_READY_EVENT = "careinn-update-ready";
/* A minute. The browser only goes looking for a new worker when something
   asks it to, so this interval IS how long a deployed change waits before a
   screen that is already open notices it. Fifteen minutes was chosen to be
   quiet; what it actually bought was a demo that looked like it had not
   updated. The request is a conditional GET of one small file that the server
   marks no-cache, so the cost of asking every minute is close to nothing. */
const UPDATE_CHECK_MS = 60 * 1000;

let updateReady = false;
let applyPending: (() => void) | null = null;

/**
 * Take a waiting update now, if one is waiting and nothing is mid-flight.
 *
 * For the points the app knows are safe without being told — logging out is
 * the obvious one: the screen is being handed to the next patient, whatever
 * was on it is gone by design, and a kiosk that never goes hidden would
 * otherwise carry the old build until somebody noticed the banner.
 */
export function applyPendingUpdate(): void {
  applyPending?.();
}

/** Whether a newer build is installed and waiting on a safe moment. */
export function isUpdatePending(): boolean {
  return updateReady;
}

function canRegister(): boolean {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    // A build opened straight off the filesystem inside the native shell has
    // no worker and no server to be behind.
    && window.location.protocol !== "file:";
}

export function registerServiceWorker(): void {
  if (!canRegister()) return;

  /* Whether this page is already being served BY a worker. On a first visit
     it is not, and the worker that installs then claims it — which fires the
     same event as an update and would reload a page that is already current. */
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;

  const applyOrWait = () => {
    if (!updateReady || reloading) return;
    if (!isSafeToReload()) {
      /* Announce it so the banner can offer, and try again the moment the
         last piece of unsaved work is done with. */
      window.dispatchEvent(new Event(UPDATE_READY_EVENT));
      return;
    }
    reloading = true;
    window.location.reload();
  };

  /* Every release of a hold is a chance the work just finished. */
  subscribeHolds(applyOrWait);
  applyPending = applyOrWait;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloading) return;
    updateReady = true;
    if (!isSafeToReload()) {
      console.info("[SW] update held:", reloadBlockers().join(", "));
    }
    applyOrWait();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        const check = () => { reg.update().catch(() => {}); };
        /* A kiosk sits on one page for days, and the browser only looks for a
           new worker on navigation. Without these it would never find one. */
        check();
        setInterval(check, UPDATE_CHECK_MS);
        /* Coming back to the screen is the moment it most matters, and it is
           the moment a deploy is most likely to have happened since. Both
           events, because a tab switch fires one and a window switch the
           other, and a kiosk in a browser can do either. */
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") check();
        });
        window.addEventListener("focus", check);
      })
      .catch((err) => {
        console.warn("[SW] Registration failed:", err);
      });
  });
}

/** True once a newer build has taken over and is waiting on a reload. */
export function useUpdateAvailable(): { available: boolean; reload: () => void } {
  const [available, setAvailable] = useState(updateReady);

  useEffect(() => {
    const onReady = () => setAvailable(true);
    window.addEventListener(UPDATE_READY_EVENT, onReady);
    return () => window.removeEventListener(UPDATE_READY_EVENT, onReady);
  }, []);

  return { available, reload: () => window.location.reload() };
}
