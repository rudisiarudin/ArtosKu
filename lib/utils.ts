import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility for tailwind class merging
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * IDR Currency Formatter
 */
export function formatIDR(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Haptic Feedback Helper
 */
export function vibrate(pattern: number | number[] = 10) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

/**
 * Get Local ISO Date (YYYY-MM-DD)
 */
export function getLocalIsoDate(date: Date = new Date()): string {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
}

/**
 * Get Local ISO String (YYYY-MM-DDTHH:mm:ss)
 */
export function getLocalIsoString(date: Date = new Date()): string {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().slice(0, 19);
}

/**
 * Fetches a URL bypassing CORS using a list of public proxies sequentially if one fails.
 */
export async function fetchWithCORSProxy(targetUrl: string, options?: RequestInit): Promise<Response> {
  const proxies = [
    // 1. AllOrigins raw endpoint (very reliable, doesn't block hosted environments)
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    // 2. Corsproxy.io (kept as fallback, but fails with 403 on some platforms/sites)
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    // 3. Direct fetch (fallback for environments without CORS restrictions, like native mobile apps)
    (url: string) => url,
  ];

  let lastError: Error | null = null;

  for (const getProxyUrl of proxies) {
    try {
      const proxyUrl = getProxyUrl(targetUrl);
      const response = await fetch(proxyUrl, options);
      if (response.ok) {
        return response;
      }
      throw new Error(`Proxy status: ${response.status} ${response.statusText}`);
    } catch (err: any) {
      lastError = err;
      console.warn(`CORS proxy failed for: ${targetUrl} via ${getProxyUrl(targetUrl)}. Error:`, err);
    }
  }

  throw lastError || new Error(`Failed to fetch ${targetUrl} after trying all proxies`);
}
