import { describe, expect, it } from "vitest";
import { parseMarkdownTable } from "@/lib/markdown-table";
import {
  DEFAULT_TABLE_MARKDOWN,
  SLASH_COMMANDS,
  applySlashEdit,
  buildSlashEdit,
  buildTableOfContents,
  filterSlashCommands,
  findSlashTrigger,
  getSlashCommand,
  isInsideCode,
  nextFootnoteNumber,
  type SlashCommandId,
} from "@/lib/slash-commands";

const date = new Date(2026, 10, 12, 9, 30);

/** Runs a command on a document where `¦` marks the cursor right after the typed `/query`. */
function run(id: SlashCommandId, documentWithCursor: string) {
  const cursor = documentWithCursor.indexOf("¦");
  const markdown = documentWithCursor.replace("¦", "");
  const trigger = findSlashTrigger(markdown, cursor);
  if (!trigger) throw new Error("No slash trigger");
  const edit = buildSlashEdit(getSlashCommand(id), { markdown, from: trigger.from, to: trigger.to, date });
  const text = applySlashEdit(markdown, edit);
  return { text, selected: text.slice(edit.selection.anchor, edit.selection.head), anchor: edit.selection.anchor, head: edit.selection.head };
}

describe("slash command definitions", () => {
  it("has unique ids and a label and detail for every item", () => {
    expect(new Set(SLASH_COMMANDS.map((command) => command.id)).size).toBe(SLASH_COMMANDS.length);
    for (const command of SLASH_COMMANDS) {
      expect(command.label).toBeTruthy();
      expect(command.detail).toBeTruthy();
    }
    expect(() => getSlashCommand("nope" as SlashCommandId)).toThrow();
  });

  it("filters by label prefix, keywords and fuzzy matches", () => {
    expect(filterSlashCommands("")).toHaveLength(SLASH_COMMANDS.length);
    expect(filterSlashCommands("h2")[0].id).toBe("heading2");
    expect(filterSlashCommands("tab")[0].id).toBe("table");
    expect(filterSlashCommands("tab").map((command) => command.id)).toContain("table-of-contents");
    expect(filterSlashCommands("toc")[0].id).toBe("table-of-contents");
    expect(filterSlashCommands("todo")[0].id).toBe("task-list");
    expect(filterSlashCommands("warn")[0].id).toBe("callout");
    expect(filterSlashCommands("mrmd")[0].id).toBe("mermaid");
    expect(filterSlashCommands("zzzz")).toEqual([]);
  });
});

describe("findSlashTrigger", () => {
  it("triggers at line start or after whitespace", () => {
    expect(findSlashTrigger("/", 1)).toEqual({ from: 0, to: 1, query: "" });
    expect(findSlashTrigger("text /hea", 9)).toEqual({ from: 5, to: 9, query: "hea" });
    expect(findSlashTrigger("a\n  /h1", 7)).toEqual({ from: 4, to: 7, query: "h1" });
  });

  it("ignores slashes inside words, URLs and paths", () => {
    expect(findSlashTrigger("and/or", 6)).toBeNull();
    expect(findSlashTrigger("https://x.com/a", 15)).toBeNull();
    expect(findSlashTrigger("/one two", 8)).toBeNull();
  });

  it("ignores fenced and inline code", () => {
    expect(findSlashTrigger("```\n/", 5)).toBeNull();
    expect(findSlashTrigger("~~~js\ncode /x", 13)).toBeNull();
    expect(findSlashTrigger("```\ncode\n```\n/", 14)).not.toBeNull();
    expect(findSlashTrigger("use `npm /run", 13)).toBeNull();
    expect(findSlashTrigger("use `npm` /run", 14)).not.toBeNull();
    expect(findSlashTrigger("``a ` b`` /x", 12)).not.toBeNull();
  });

  it("isInsideCode tracks fence characters and lengths", () => {
    expect(isInsideCode("````\n```\n", 9)).toBe(true);
    expect(isInsideCode("````\n````\n", 10)).toBe(false);
    expect(isInsideCode("```\n~~~\n", 8)).toBe(true);
  });
});

