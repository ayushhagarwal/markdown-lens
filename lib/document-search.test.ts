import { describe, expect, test } from "vitest";
import { documentMatchSnippet } from "@/lib/document-search";

describe("document search snippets", () => {
  test("returns one line around the first body match", () => {
    const snippet = documentMatchSnippet("Title\n\nKeep decisions documented in the handbook.", "decisions");
    expect(snippet).toEqual({
      prefix: "Title Keep ",
      match: "decisions",
      suffix: " documented in the handbook.",
    });
  });

  test("returns nothing when the document does not contain the query", () => {
    expect(documentMatchSnippet("# Welcome", "  ")).toBeNull();
    expect(documentMatchSnippet("# Welcome", "budget")).toBeNull();
  });
});
