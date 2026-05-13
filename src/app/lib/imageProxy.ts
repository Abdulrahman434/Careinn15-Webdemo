import { isAndroidApp } from "../utils/androidBridge";
import { getApiConfig } from "./apiConfig";

const cache = new Map<string, string>();

export async function proxyImageUrl(url: string): Promise<string> {
  if (!url) return "";

  // Already a data URL or relative path — use as-is
  if (url.startsWith("data:") || url.startsWith("/") ||
      url.startsWith("blob:")) return url;

  // Append apikey if it's a CDN URL missing auth
  const { apiKey } = getApiConfig();
  const authenticated = url.includes("apikey=")
    ? url
    : `${url}${url.includes("?") ? "&" : "?"}apikey=${apiKey}`;

  // Return from cache if already proxied
  if (cache.has(authenticated)) return cache.get(authenticated)!;

  // In browser (dev/demo) — return authenticated URL as-is
  // Will show mixed content warning in browser but works fine
  if (!isAndroidApp()) return authenticated;

  // On Android — fetch via native bridge → base64 data URL
  try {
    const base64 = (window as any).AndroidSystem
      ?.fetchImageAsBase64?.(authenticated);
    if (base64 && base64.startsWith("data:")) {
      cache.set(authenticated, base64);
      return base64;
    }
  } catch {}

  // Bridge failed — return authenticated URL as fallback
  return authenticated;
}

export function clearImageCache(): void {
  cache.clear();
}
