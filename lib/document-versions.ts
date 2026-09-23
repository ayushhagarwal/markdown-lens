import type { DocumentVersion } from "@/lib/workspace/types";

export const MAX_DOCUMENT_VERSIONS = 4;
export const DOCUMENT_VERSION_INTERVAL_MS = 2 * 60 * 1000;
const ANCIENT_VERSION_MS = 12 * 60 * 60 * 1000;

export function nextDocumentVersions(
  existing: readonly DocumentVersion[],
  next: DocumentVersion,
  now: number,
  options?: { force?: boolean },
) {
  if (!next.markdown.trim()) return existing;
  const newest = existing[0];
  if (newest?.markdown === next.markdown) return existing;
  if (!options?.force && newest && next.savedAt - newest.savedAt < DOCUMENT_VERSION_INTERVAL_MS) return existing;

  const combined = [next, ...existing.filter((version) => version.id !== next.id)];
  if (combined.length <= MAX_DOCUMENT_VERSIONS) return combined;

  const ancient = [...combined].reverse().find((version) => version.id !== next.id && now - version.savedAt >= ANCIENT_VERSION_MS);
  if (!ancient) return combined.slice(0, MAX_DOCUMENT_VERSIONS);
  const recent = combined.filter((version) => version.id !== ancient.id).slice(0, MAX_DOCUMENT_VERSIONS - 1);
  return [...recent, ancient];
}

export function versionTimeLabel(savedAt: number, now = Date.now()) {
  const difference = Math.max(0, now - savedAt);
  if (difference < 60_000) return "Just now";
  if (difference < 3_600_000) {
    const minutes = Math.floor(difference / 60_000);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (difference < 86_400_000) {
    const hours = Math.floor(difference / 3_600_000);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (difference < 2 * 86_400_000) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(savedAt);
}
