import { isAndroidApp } from "../utils/androidBridge";
import { getApiConfig } from "./apiConfig";

// In-memory cache: original http:// URL → base64 data URL
const cache = new Map<string, string>();

/**
 * Proxy an http:// image URL through the Android bridge.
 * Returns a base64 data URL safe for use in an HTTPS WebView.
 * Falls back to original URL in browser (for development).
 */
export async function proxyImageUrl(url: string): Promise<string> {
  if (!url) return "";

  // Append apikey if it's a CDN URL from our server
  const { apiKey } = getApiConfig();
  const authenticatedUrl = url.includes("apikey=") 
    ? url 
    : `${url}${url.includes('?') ? '&' : '?'}apikey=${apiKey}`;

  if (cache.has(authenticatedUrl)) return cache.get(authenticatedUrl)!;
  if (!isAndroidApp()) return authenticatedUrl; // browser — return with key
  
  // Android — proxy as base64
  try {
    const base64 = (window as any).AndroidSystem
      ?.fetchImageAsBase64?.(authenticatedUrl);
    const result = base64 || authenticatedUrl;
    if (base64) cache.set(authenticatedUrl, result);
    return result;
  } catch { return authenticatedUrl; }
}

/**
 * Proxy multiple URLs in parallel.
 * Returns a Map of original URL → proxied URL.
 */
export async function proxyImageUrls(
  urls: string[]
): Promise<Map<string, string>> {
  const entries = await Promise.all(
    urls.map(async url => {
      const proxied = await proxyImageUrl(url);
      return [url, proxied] as [string, string];
    })
  );
  return new Map(entries);
}

/** Clear the in-memory cache (call after server config changes) */
export function clearImageCache(): void {
  cache.clear();
}
