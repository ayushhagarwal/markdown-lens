import { describe, expect, test } from "vitest";
import { getDocumentHeadings, getDocumentStats, getDocumentTitle, toFileName } from "@/lib/editor-utils";

describe("editor utilities", () => {
  test("derives titles, filenames, and reading statistics", () => {
    const markdown = "# Release Notes\n\nOne two three.";
    expect(getDocumentTitle(markdown)).toBe("Release Notes");
    expect(toFileName(getDocumentTitle(markdown))).toBe("release-notes");
    expect(getDocumentStats(markdown)).toMatchObject({ words: 6, characters: markdown.length, minutes: 1 });
  });

  test("creates duplicate-safe GitHub-compatible heading anchors", () => {
    const headings = getDocumentHeadings("# Intro\n## Details\n## Details");
    expect(headings.map((heading) => heading.id)).toEqual(["intro", "details", "details-1"]);
    expect(headings.map((heading) => heading.line)).toEqual([1, 2, 3]);
  });
});
