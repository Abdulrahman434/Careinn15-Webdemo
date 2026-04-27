/**
 * androidBridge.ts
 *
 * Self-contained bridge module between the React UI and the Android kiosk
 * app's `window.AndroidSystem` object. Every native call is wrapped in
 * try/catch so a missing or misbehaving bridge never crashes the UI.
 *
 * When the page is loaded in a regular browser (`AndroidSystem` is
 * undefined), all getters return sensible defaults and all setters are
 * no-ops with a console.warn.
 */

import { useEffect } from "react";
import type { AndroidEventName } from "../types/android";
import { Bluetooth } from "lucide-react";

/* ─── Re-exported helper types for components ─── */

export type BTDevice = {
  id: string;
  name: string;
  type: string;
  icon: typeof Bluetooth;
  paired: boolean;
  rssi?: number;
};

export type WifiNetwork = {
  id: string;
  name: string;
  secured: boolean;
  strength: 1 | 2 | 3;
};

export type CastDevice = {
  id: string;
  name: string;
  type: string;
  available: boolean;
};

/* ─── Detection ─── */

export function isAndroidApp(): boolean {
  return typeof window !== "undefined" && typeof window.AndroidSystem !== "undefined";
}

/** Shorthand to the bridge, or undefined */
function sys() {
  return window.AndroidSystem;
}

/* ─── Brightness ─── */

export const brightness = {
  /** Returns current brightness 0..1, default 0.8 when bridge absent. */
  get(): number {
    try {
      return sys()?.getBrightness() ?? 0.8;
    } catch (e) {
      console.warn("[androidBridge] getBrightness failed:", e);
      return 0.8;
    }
  },

  /** Sets brightness, clamped to 0..1. */
  set(value: number): void {
    try {
      const clamped = Math.max(0, Math.min(1, value));
      sys()?.setBrightness(clamped);
    } catch (e) {
      console.warn("[androidBridge] setBrightness failed:", e);
    }
  },
};

/* ─── Volume ─── */

export const volume = {
  /** Returns current volume 0..1, default 0.6 when bridge absent. */
  get(): number {
    try {
      return sys()?.getVolume() ?? 0.6;
    } catch (e) {
      console.warn("[androidBridge] getVolume failed:", e);
      return 0.6;
    }
  },

  /** Sets volume, clamped to 0..1. */
  set(value: number): void {
    try {
      const clamped = Math.max(0, Math.min(1, value));
      sys()?.setVolume(clamped);
    } catch (e) {
      console.warn("[androidBridge] setVolume failed:", e);
    }
  },
};

/* ─── Bluetooth ─── */

export const bluetooth = {
  isEnabled(): boolean {
    try {
      return sys()?.isBluetoothEnabled() ?? false;
    } catch (e) {
      console.warn("[androidBridge] isBluetoothEnabled failed:", e);
      return false;
    }
  },

  setEnabled(enabled: boolean): void {
    try {
      sys()?.setBluetoothEnabled(enabled);
    } catch (e) {
      console.warn("[androidBridge] setBluetoothEnabled failed:", e);
    }
  },

  startScan(): void {
    try {
      sys()?.startBluetoothScan();
    } catch (e) {
      console.warn("[androidBridge] startBluetoothScan failed:", e);
    }
  },

  stopScan(): void {
    try {
      sys()?.stopBluetoothScan();
    } catch (e) {
      console.warn("[androidBridge] stopBluetoothScan failed:", e);
    }
  },

  connect(address: string): void {
    try {
      sys()?.connectBluetoothDevice(address);
    } catch (e) {
      console.warn("[androidBridge] connectBluetoothDevice failed:", e);
    }
  },

  disconnect(address: string): void {
    try {
      sys()?.disconnectBluetoothDevice(address);
    } catch (e) {
      console.warn("[androidBridge] disconnectBluetoothDevice failed:", e);
    }
  },
};

/* ─── Wi-Fi ─── */

export const wifi = {
  isEnabled(): boolean {
    try {
      return sys()?.isWifiEnabled() ?? false;
    } catch (e) {
      console.warn("[androidBridge] isWifiEnabled failed:", e);
      return false;
    }
  },

  openSettings(): void {
    try {
      sys()?.openWifiSettings();
    } catch (e) {
      console.warn("[androidBridge] openWifiSettings failed:", e);
    }
  },

  startScan(): void {
    try {
      sys()?.startWifiScan();
    } catch (e) {
      console.warn("[androidBridge] startWifiScan failed:", e);
    }
  },

  connect(ssid: string, password?: string): void {
    try {
      sys()?.connectWifiNetwork(ssid, password ?? "");
    } catch (e) {
      console.warn("[androidBridge] connectWifiNetwork failed:", e);
    }
  },

  disconnect(): void {
    try {
      sys()?.disconnectWifi();
    } catch (e) {
      console.warn("[androidBridge] disconnectWifi failed:", e);
    }
  },
};

/* ─── Cast ─── */

export const cast = {
  isAvailable(): boolean {
    try {
      return sys()?.isCastAvailable() ?? false;
    } catch (e) {
      console.warn("[androidBridge] isCastAvailable failed:", e);
      return false;
    }
  },

  startScan(): void {
    try {
      sys()?.startCastScan();
    } catch (e) {
      console.warn("[androidBridge] startCastScan failed:", e);
    }
  },

  stopScan(): void {
    try {
      sys()?.stopCastScan();
    } catch (e) {
      console.warn("[androidBridge] stopCastScan failed:", e);
    }
  },

  connect(deviceId: string): void {
    try {
      sys()?.connectCastDevice(deviceId);
    } catch (e) {
      console.warn("[androidBridge] connectCastDevice failed:", e);
    }
  },

  stop(): void {
    try {
      sys()?.stopCasting();
    } catch (e) {
      console.warn("[androidBridge] stopCasting failed:", e);
    }
  },
};

/* ─── React Hook: useAndroidEvent ─── */

/**
 * Subscribes to a CustomEvent dispatched by the Android kiosk on `window`.
 * Automatically cleans up the listener on unmount.
 *
 * @example
 * useAndroidEvent<{ value: number }>('brightness-changed', (d) => {
 *   setBrightnessState(Math.round(d.value * 100));
 * });
 */
export function useAndroidEvent<T = unknown>(
  eventName: AndroidEventName,
  callback: (detail: T) => void
): void {
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent<T>).detail;
        callback(detail);
      } catch (err) {
        console.warn(`[androidBridge] Error handling event "${eventName}":`, err);
      }
    };

    window.addEventListener(eventName, handler);
    return () => {
      window.removeEventListener(eventName, handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventName]);
}
