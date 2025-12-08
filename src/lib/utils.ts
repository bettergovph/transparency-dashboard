import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert a string to SEO-friendly slug with lowercase and hyphens
export function toSlug(text: string): string {
  // Convert to lowercase
  let slug = text.toLowerCase()
  // Replace spaces with hyphens
  slug = slug.replace(/\s+/g, '-')
  // Remove special characters (keep only alphanumeric and hyphens)
  slug = slug.replace(/[^a-z0-9-]/g, '')
  // Replace multiple consecutive hyphens with single hyphen
  slug = slug.replace(/-+/g, '-')
  // Strip hyphens from start and end
  slug = slug.replace(/^-+|-+$/g, '')
  return slug
}

// Convert a slug back to the original text (best effort reconstruction)
export function fromSlug(slug: string): string {
  // Replace hyphens with spaces and capitalize words
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}