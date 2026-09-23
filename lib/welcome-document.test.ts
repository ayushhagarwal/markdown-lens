import { describe, expect, test } from "vitest";
import { WELCOME_DOCUMENT_MARKDOWN, WELCOME_DOCUMENT_TITLE } from "@/lib/welcome-document";

describe("welcome document", () => {
  test("demonstrates a table, code, a diagram, and math", () => {
    expect(WELCOME_DOCUMENT_TITLE).toBe("Welcome to Markdown Lens");
    expect(WELCOME_DOCUMENT_MARKDOWN).toContain("| Format | What you get |");
    expect(WELCOME_DOCUMENT_MARKDOWN).toContain("```ts");
    expect(WELCOME_DOCUMENT_MARKDOWN).toContain("```mermaid");
    expect(WELCOME_DOCUMENT_MARKDOWN).toContain("$$E = mc^2$$");
    expect(WELCOME_DOCUMENT_MARKDOWN).not.toContain("Documents rail");
  });
});
