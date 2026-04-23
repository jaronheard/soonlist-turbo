import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractFilePath(url: string) {
  const match = /\/uploads\/\d{4}\/\d{2}\/\d{2}\/[^?]+/.exec(url);
  return match ? match[0] : "";
}

// URL helpers
export function normalizeUrlForStorage(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  // Preserve entered protocol if provided
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://"))
    return trimmed;
  // Handle protocol-relative URLs
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  // Default to https for bare domains/paths
  return `https://${trimmed}`;
}

export function formatUrlForDisplay(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./i, "");
    const path = `${u.pathname}${u.search}${u.hash}`;
    return `${host}${path}`;
  } catch {
    // Fallback for non-standard strings
    const withoutProtocol = url
      .replace(/^https?:\/\//i, "")
      .replace(/^\/\//, "");
    const withoutWww = withoutProtocol.replace(/^www\./i, "");
    return withoutWww;
  }
}
