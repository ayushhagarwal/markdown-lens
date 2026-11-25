/**
 * Raster image types that may be stored as document assets and exposed as same-origin
 * `blob:` URLs. Anything scriptable (SVG, HTML, XML) is excluded: a blob URL opened in its
 * own tab runs on the app's origin, so its type must never be one a browser would execute.
 */
const SAFE_IMAGE_ASSET_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
]);

const EXTENSION_MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jpe: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  bmp: "image/bmp",
};

export function normalizeMimeType(value: string) {
  return value.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function isSafeImageAssetMimeType(value: string | null | undefined) {
  return typeof value === "string" && SAFE_IMAGE_ASSET_MIME_TYPES.has(normalizeMimeType(value));
}

/** The safe raster MIME type for a file name's extension, or null when it has none. */
export function safeImageMimeTypeFromName(name: string) {
  const extension = name.split(/[?#]/, 1)[0]?.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIME_TYPES[extension] ?? null;
}
