/**
 * Helpers behind the shared <Avatar> (#290, #576).
 */

/**
 * Background / text pairs for the initials fallback. Each is a 100-level tint
 * with an 800-level text, which is well over 4.5:1 for small text. They are
 * written out in full so Tailwind sees every class.
 */
export const AVATAR_TONES = [
  "bg-teal-100 text-teal-800",
  "bg-sky-100 text-sky-800",
  "bg-indigo-100 text-indigo-800",
  "bg-violet-100 text-violet-800",
  "bg-fuchsia-100 text-fuchsia-800",
  "bg-rose-100 text-rose-800",
  "bg-amber-100 text-amber-900",
  "bg-lime-100 text-lime-900",
] as const;

/**
 * The same name always gets the same tone, on the server and the client and
 * on every page, so a person is recognisable at a glance. FNV-1a over the
 * lower-cased, trimmed name: renaming "Ada" to "ada " doesn't recolour her.
 */
export function avatarTone(name?: string | null): string {
  const key = (name ?? "").trim().toLowerCase();
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return AVATAR_TONES[(hash >>> 0) % AVATAR_TONES.length];
}

/**
 * Only https image URLs or safe raster image data URLs (PNG, JPEG, WebP, GIF)
 * are accepted (#290, #576). Scriptable types (SVG, HTML), plain-http, and
 * javascript: addresses fall back to initials instead.
 */
export function safeAvatarUrl(image?: string | null): string | null {
  if (!image || typeof image !== "string") return null;
  const trimmed = image.trim();
  if (trimmed.startsWith("data:image/")) {
    const isSafeRaster = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(trimmed);
    return isSafeRaster ? trimmed : null;
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export type AvatarSize = "xs" | "sm" | "md" | "lg";

/** Box and text size per size; the box is fixed, so nothing shifts when an image loads or fails. */
export const AVATAR_SIZES: Record<AvatarSize, string> = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};
