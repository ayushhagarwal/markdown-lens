import { describe, expect, it } from "vitest";
import { MARKDOWN_LINT_RULES, lintMarkdown, type MarkdownRuleId } from "@/lib/markdown-lint";
import { applyLintFixes } from "@/lib/markdown-format";

const ids = (markdown: string, rule?: MarkdownRuleId) =>
  lintMarkdown(markdown)
    .map((issue) => issue.ruleId)
    .filter((id) => !rule || id === rule);

const has = (markdown: string, rule: MarkdownRuleId) => ids(markdown, rule).length > 0;

describe("lintMarkdown rules", () => {
  const cases: { rule: MarkdownRuleId; bad: string; good: string }[] = [
    { rule: "unclosed-code-fence", bad: "# T\n\n```js\nconst a = 1;\n", good: "# T\n\n```js\nconst a = 1;\n```\n" },
    { rule: "broken-anchor", bad: "# Intro\n\nSee [setup](#setup).\n", good: "# Intro\n\n## Setup\n\nSee [setup](#setup).\n" },
    { rule: "undefined-reference", bad: "See [docs][missing].\n", good: "See [docs][ref].\n\n[ref]: https://example.com\n" },
    { rule: "unused-definition", bad: "Text.\n\n[ref]: https://example.com\n", good: "See [ref].\n\n[ref]: https://example.com\n" },
    { rule: "empty-link", bad: "A [](https://example.com) and [b]().\n", good: "A [link](https://example.com).\n" },
    { rule: "image-alt", bad: "![](cat.png)\n", good: "![A cat](cat.png)\n" },
    { rule: "heading-increment", bad: "# A\n\n## B\n\n#### C\n", good: "# A\n\n## B\n\n### C\n\n## D\n" },
    { rule: "multiple-h1", bad: "# A\n\n# B\n", good: "# A\n\n## B\n" },
    { rule: "heading-space", bad: "##Heading\n", good: "## Heading\n" },
    { rule: "heading-punctuation", bad: "## Summary:\n", good: "## Summary\n\n## Why?\n" },
    { rule: "duplicate-heading", bad: "# A\n\n## Notes\n\n## Notes\n", good: "# A\n\n## One\n\n### Notes\n\n## Two\n\n### Notes\n" },
    { rule: "table-columns", bad: "| a | b |\n| - | - |\n| 1 | 2 | 3 |\n", good: "| a | b |\n| - | - |\n| 1 | 2 |\n" },
    { rule: "table-delimiter", bad: "| a | b |\n| 1 | 2 |\n| 3 | 4 |\n", good: "| a | b |\n| --- | :-: |\n| 1 | 2 |\n" },
    { rule: "list-marker", bad: "- a\n* b\n- c\n", good: "- a\n- b\n\n1. x\n" },
    { rule: "ordered-list-numbering", bad: "1. a\n2. b\n5. c\n", good: "1. a\n1. b\n1. c\n\nText\n\n3. x\n4. y\n" },
    { rule: "trailing-whitespace", bad: "Hello \nworld\n", good: "Hard  \nbreak\n" },
    { rule: "hard-tabs", bad: "Some\ttext\n", good: "Some text\n" },
    { rule: "blank-lines", bad: "a\n\n\n\nb\n", good: "a\n\n\nb\n" },
    { rule: "unbalanced-emphasis", bad: "This is **bold text.\n", good: "This is **bold** and __strong__ and 2 ** 3 and snake__case.\n" },
  ];

  for (const { rule, bad, good } of cases) {
    it(`${rule}: flags the problem`, () => expect(has(bad, rule)).toBe(true));
    it(`${rule}: accepts clean input`, () => expect(ids(good, rule)).toEqual([]));
  }

  it("exports every rule with a default severity and description", () => {
    expect(new Set(MARKDOWN_LINT_RULES.map((rule) => rule.id)).size).toBe(cases.length);
    for (const rule of MARKDOWN_LINT_RULES) expect(rule.description.length).toBeGreaterThan(10);
  });
});

