import { useState, useEffect } from "react";

const STORAGE_KEY = "careinn-api-config";

export interface ApiConfigData {
  serverIp: string;   // can be IP, domain, or full URL with protocol
  apiKey: string;
}

const DEFAULTS: ApiConfigData = {
  serverIp: 'https://admin.careinn.com/api',
  apiKey: 'efc9bcbf-6951-436a-8694-c13cc6f30913',
};

export const SECONDARY_OPTION: ApiConfigData = {
  serverIp: '10.32.0.86',
  apiKey: '20b91694-7ea1-4a44-91a6-2878664428b3',
};

export function getApiConfig(): ApiConfigData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const saved = JSON.parse(raw);
    return {
      serverIp: saved.serverIp?.trim() || DEFAULTS.serverIp,
      apiKey: saved.apiKey?.trim() || DEFAULTS.apiKey,
    };
  } catch { return { ...DEFAULTS }; }
}

export function isCustomConfig(): boolean {
  const cfg = getApiConfig();
  return cfg.serverIp !== DEFAULTS.serverIp ||
    cfg.apiKey !== DEFAULTS.apiKey;
}

// ── URL builder ────────────────────────────────────────────────────────────

export function resolveBaseUrl(ipOrUrl: string): string {
  if (!ipOrUrl) return DEFAULTS.serverIp;
  if (ipOrUrl.startsWith("http://") || ipOrUrl.startsWith("https://")) {
    return ipOrUrl.endsWith("/") ? ipOrUrl.slice(0, -1) : ipOrUrl;
  }
  return `http://${ipOrUrl}/api`;
}

/**
 * Build a full authenticated URL for any API path.
 * Reads config fresh every call — server changes take effect immediately.
 *
 * Examples:
 *   apiUrl("/hospital/group/")
 *   apiUrl("/resource/background/wallpaper/?group=1")
 *   apiUrl("/hl7/httpreceiver/?reference_id=38")
 */
export function apiUrl(path: string): string {
  const { serverIp, apiKey } = getApiConfig();
  const base = resolveBaseUrl(serverIp);
  const p = path.startsWith("/") ? path : `/${path}`;
  const sep = p.includes("?") ? "&" : "?";
  return `${base}${p}${sep}apikey=${apiKey}`;
}

/**
 * Rewrite an image URL from the API response to use the correct protocol.
 * API responses sometimes return http:// even when the server supports https.
 * This rewrites them to match the configured server protocol.
 */
export function rewriteImageUrl(imageUrl: string): string {
  if (!imageUrl) return "";

  const { serverIp } = getApiConfig();
  const base = resolveBaseUrl(serverIp);

  // Extract protocol from resolved base (http or https)
  const protocol = base.startsWith("https://") ? "https" : "http";

  // If image URL uses wrong protocol — fix it
  if (imageUrl.startsWith("http://") && protocol === "https") {
    return imageUrl.replace("http://", "https://");
  }
  if (imageUrl.startsWith("https://") && protocol === "http") {
    return imageUrl.replace("https://", "http://");
  }

  return imageUrl;
}

// ── Write ──────────────────────────────────────────────────────────────────

export function saveApiConfig(cfg: ApiConfigData): void {
  if (!cfg.serverIp?.trim() || !cfg.apiKey?.trim()) return;

  const previous = getApiConfig();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    serverIp: cfg.serverIp.trim(),
    apiKey: cfg.apiKey.trim(),
  }));

  // Clear image cache when server changes
  if (cfg.serverIp !== previous.serverIp) {
    try {
      const { clearImageCache } = require("./imageProxy");
      clearImageCache();
    } catch { }
  }

  // Notify Android bridge
  try {
    (window as any).AndroidSystem?.updateApiConfig?.(
      cfg.serverIp.trim(), cfg.apiKey.trim());
  } catch { }

  // Notify all React consumers
  window.dispatchEvent(new CustomEvent(
    "api-config-changed", { detail: getApiConfig() }));
}

export function resetApiConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
  try {
    (window as any).AndroidSystem?.resetApiConfig?.();
  } catch { }
  window.dispatchEvent(new CustomEvent(
    "api-config-changed", { detail: { ...DEFAULTS } }));
}

// ── React hook ─────────────────────────────────────────────────────────────

export function useApiConfig(): ApiConfigData {
  const [cfg, setCfg] = useState<ApiConfigData>(getApiConfig);
  useEffect(() => {
    const handler = (e: Event) => {
      setCfg((e as CustomEvent<ApiConfigData>).detail);
    };
    window.addEventListener("api-config-changed", handler);
    return () => window.removeEventListener("api-config-changed", handler);
  }, []);
  return cfg;
}
