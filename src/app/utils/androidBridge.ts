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

import { useEffect, useRef, useState, useCallback } from "react";
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

  openSettings(): void {
    try {
      sys()?.openCastSettings();
    } catch (e) {
      console.warn("[androidBridge] openCastSettings failed:", e);
    }
  },
};

/* ─── DND ─── */

export const dnd = {
  isEnabled(): boolean {
    try {
      return sys()?.isDndEnabled() ?? false;
    } catch (e) {
      console.warn("[androidBridge] isDndEnabled failed:", e);
      return false;
    }
  },

  setEnabled(enabled: boolean): void {
    try {
      sys()?.setDndEnabled(enabled);
    } catch (e) {
      console.warn("[androidBridge] setDndEnabled failed:", e);
    }
  },
};

/* ─── Night Light ─── */

export const nightLight = {
  isEnabled(): boolean {
    try {
      return sys()?.isNightLightEnabled() ?? false;
    } catch (e) {
      console.warn("[androidBridge] isNightLightEnabled failed:", e);
      return false;
    }
  },

  setEnabled(enabled: boolean): void {
    try {
      sys()?.setNightLight(enabled);
    } catch (e) {
      console.warn("[androidBridge] setNightLight failed:", e);
    }
  },

  openSettings(): void {
    try {
      sys()?.openNightLightSettings();
    } catch (e) {
      console.warn("[androidBridge] openNightLightSettings failed:", e);
    }
  },
};

/* ─── Apps ─── */

export const apps = {
  launch(componentName: string): void {
    try {
      window.AndroidSystem?.launchApp(componentName);
    } catch (e) {
      console.warn('apps.launch failed', e);
    }
  },
  isInstalled(packageName: string): boolean {
    try {
      return window.AndroidSystem?.isAppInstalled(packageName) ?? false;
    } catch {
      return false;
    }
  },
};

// Pre-known component for the bedside IPTV app
export const KNOWN_APPS = {
  iptv: 'com.bitsarabia.bedsideterminalsolution/.careinn.iptvStreamActivity',
} as const;

/* ─── IPTV ─── */

export type IptvChannel = {
  id: number;
  name: string;
  nameAr: string;
  url: string;
  logo: string;
};

export const iptv = {
  /**
   * Trigger an async channel fetch. Listen for 'iptv-channels-loaded' 
   * (or use the React hook below). Resolves to [] if no bridge.
   */
  fetchChannels(): void {
    try { sys()?.fetchIptvChannels(); } 
    catch (e) { console.warn('[androidBridge] iptv.fetchChannels failed:', e); }
  },
  
  play(channel: IptvChannel): void {
    try { 
      sys()?.playIptv(channel.url, channel.name); 
    } catch (e) { console.warn('[androidBridge] iptv.play failed:', e); }
  },
  
  stop(): void {
    try { sys()?.stopIptv(); } 
    catch (e) { console.warn('[androidBridge] iptv.stop failed:', e); }
  },
  
  isPlaying(): boolean {
    try { return sys()?.isIptvPlaying() ?? false; } 
    catch { return false; }
  },
};

/**
 * React hook: triggers a channel fetch on mount, parses the result, 
 * exposes loading / error state. Returns [] in regular browsers.
 */
export function useAndroidEvent<T = unknown>(
  eventName: AndroidEventName,
  callback: (detail: T) => void
): void {
  const savedCallback = useRef(callback);
  
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent<T>).detail;
        savedCallback.current(detail);
      } catch (err) {
        console.warn(`[androidBridge] Error handling event "${eventName}":`, err);
      }
    };

    window.addEventListener(eventName, handler);
    return () => {
      window.removeEventListener(eventName, handler);
    };
  }, [eventName]);
}

/**
 * React hook to manage IPTV channel list.
 * Handles fetching, error states, and event listeners.
 */
export function useIptvChannels() {
  const [channels, setChannels] = useState<IptvChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!isAndroidApp()) {
      setError('TV is only available on the kiosk');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    iptv.fetchChannels();
  }, []);

  useAndroidEvent<any>('iptv-channels-loaded', (d) => {
    try {
      let arr: any;
      if (typeof d.json === 'string') {
        arr = JSON.parse(d.json);
      } else if (d.json && typeof d.json === 'object') {
        arr = d.json;
      } else if (Array.isArray(d)) {
        arr = d;
      } else if (d.channels && Array.isArray(d.channels)) {
        arr = d.channels;
      }

      setChannels(Array.isArray(arr) ? arr : []);
      setLoading(false);
      setError(null);
    } catch (e) {
      console.error('[androidBridge] Failed to parse IPTV channels:', e, d);
      setError('Failed to parse channel list');
      setLoading(false);
    }
  });

  useAndroidEvent<{ message: string }>('iptv-channels-error', (d) => {
    setError(d.message || 'Failed to load channels');
    setLoading(false);
  });

  useEffect(() => {
    reload();
  }, [reload]);

  return { channels, loading, error, reload };
}

