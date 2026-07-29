import { describe, expect, test } from "vitest";
import {
  analyzeMarkdownBudget,
  assertMermaidSourceBudget,
  countWordsBounded,
  MAX_INTERACTIVE_MARKDOWN_CHARACTERS,
  MAX_MARKDOWN_HEADINGS,
  MAX_MERMAID_DIAGRAMS,
  MAX_MERMAID_GRAPH_STATEMENTS,
} from "@/lib/markdown-limits";

describe("interactive Markdown budgets", () => {
  test("accepts ordinary Markdown and counts words without materializing matches", () => {
    const markdown = "# Guide\n\nA small, safe document.";
    expect(analyzeMarkdownBudget(markdown)).toMatchObject({
      allowed: true,
      headings: 1,
    });
    expect(countWordsBounded(markdown)).toBe(6);
  });

  test("pauses parsing for oversized documents and heading floods", () => {
    expect(
      analyzeMarkdownBudget("x".repeat(MAX_INTERACTIVE_MARKDOWN_CHARACTERS + 1)),
    ).toMatchObject({ allowed: false });
    expect(
      analyzeMarkdownBudget(
        Array.from({ length: MAX_MARKDOWN_HEADINGS + 1 }, (_, index) => `# ${index}`).join(
          "\n",
        ),
      ),
    ).toMatchObject({ allowed: false, headings: MAX_MARKDOWN_HEADINGS + 1 });
  });

  test("caps aggregate Mermaid diagrams and per-diagram statements", () => {
    const diagrams = Array.from(
      { length: MAX_MERMAID_DIAGRAMS + 1 },
      () => "```mermaid\ngraph TD\nA-->B\n```",
    ).join("\n");
    expect(analyzeMarkdownBudget(diagrams)).toMatchObject({ allowed: false });
    expect(() =>
      assertMermaidSourceBudget(
        Array.from(
          { length: MAX_MERMAID_GRAPH_STATEMENTS + 1 },
          (_, index) => `node${index}`,
        ).join("\n"),
      ),
    ).toThrow("too many graph statements");
  });
});
