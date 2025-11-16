import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert a string to a URL-safe slug using URI encoding
export function toSlug(text: string): string {
  return encodeURIComponent(text.toLowerCase())
}

// Convert a slug back to the original text
export function fromSlug(slug: string): string {
  return decodeURIComponent(slug)
}