describe("slash command output", () => {
  it.each([
    ["heading1", "# Heading", "Heading"],
    ["heading2", "## Heading", "Heading"],
    ["heading3", "### Heading", "Heading"],
  ] as const)("%s inserts a heading with the placeholder selected", (id, text, selected) => {
    expect(run(id, "/h¦")).toMatchObject({ text, selected });
  });

  it.each([
    ["bulleted-list", "- "],
    ["numbered-list", "1. "],
    ["task-list", "- [ ] "],
    ["quote", "> "],
  ] as const)("%s inserts a marker with the cursor after it", (id, text) => {
    const result = run(id, "/x¦");
    expect(result.text).toBe(text);
    expect(result.anchor).toBe(text.length);
    expect(result.head).toBe(text.length);
  });

  it("keeps indentation for nested list items", () => {
    expect(run("bulleted-list", "- a\n  /b¦").text).toBe("- a\n  - ");
  });

  it("moves line blocks onto their own line when text precedes the slash", () => {
    expect(run("heading2", "Intro /h2¦")).toMatchObject({ text: "Intro\n## Heading", selected: "Heading" });
  });

  it("code block selects the language placeholder", () => {
    const result = run("code-block", "/code¦");
    expect(result.text).toBe("```language\n\n```");
    expect(result.selected).toBe("language");
  });

  it("adds blank lines around blocks next to text", () => {
    expect(run("code-block", "Para\n/code¦\nNext").text).toBe("Para\n\n```language\n\n```\n\nNext");
    expect(run("code-block", "Para /code¦").text).toBe("Para\n\n```language\n\n```");
    expect(run("code-block", "Para\n\n/code¦\n\nNext").text).toBe("Para\n\n```language\n\n```\n\nNext");
  });

  it("table falls back to a default Markdown table with the first header selected", () => {
    const result = run("table", "/table¦");
    expect(result.text).toBe(DEFAULT_TABLE_MARKDOWN);
    expect(result.selected).toBe("Column 1");
    expect(parseMarkdownTable(result.text)?.headers).toEqual(["Column 1", "Column 2", "Column 3"]);
    expect(getSlashCommand("table").host).toBe("table");
  });

  it("mermaid inserts a valid flowchart", () => {
    const result = run("mermaid", "/mer¦");
    expect(result.text).toMatch(/^```mermaid\nflowchart TD\n[\s\S]*-->[\s\S]*\n```$/);
    expect(result.selected).toBe("Start");
  });

  it("math block selects the formula", () => {
    expect(run("math", "/math¦")).toMatchObject({ text: "$$\nE = mc^2\n$$", selected: "E = mc^2" });
  });

  it("callout inserts a GitHub alert", () => {
    expect(run("callout", "/note¦")).toMatchObject({ text: "> [!NOTE]\n> Useful information.", selected: "Useful information." });
  });

  it("horizontal rule leaves the cursor on the next line", () => {
    const result = run("horizontal-rule", "Para\n/hr¦");
    expect(result.text).toBe("Para\n\n---\n");
    expect(result.anchor).toBe(result.text.length);
    expect(run("horizontal-rule", "/hr¦\nNext").text).toBe("---\n\nNext");
  });

  it("link and image are inline with the text placeholder selected", () => {
    expect(run("link", "See /link¦ now")).toMatchObject({ text: "See [link text](https://) now", selected: "link text" });
    expect(run("image", "/img¦")).toMatchObject({ text: "![alt text](https://)", selected: "alt text" });
    expect(getSlashCommand("image").host).toBe("image");
  });

  it("footnote adds a reference and a definition at the end", () => {
    const result = run("footnote", "Claim /foot¦ here.\n\nMore[^1].\n\n[^1]: First.");
    expect(result.text).toBe("Claim [^2] here.\n\nMore[^1].\n\n[^1]: First.\n\n[^2]: Footnote text.");
    expect(result.selected).toBe("Footnote text.");
  });

  it("footnote at the end of a one-line document", () => {
    const result = run("footnote", "Claim /fn¦");
    expect(result.text).toBe("Claim [^1]\n\n[^1]: Footnote text.");
    expect(result.selected).toBe("Footnote text.");
    expect(nextFootnoteNumber("[^3] [^10]")).toBe(11);
  });

  it("details block selects the summary", () => {
    expect(run("details", "/det¦")).toMatchObject({
      text: "<details>\n<summary>Summary</summary>\n\nDetails go here.\n\n</details>",
      selected: "Summary",
    });
  });

  it("table of contents links headings with GitHub slugs", () => {
    const doc = "# Title\n\n/toc¦\n\n## Getting Started\n\n### Install & Run\n\n## Getting Started\n\n## API [v2]";
    const result = run("table-of-contents", doc);
    expect(result.text).toBe(
      "# Title\n\n- [Getting Started](#getting-started)\n  - [Install & Run](#install--run)\n- [Getting Started](#getting-started-1)\n- [API \\[v2\\]](#api-v2)\n\n## Getting Started\n\n### Install & Run\n\n## Getting Started\n\n## API [v2]",
    );
    expect(buildTableOfContents("# A\n# B")).toBe("- [A](#a)\n- [B](#b)");
  });

  it("table of contents ignores headings in code and falls back to a placeholder", () => {
    expect(buildTableOfContents("```\n# not a heading\n```")).toBe("");
    expect(run("table-of-contents", "/toc¦")).toMatchObject({ text: "- [Heading](#heading)", selected: "Heading" });
  });

  it("date inserts the local date", () => {
    const result = run("date", "Due /today¦");
    expect(result.text).toBe("Due 2026-11-12");
    expect(result.anchor).toBe(result.text.length);
  });

  it("every command yields a selection within the new document", () => {
    for (const command of SLASH_COMMANDS) {
      const markdown = "# Doc\n\nText\n/" + command.id.slice(0, 2);
      const trigger = findSlashTrigger(markdown, markdown.length);
      expect(trigger).not.toBeNull();
      const edit = buildSlashEdit(command, { markdown, from: trigger!.from, to: trigger!.to, date });
      const text = applySlashEdit(markdown, edit);
      expect(text.startsWith("# Doc\n\nText")).toBe(true);
      expect(text.endsWith("/" + command.id.slice(0, 2))).toBe(false);
      expect(edit.selection.anchor).toBeGreaterThanOrEqual(0);
      expect(edit.selection.head).toBeLessThanOrEqual(text.length);
      expect(edit.selection.anchor).toBeLessThanOrEqual(edit.selection.head);
    }
  });
});