describe("lintMarkdown details", () => {
  it("reports positions and severities", () => {
    const [issue] = lintMarkdown("# A\n\n```\ncode\n");
    expect(issue).toMatchObject({ ruleId: "unclosed-code-fence", severity: "error", line: 3, column: 1, from: 5 });
  });

  it("matches anchors against GitHub slugs including duplicate suffixes", () => {
    const doc = "# Intro\n\n## Set up & run!\n\n## FAQ\n\n## FAQ\n\n[a](#set-up--run) [b](#faq-1) [c](#faq-2)\n";
    const anchors = lintMarkdown(doc).filter((issue) => issue.ruleId === "broken-anchor");
    expect(anchors).toHaveLength(1);
    expect(doc.slice(anchors[0].from, anchors[0].to)).toBe("#faq-2");
  });

  it("slugs headings from their rendered text and accepts HTML ids", () => {
    const doc = "# Use `foo_bar` with **care**\n\n<a id=\"custom\"></a>\n\n[x](#use-foo_bar-with-care) [y](#custom)\n";
    expect(ids(doc, "broken-anchor")).toEqual([]);
  });

  it("suggests a case fix for anchors", () => {
    const doc = "# Getting Started\n\n[go](#Getting-Started)\n";
    const issue = lintMarkdown(doc).find((entry) => entry.ruleId === "broken-anchor");
    expect(issue?.fix?.insert).toBe("getting-started");
    expect(applyLintFixes(doc, issue ? [issue] : [])).toContain("[go](#getting-started)");
  });

  it("ignores everything inside code, comments, math and front matter", () => {
    const doc = [
      "---",
      "title: x   ",
      "list: [a](#nope)",
      "---",
      "",
      "# Doc",
      "",
      "```md",
      "##Nope   ",
      "[x](#missing) ![](a.png) **open",
      "* mixed",
      "```",
      "",
      "~~~",
      "\tTabbed",
      "~~~",
      "",
      "<!--",
      "[x](#missing)   ",
      "-->",
      "",
      "$$",
      "a **b \\\\ \t",
      "$$",
      "",
      "Inline `[x](#missing) **open` and $a **b$ fine.",
      "",
    ].join("\n");
    expect(lintMarkdown(doc)).toEqual([]);
  });

  it("ignores indented code blocks", () => {
    expect(lintMarkdown("# Doc\n\n    ##Nope **x\n    [a](#b)\n")).toEqual([]);
  });

  it("accepts footnotes and shortcut task boxes", () => {
    expect(lintMarkdown("# Doc\n\nText[^1] and [x](#user-content-fn-1).\n\n- [ ] task\n\n[^1]: Note.\n")).toEqual([]);
  });

  it("flags a malformed delimiter row and rebuilds it", () => {
    const doc = "| a | b |\n|:--|=:|\n| 1 | 2 |\n";
    const issues = lintMarkdown(doc).filter((issue) => issue.ruleId === "table-delimiter");
    expect(issues).toHaveLength(1);
    expect(applyLintFixes(doc, issues)).toBe("| a | b |\n| :--- | ---: |\n| 1 | 2 |\n");
  });

  it("respects disabled rules and the issue cap", () => {
    const doc = "a \n".repeat(50);
    expect(lintMarkdown(doc, { rules: { "trailing-whitespace": false } })).toEqual([]);
    expect(lintMarkdown(doc, { maxIssues: 10 })).toHaveLength(10);
  });

  it("applies all fixes in one pass", () => {
    const doc = "#Title  \n\n\n\n\n* a\n- b\n+ c\n\n1. x\n2. y\n7. z\n\n## End.\n";
    const fixed = applyLintFixes(doc, lintMarkdown(doc));
    expect(fixed).toBe("# Title\n\n* a\n* b\n* c\n\n1. x\n2. y\n3. z\n\n## End\n");
    expect(lintMarkdown(fixed)).toEqual([]);
  });

  it("closes an unclosed fence", () => {
    const doc = "# A\n\n```py\nx = 1";
    expect(applyLintFixes(doc, lintMarkdown(doc))).toBe("# A\n\n```py\nx = 1\n```\n");
  });

  it("lints a 300 KB document quickly", () => {
    const section = [
      "## Section",
      "",
      "Some **bold** text with a [link](https://example.com) and `code` and a [ref][r].",
      "",
      "- item one",
      "- item two",
      "",
      "| a | b |",
      "| --- | --- |",
      "| 1 | 2 |",
      "",
      "```js",
      "const x = 1;",
      "```",
      "",
    ].join("\n");
    const doc = `# Big\n\n${section.repeat(Math.ceil(300_000 / section.length))}\n[r]: https://example.com\n`;
    expect(doc.length).toBeGreaterThan(300_000);
    const start = performance.now();
    const issues = lintMarkdown(doc);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
    expect(issues.length).toBeLessThanOrEqual(500);
  });
});
