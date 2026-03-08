import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Get the site URL for OAuth redirects
 * Uses NEXT_PUBLIC_SITE_URL environment variable if set, otherwise falls back to window.location.origin
 * This ensures production OAuth flows use the correct domain
 */
export function getSiteUrl(): string {
  // Server-side: use environment variable
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_SITE_URL || '';
  }
  // Client-side: prefer environment variable, fall back to window.location.origin
  return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
}

/**
 * Get full URL for Supabase storage path
 * Converts relative storage path to full URL using NEXT_PUBLIC_SUPABASE_URL
 *
 * @param storagePath - Path starting with /storage/... (e.g., /storage/v1/object/public/avatars/123.png)
 * @returns Full URL with Supabase domain
 */
export function getStorageUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;

  // Blob URLs should be returned as-is (used for local previews)
  if (storagePath.startsWith('blob:')) {
    return storagePath;
  }

  // 公開URL用の環境変数を優先、なければ通常のURLを使用
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_URL
    || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    console.warn('NEXT_PUBLIC_SUPABASE_PUBLIC_URL or NEXT_PUBLIC_SUPABASE_URL is not set');
    return storagePath;
  }

  // If already a full URL, extract the path and rebuild
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    try {
      const url = new URL(storagePath);
      storagePath = url.pathname + url.search;
    } catch {
      return storagePath;
    }
  }

  // Ensure path starts with /
  if (!storagePath.startsWith('/')) {
    storagePath = '/' + storagePath;
  }

  // Remove trailing slash from supabaseUrl if present
  const baseUrl = supabaseUrl.replace(/\/$/, '');

  return `${baseUrl}${storagePath}`;
}
