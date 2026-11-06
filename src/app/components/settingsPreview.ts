/**
 * Demo only: which optional rows the Settings panel shows.
 *
 * Every hospital build has a different set of these (one has Use my phone,
 * another has no log out), so the panel is one list of matching rows that
 * reads the same with any of them left out. These switches, in the nurse
 * view, let the design be checked both ways. They stay as set until switched.
 */
import { useEffect, useState } from "react";

export type SettingsOptionalRow = "useMyPhone" | "preferences" | "pin" | "logout" | "sampleLanguages" | "btSingle";

export const SETTINGS_OPTIONAL_ROWS: { key: SettingsOptionalRow; label: string }[] = [
  { key: "useMyPhone", label: "Use my phone" },
  { key: "preferences", label: "My Preferences" },
  { key: "pin", label: "Set PIN" },
  { key: "logout", label: "Log out" },
  { key: "sampleLanguages", label: "Language list: 10-language sample" },
  { key: "btSingle", label: "Bluetooth: one device at a time" },
];

const KEY = "hbs-settings-preview";
const EVENT = "settings-preview-changed";

type Flags = Record<SettingsOptionalRow, boolean>;
const ALL_ON: Flags = { useMyPhone: true, preferences: true, pin: true, logout: true, sampleLanguages: false, btSingle: false };

export function getSettingsPreview(): Flags {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...ALL_ON, ...JSON.parse(raw) } : { ...ALL_ON };
  } catch {
    return { ...ALL_ON };
  }
}

export function setSettingsPreview(key: SettingsOptionalRow, on: boolean) {
  const next = { ...getSettingsPreview(), [key]: on };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function useSettingsPreview(): Flags {
  const [flags, setFlags] = useState<Flags>(getSettingsPreview);
  useEffect(() => {
    const sync = () => setFlags(getSettingsPreview());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return flags;
}
