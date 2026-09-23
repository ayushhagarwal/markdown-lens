import { describe, expect, test } from "vitest";
import { sampleHandbookLines, sampleHandbookMarkdown } from "@/lib/sample-conversion";

describe("sample handbook conversion", () => {
  test("shows the Markdown the converter writes for the sample page", () => {
    expect(sampleHandbookMarkdown.startsWith("# Sample handbook")).toBe(true);
    for (const line of sampleHandbookLines) {
      expect(sampleHandbookMarkdown).toContain(line);
    }
    expect(sampleHandbookMarkdown).toContain("<!-- Page 1 -->");
  });
});
