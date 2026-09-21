import { useState, useEffect } from "react";

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
 * reloads — silently if nobody is looking, and otherwise by offering, because
 * a bedside screen that reloads itself under somebody halfway through a form
 * has traded one bad surprise for a worse one.
 */

const UPDATE_READY_EVENT = "careinn-update-ready";
const UPDATE_CHECK_MS = 15 * 60 * 1000;

let updateReady = false;

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

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloading) return;
    if (document.visibilityState === "hidden") {
      reloading = true;
      window.location.reload();
      return;
    }
    updateReady = true;
    window.dispatchEvent(new Event(UPDATE_READY_EVENT));
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        const check = () => { reg.update().catch(() => {}); };
        /* A kiosk sits on one page for days, and the browser only looks for a
           new worker on navigation. Without these it would never find one. */
        setInterval(check, UPDATE_CHECK_MS);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") check();
        });
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
