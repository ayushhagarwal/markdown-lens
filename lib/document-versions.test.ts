import { describe, expect, test } from "vitest";
import { DOCUMENT_VERSION_INTERVAL_MS, nextDocumentVersions, versionTimeLabel } from "@/lib/document-versions";
import type { DocumentVersion } from "@/lib/workspace/types";

function version(id: string, markdown: string, savedAt: number): DocumentVersion {
  return { id, documentId: "doc", markdown, savedAt };
}

describe("local document versions", () => {
  test("keeps a spaced snapshot and skips an empty or immediate duplicate", () => {
    const first = version("1", "First draft", 0);
    expect(nextDocumentVersions([], version("blank", "  ", 10), 10)).toEqual([]);
    expect(nextDocumentVersions([first], version("same", "First draft", 10), 10)).toEqual([first]);
    expect(nextDocumentVersions([first], version("soon", "Second draft", DOCUMENT_VERSION_INTERVAL_MS - 1), DOCUMENT_VERSION_INTERVAL_MS - 1)).toEqual([first]);
    expect(nextDocumentVersions([first], version("later", "Second draft", DOCUMENT_VERSION_INTERVAL_MS), DOCUMENT_VERSION_INTERVAL_MS)).toEqual([
      version("later", "Second draft", DOCUMENT_VERSION_INTERVAL_MS),
      first,
    ]);
  });

  test("keeps an older snapshot when the recent list is full", () => {
    const now = 20 * 60 * 60 * 1000;
    const existing = [
      version("recent-1", "a", now - 6 * 60 * 1000),
      version("recent-2", "b", now - 8 * 60 * 1000),
      version("recent-3", "c", now - 10 * 60 * 1000),
      version("yesterday", "original", now - 20 * 60 * 60 * 1000),
    ];
    const next = nextDocumentVersions(existing, version("recent-4", "d", now), now);
    expect(next.map((item) => item.id)).toEqual(["recent-4", "recent-1", "recent-2", "yesterday"]);
  });

  test("labels snapshots the way a person would say them", () => {
    const now = Date.parse("2026-09-23T12:00:00Z");
    expect(versionTimeLabel(now - 30_000, now)).toBe("Just now");
    expect(versionTimeLabel(now - 2 * 60_000, now)).toBe("2 minutes ago");
    expect(versionTimeLabel(now - 26 * 60 * 60_000, now)).toBe("Yesterday");
  });
});
