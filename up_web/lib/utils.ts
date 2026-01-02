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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    console.warn('NEXT_PUBLIC_SUPABASE_URL is not set');
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
