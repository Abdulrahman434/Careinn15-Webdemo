import { useState, useEffect } from "react";

const STORAGE_KEY = 'careinn-api-config';

export interface ApiConfigData {
  serverIp: string;
  apiKey: string;
}

const DEFAULTS: ApiConfigData = {
  serverIp: '10.32.0.86',
  apiKey:   '20b91694-7ea1-4a44-91a6-2878664428b3',
};

export function getApiConfig(): ApiConfigData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULTS }; }
}

export function saveApiConfig(cfg: ApiConfigData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  // Notify Android bridge if available
  try {
    window.AndroidSystem?.updateApiConfig?.(cfg.serverIp, cfg.apiKey);
  } catch {}
  // Notify any React listeners
  window.dispatchEvent(new CustomEvent('api-config-changed', { detail: cfg }));
}

export function resetApiConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
  try { window.AndroidSystem?.resetApiConfig?.(); } catch {}
  window.dispatchEvent(new CustomEvent('api-config-changed', { detail: DEFAULTS }));
}

export function isCustomConfig(): boolean {
  const cfg = getApiConfig();
  return cfg.serverIp !== DEFAULTS.serverIp || cfg.apiKey !== DEFAULTS.apiKey;
}

/** Build a full URL — mirrors the Android ApiConfig.url() */
export function apiUrl(path: string): string {
  const cfg = getApiConfig();
  const base = `http://${cfg.serverIp}/api`;
  const sep  = path.includes('?') ? '&' : '?';
  const p    = path.startsWith('/') ? path : '/' + path;
  return `${base}${p}${sep}apikey=${cfg.apiKey}`;
}

export function useApiConfig() {
  const [cfg, setCfg] = useState<ApiConfigData>(getApiConfig);
  useEffect(() => {
    const handler = (e: Event) => {
      setCfg((e as CustomEvent).detail);
    };
    window.addEventListener('api-config-changed', handler);
    return () => window.removeEventListener('api-config-changed', handler);
  }, []);
  return cfg;
}
