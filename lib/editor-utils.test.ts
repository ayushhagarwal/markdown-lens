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

  test("matches rendered Markdown heading semantics", () => {
    const markdown = [
      "Title with *emphasis*",
      "=====================",
      "",
      "> ## Nested [link](https://example.com)",
      "",
      "```md",
      "# Not a heading",
      "```",
      "",
      "Repeated",
      "--------",
      "",
      "Repeated",
      "--------",
    ].join("\n");

    expect(getDocumentHeadings(markdown)).toEqual([
      { level: 1, text: "Title with emphasis", id: "title-with-emphasis", line: 1 },
      { level: 2, text: "Nested link", id: "nested-link", line: 4 },
      { level: 2, text: "Repeated", id: "repeated", line: 10 },
      { level: 2, text: "Repeated", id: "repeated-1", line: 13 },
    ]);
    expect(getDocumentTitle(markdown)).toBe("Title with emphasis");
  });
});
