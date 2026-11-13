import { describe, expect, it } from "vitest";
import { applyLintFixes, displayWidth, formatMarkdown } from "@/lib/markdown-format";
import { lintMarkdown } from "@/lib/markdown-lint";

const fixture = [
  "---",
  "title: Keep   ",
  "tags: [a,b]",
  "---",
  "#Title   ",
  "Intro paragraph with trailing   ",
  "hard break  ",
  "continues here.",
  "* one",
  "* two",
  "    * nested",
  "+ three",
  "",
  "",
  "",
  "",
  "3. a",
  "3. b",
  "9. c",
  "",
  "***",
  "",
  "|Name|Qty|Note|",
  "|:--|--:|:-:|",
  "|apple|1|crisp \\| sweet|",
  "|日本語|22|",
  "## Next  ",
  "```js",
  "const  a = 1;   ",
  "",
  "",
  "",
  "* not a list",
  "```",
  "After fence.",
  "<div>",
  "  keep   ",
  "* this",
  "</div>",
  "",
  "$$",
  "x   ",
  "$$",
  "",
  "> quote   ",
  "> * item",
  "",
  "___",
  "Last line",
  "",
  "",
].join("\n");

describe("formatMarkdown", () => {
  it("formats a varied document", () => {
    expect(formatMarkdown(fixture)).toBe(
      [
        "---",
        "title: Keep   ",
        "tags: [a,b]",
        "---",
        "",
        "# Title",
        "",
        "Intro paragraph with trailing  ",
        "hard break  ",
        "continues here.",
        "- one",
        "- two",
        "    - nested",
        "- three",
        "",
        "3. a",
        "4. b",
        "5. c",
        "",
        "---",
        "",
        "| Name   | Qty |      Note      |",
        "| :----- | --: | :------------: |",
        "| apple  |   1 | crisp \\| sweet |",
        "| 日本語 |  22 |                |",
        "",
        "## Next",
        "",
        "```js",
        "const  a = 1;   ",
        "",
        "",
        "",
        "* not a list",
        "```",
        "",
        "After fence.",
        "<div>",
        "  keep   ",
        "* this",
        "</div>",
        "",
        "$$",
        "x   ",
        "$$",
        "",
        "> quote",
        "> - item",
        "",
        "---",
        "",
        "Last line",
        "",
      ].join("\n"),
    );
  });

  it("is idempotent", () => {
    const once = formatMarkdown(fixture);
    expect(formatMarkdown(once)).toBe(once);
    const messy = "Para\n***\n#A\n|a|b|\n|-|-|\n|x|\n- [ ] t\n+ u\n10. a\n10. b\n\n\n\n\nend";
    const first = formatMarkdown(messy);
    expect(formatMarkdown(first)).toBe(first);
  });

  it("aligns tables using display width and keeps escaped pipes", () => {
    const table = "| a | b |\n|---|---|\n| 漢字漢字 | `x \\| y` |\n| 😀 | é |\n";
    const out = formatMarkdown(table).split("\n");
    expect(out[0]).toBe("| a        | b        |");
    expect(out[1]).toBe("| -------- | -------- |");
    expect(out[2]).toBe("| 漢字漢字 | `x \\| y` |");
    expect(out[3]).toBe("| 😀       | é        |");
    expect(displayWidth("漢字")).toBe(4);
    expect(displayWidth("é")).toBe(1);
  });

  it("does not turn a thematic break after a paragraph into a setext heading", () => {
    expect(formatMarkdown("Text\n***\nMore")).toBe("Text\n\n---\n\nMore\n");
    expect(formatMarkdown("Title\n---\nBody")).toBe("Title\n---\nBody\n");
  });

  it("collapses 3+ blank lines, keeps two, and ends with one newline", () => {
    expect(formatMarkdown("a\n\n\n\nb\n\n\nc\n\n\n")).toBe("a\n\nb\n\n\nc\n");
    expect(formatMarkdown("\n\na")).toBe("a\n");
    expect(formatMarkdown("   \n")).toBe("");
  });

  it("preserves CRLF line endings", () => {
    expect(formatMarkdown("#A\r\ntext  \r\n")).toBe("# A\r\n\r\ntext\r\n");
  });

  it("leaves unclosed fences and HTML comments untouched", () => {
    const doc = "# A\n\n<!--\n* x   \n-->\n\n```\n* y   \n";
    expect(formatMarkdown(doc)).toBe("# A\n\n<!--\n* x   \n-->\n\n```\n* y   \n");
  });

  it("produces output with no fixable formatting issues", () => {
    const out = formatMarkdown(fixture);
    const rules = new Set(lintMarkdown(out).map((issue) => issue.ruleId));
    for (const rule of ["heading-space", "list-marker", "ordered-list-numbering", "trailing-whitespace", "blank-lines", "table-columns"]) {
      expect(rules.has(rule as never)).toBe(false);
    }
  });
});

describe("applyLintFixes", () => {
  it("skips overlapping fixes", () => {
    const issues = [
      { ruleId: "trailing-whitespace", severity: "info", message: "", line: 1, column: 1, from: 0, to: 3, fix: { from: 0, to: 3, insert: "X", label: "" } },
      { ruleId: "trailing-whitespace", severity: "info", message: "", line: 1, column: 2, from: 1, to: 2, fix: { from: 1, to: 2, insert: "Y", label: "" } },
      { ruleId: "trailing-whitespace", severity: "info", message: "", line: 1, column: 4, from: 3, to: 3, fix: { from: 3, to: 3, insert: "Z", label: "" } },
    ] as const;
    expect(applyLintFixes("abcd", issues)).toBe("XZd");
  });

  it("returns the input when there is nothing to fix", () => {
    expect(applyLintFixes("ok\n", [])).toBe("ok\n");
  });
});
