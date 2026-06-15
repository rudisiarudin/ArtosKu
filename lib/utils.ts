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
 * Fetches a Yahoo Finance API URL bypassing CORS.
 * Detects if running in a native mobile app (where CORS is not enforced)
 * or web (using a Vercel/Vite proxy with fallbacks).
 */
export async function fetchYahooFinance(cleanSymbol: string, params: string): Promise<Response> {
  const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}?${params}`;
  
  // Detect Capacitor / Native mobile app environment
  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;
  
  if (isCapacitor) {
    try {
      // Native apps can fetch directly without CORS issues
      const response = await fetch(targetUrl);
      if (response.ok) return response;
    } catch (err) {
      console.warn("Direct fetch failed on native app, falling back to proxy...", err);
    }
  }

  // Web environment: use local/hosted API proxy routes
  // /api/yahoo-chart is proxied by Vite (dev) and Vercel (production)
  const proxyPath = `/api/yahoo-chart/${cleanSymbol}?${params}`;
  
  try {
    const response = await fetch(proxyPath);
    if (response.ok) return response;
    throw new Error(`Proxy path returned status ${response.status}`);
  } catch (err) {
    console.warn(`Local API proxy failed for ${cleanSymbol}, trying public proxies...`, err);
  }

  // Public proxy fallbacks (just in case they host elsewhere)
  const publicProxies = [
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];

  let lastError: Error | null = null;
  for (const getProxyUrl of publicProxies) {
    try {
      const proxyUrl = getProxyUrl(targetUrl);
      const response = await fetch(proxyUrl);
      if (response.ok) return response;
      throw new Error(`Public proxy status: ${response.status}`);
    } catch (e: any) {
      lastError = e;
      console.warn(`Public CORS proxy failed for ${targetUrl} via ${proxyUrl}:`, e);
    }
  }

  throw lastError || new Error(`Failed to fetch Yahoo Finance data for ${cleanSymbol}`);
}