// ─── SIP Types ────────────────────────────────────────────────────────

export type SipContact = {
  extension: string;
  nameEn: string;
  nameAr: string;
  emergency: boolean;
};

export type SipCallState =
  | 'Idle' | 'OutgoingInit' | 'OutgoingProgress' | 'OutgoingRinging'
  | 'OutgoingEarlyMedia' | 'Connected' | 'StreamsRunning'
  | 'IncomingReceived' | 'Pausing' | 'Paused' | 'Resuming'
  | 'Released' | 'Error' | 'End';

export type SipRegistrationState =
  | 'None' | 'Progress' | 'Ok' | 'Cleared' | 'Failed' | 'Refreshing';

// ─── SIP Bridge Object ────────────────────────────────────────────────

export const sip = {

  /**
   * Get the current contact directory. The Android app fetches this 
   * from http://10.32.0.86/api/sip/directory/devices/ on startup.
   * Always returns at least the hardcoded fallback (Sara, ext 629).
   */
  getContacts(): SipContact[] {
    try {
      const json = window.AndroidSystem?.sipGetContacts();
      if (!json) return [];
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  },

  call(extension: string): void {
    try { window.AndroidSystem?.sipCall(extension); }
    catch (e) { console.warn('sip.call failed', e); }
  },

  answer(): void {
    try { window.AndroidSystem?.sipAnswer(); }
    catch (e) { console.warn('sip.answer failed', e); }
  },

  hangup(): void {
    try { window.AndroidSystem?.sipHangup(); }
    catch (e) { console.warn('sip.hangup failed', e); }
  },

  setMuted(muted: boolean): void {
    try { window.AndroidSystem?.sipSetMuted(muted); }
    catch (e) { console.warn('sip.setMuted failed', e); }
  },

  isMuted(): boolean {
    try { return window.AndroidSystem?.sipIsMuted() ?? false; }
    catch { return false; }
  },

  getCallState(): SipCallState {
    try {
      return (window.AndroidSystem?.sipGetCallState() 
          ?? 'Idle') as SipCallState;
    } catch { return 'Idle'; }
  },

  getRegistrationState(): SipRegistrationState {
    try {
      return (window.AndroidSystem?.sipGetRegistrationState() 
          ?? 'None') as SipRegistrationState;
    } catch { return 'None'; }
  },
};

// ─── SIP React Hooks ──────────────────────────────────────────────────

/**
 * Reactive call state. Updates automatically when the Android bridge 
 * dispatches 'sip-call-state' events.
 */
export function useSipCallState() {
  const [callState, setCallState] = useState<SipCallState>(
    () => sip.getCallState()
  );
  const [remote, setRemote] = useState('');
  const [direction, setDirection] = 
    useState<'incoming' | 'outgoing' | null>(null);
  const [durationMs, setDurationMs] = useState(0);

  useAndroidEvent<{
    state: SipCallState;
    remote: string;
    direction: 'incoming' | 'outgoing';
    durationMs: number;
  }>('sip-call-state', (d) => {
    setCallState(d.state);
    setRemote(d.remote);
    setDirection(d.direction);
    setDurationMs(d.durationMs);
  });

  return { callState, remote, direction, durationMs };
}

/**
 * Reactive registration state. Updates when the Android bridge 
 * dispatches 'sip-registration-state' events.
 */
export function useSipRegistration() {
  const [regState, setRegState] = useState<SipRegistrationState>(
    () => sip.getRegistrationState()
  );
  useAndroidEvent<{ state: SipRegistrationState }>(
    'sip-registration-state',
    (d) => setRegState(d.state)
  );
  return regState;
}

/**
 * Reactive contact list. Refreshes when the Android app updates 
 * the directory from the hospital API.
 */
export function useSipContacts() {
  const [contacts, setContacts] = useState<SipContact[]>(
    () => sip.getContacts()
  );
  useAndroidEvent('sip-contacts-updated', () => {
    setContacts(sip.getContacts());
  });
  return contacts;
}

