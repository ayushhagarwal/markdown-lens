import { getDocumentHeadings } from "@/lib/editor-utils";

export type SlashCommandId =
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulleted-list"
  | "numbered-list"
  | "task-list"
  | "quote"
  | "code-block"
  | "table"
  | "mermaid"
  | "math"
  | "callout"
  | "horizontal-rule"
  | "link"
  | "image"
  | "footnote"
  | "details"
  | "table-of-contents"
  | "date";

/**
 * - `inline`: inserted where the slash was typed.
 * - `line`: must start its own line (a break is added when text precedes the slash).
 * - `block`: own line plus a blank line before and after when neighbours are not blank.
 */
export type SlashCommandLayout = "inline" | "line" | "block";

/** Text to insert. `selection` is relative to `text`; `appendix` is added at the end of the document. */
export type SlashTemplate = {
  text: string;
  selection?: [number, number];
  appendix?: { text: string; selection?: [number, number] };
};

export type SlashTemplateContext = {
  /** The document with the `/query` text already removed. */
  markdown: string;
  date: Date;
};

export type SlashCommand = {
  id: SlashCommandId;
  label: string;
  detail: string;
  keywords: readonly string[];
  layout: SlashCommandLayout;
  /** Commands the host may handle itself (for example by opening a dialog) instead of inserting the template. */
  host?: "table" | "image";
  template: (context: SlashTemplateContext) => SlashTemplate;
};

export type SlashChange = { from: number; to: number; insert: string };

export type SlashEdit = {
  /** Non-overlapping changes in ascending order, in the coordinates of the original document. */
  changes: SlashChange[];
  /** Selection in the coordinates of the changed document. */
  selection: { anchor: number; head: number };
};

export const DEFAULT_TABLE_MARKDOWN = [
  "| Column 1 | Column 2 | Column 3 |",
  "| -------- | -------- | -------- |",
  "|          |          |          |",
  "|          |          |          |",
].join("\n");

const MERMAID_SAMPLE = ["```mermaid", "flowchart TD", "  A[Start] --> B{Decision}", "  B -->|Yes| C[Done]", "  B -->|No| A", "```"].join("\n");

/** Builds `before + placeholder + after` with the placeholder selected. */
function placeholder(before: string, value: string, after = ""): SlashTemplate {
  return { text: before + value + after, selection: [before.length, before.length + value.length] };
}

function cursorAtEnd(text: string): SlashTemplate {
  return { text, selection: [text.length, text.length] };
}

export function formatLocalDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Next unused numeric footnote label in the document. */
export function nextFootnoteNumber(markdown: string) {
  let highest = 0;
  for (const match of markdown.matchAll(/\[\^(\d+)\]/g)) highest = Math.max(highest, Number(match[1]));
  return highest + 1;
}

/**
 * A nested Markdown list linking to every heading with GitHub-style slugs.
 * A lone H1 (the document title) is skipped when other headings exist.
 */
export function buildTableOfContents(markdown: string) {
  let headings = getDocumentHeadings(markdown).filter((heading) => heading.text);
  const titles = headings.filter((heading) => heading.level === 1);
  if (titles.length === 1 && headings.length > 1) headings = headings.filter((heading) => heading !== titles[0]);
  if (!headings.length) return "";
  const minLevel = Math.min(...headings.map((heading) => heading.level));
  return headings
    .map((heading) => {
      const indent = "  ".repeat(heading.level - minLevel);
      const text = heading.text.replace(/([[\]\\])/g, "\\$1");
      return `${indent}- [${text}](#${heading.id})`;
    })
    .join("\n");
}

export const SLASH_COMMANDS: readonly SlashCommand[] = [
  { id: "heading1", label: "Heading 1", detail: "Large section title", keywords: ["h1", "title"], layout: "line", template: () => placeholder("# ", "Heading") },
  { id: "heading2", label: "Heading 2", detail: "Medium section title", keywords: ["h2", "subtitle"], layout: "line", template: () => placeholder("## ", "Heading") },
  { id: "heading3", label: "Heading 3", detail: "Small section title", keywords: ["h3"], layout: "line", template: () => placeholder("### ", "Heading") },
  { id: "bulleted-list", label: "Bulleted list", detail: "Simple bullet points", keywords: ["ul", "unordered", "bullet"], layout: "line", template: () => cursorAtEnd("- ") },
  { id: "numbered-list", label: "Numbered list", detail: "Ordered steps", keywords: ["ol", "ordered", "number"], layout: "line", template: () => cursorAtEnd("1. ") },
  { id: "task-list", label: "Task list", detail: "Checklist with checkboxes", keywords: ["todo", "checkbox", "check"], layout: "line", template: () => cursorAtEnd("- [ ] ") },
  { id: "quote", label: "Quote", detail: "Block quotation", keywords: ["blockquote", "citation"], layout: "line", template: () => cursorAtEnd("> ") },
  { id: "code-block", label: "Code block", detail: "Fenced code with a language", keywords: ["fence", "snippet", "pre"], layout: "block", template: () => placeholder("```", "language", "\n\n```") },
  { id: "table", label: "Table", detail: "Edit rows and columns visually", keywords: ["grid", "spreadsheet", "columns"], layout: "block", host: "table", template: () => placeholder("| ", "Column 1", DEFAULT_TABLE_MARKDOWN.slice("| Column 1".length)) },
  { id: "mermaid", label: "Mermaid diagram", detail: "Flowchart rendered in preview", keywords: ["diagram", "flowchart", "chart", "graph"], layout: "block", template: () => placeholder("```mermaid\nflowchart TD\n  A[", "Start", MERMAID_SAMPLE.slice("```mermaid\nflowchart TD\n  A[Start".length)) },
  { id: "math", label: "Math block", detail: "LaTeX equation", keywords: ["latex", "katex", "equation", "formula"], layout: "block", template: () => placeholder("$$\n", "E = mc^2", "\n$$") },
  { id: "callout", label: "Callout", detail: "GitHub alert: note, tip, warning", keywords: ["alert", "note", "tip", "warning", "admonition"], layout: "block", template: () => placeholder("> [!NOTE]\n> ", "Useful information.") },
  { id: "horizontal-rule", label: "Horizontal rule", detail: "Divider line", keywords: ["hr", "divider", "separator", "line"], layout: "block", template: () => cursorAtEnd("---\n") },
  { id: "link", label: "Link", detail: "Inline hyperlink", keywords: ["url", "href", "anchor"], layout: "inline", template: () => placeholder("[", "link text", "](https://)") },
  { id: "image", label: "Image", detail: "Embed a picture", keywords: ["picture", "photo", "img"], layout: "inline", host: "image", template: () => placeholder("![", "alt text", "](https://)") },
  {
    id: "footnote",
    label: "Footnote",
    detail: "Reference with a note at the end",
    keywords: ["reference", "citation", "note"],
    layout: "inline",
    template: ({ markdown }) => {
      const label = `[^${nextFootnoteNumber(markdown)}]`;
      const definition = placeholder(`${label}: `, "Footnote text.");
      return { text: label, appendix: { text: definition.text, selection: definition.selection } };
    },
  },
  { id: "details", label: "Details", detail: "Collapsible summary block", keywords: ["summary", "collapse", "toggle", "accordion"], layout: "block", template: () => placeholder("<details>\n<summary>", "Summary", "</summary>\n\nDetails go here.\n\n</details>") },
  {
    id: "table-of-contents",
    label: "Table of contents",
    detail: "Links to every heading",
    keywords: ["toc", "contents", "outline", "index"],
    layout: "block",
    template: ({ markdown }) => {
      const toc = buildTableOfContents(markdown);
      return toc ? cursorAtEnd(toc) : placeholder("- [", "Heading", "](#heading)");
    },
  },
  { id: "date", label: "Today's date", detail: "Insert YYYY-MM-DD", keywords: ["today", "now", "time"], layout: "inline", template: ({ date }) => cursorAtEnd(formatLocalDate(date)) },
];

export function getSlashCommand(id: SlashCommandId) {
  const command = SLASH_COMMANDS.find((item) => item.id === id);
  if (!command) throw new Error(`Unknown slash command: ${id}`);
  return command;
}

function isSubsequence(query: string, text: string) {
  let index = 0;
  for (const character of text) if (character === query[index]) index += 1;
  return index === query.length;
}

/** Filters and ranks commands for the text typed after `/`. An empty query returns every command in order. */
export function filterSlashCommands(query: string, commands: readonly SlashCommand[] = SLASH_COMMANDS): SlashCommand[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...commands];
  const scored = commands.map((command, index) => {
    const label = command.label.toLowerCase();
    const words = [...label.split(/\s+/), ...command.keywords, command.id];
    let score = 0;
    if (label.startsWith(needle)) score = 4;
    else if (words.some((word) => word.startsWith(needle))) score = 3;
    else if (label.includes(needle) || command.keywords.some((word) => word.includes(needle))) score = 2;
    else if (isSubsequence(needle, label.replace(/\s+/g, ""))) score = 1;
    return { command, index, score };
  });
  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.command);
}

/** True when `offset` sits inside a fenced code block or an inline code span. */
export function isInsideCode(markdown: string, offset: number) {
  const lineStart = markdown.lastIndexOf("\n", offset - 1) + 1;
  let fence: { character: string; length: number } | null = null;
  for (const rawLine of markdown.slice(0, lineStart).split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (fence) {
      const close = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      if (close && close[1][0] === fence.character && close[1].length >= fence.length) fence = null;
      continue;
    }
    const open = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (open && !(open[1][0] === "`" && open[2].includes("`"))) fence = { character: open[1][0], length: open[1].length };
  }
  if (fence) return true;

  const prefix = markdown.slice(lineStart, offset);
  if (/^ {0,3}(`{3,}|~{3,})/.test(prefix)) return true;
  let openRun = 0;
  for (const match of prefix.matchAll(/`+/g)) {
    const run = match[0].length;
    if (!openRun) openRun = run;
    else if (run === openRun) openRun = 0;
  }
  return openRun > 0;
}

/**
 * Finds a `/query` trigger ending at `cursor`: the slash must start the line or follow whitespace,
 * and must not be inside code.
 */
export function findSlashTrigger(markdown: string, cursor: number): { from: number; to: number; query: string } | null {
  const lineStart = markdown.lastIndexOf("\n", cursor - 1) + 1;
  const match = markdown.slice(lineStart, cursor).match(/(?:^|\s)\/([\p{L}\p{N}-]{0,24})$/u);
  if (!match) return null;
  const from = cursor - match[1].length - 1;
  if (isInsideCode(markdown, from)) return null;
  return { from, to: cursor, query: match[1] };
}

/**
 * Computes the edit that replaces `markdown.slice(from, to)` (the `/query` text) with a command's
 * template, adding line breaks so block syntax lands on its own line.
 */
export function buildSlashEdit(
  command: SlashCommand,
  { markdown, from, to, date = new Date() }: { markdown: string; from: number; to: number; date?: Date },
): SlashEdit {
  const template = command.template({ markdown: markdown.slice(0, from) + markdown.slice(to), date });
  const lineStart = markdown.lastIndexOf("\n", from - 1) + 1;
  const before = markdown.slice(lineStart, from);
  const nextBreak = markdown.indexOf("\n", to);
  const lineEnd = nextBreak < 0 ? markdown.length : nextBreak;
  const after = markdown.slice(to, lineEnd);

  let replaceFrom = from;
  let prefix = "";
  let suffix = "";
  if (command.layout !== "inline") {
    const textBefore = before.trim() !== "";
    if (textBefore) replaceFrom = lineStart + before.trimEnd().length;
    if (command.layout === "line") {
      if (textBefore) prefix = "\n";
    } else {
      const previousLineStart = lineStart > 0 ? markdown.lastIndexOf("\n", lineStart - 2) + 1 : -1;
      const previousLineBlank = previousLineStart < 0 || markdown.slice(previousLineStart, lineStart - 1).trim() === "";
      if (textBefore) prefix = "\n\n";
      else if (!previousLineBlank) prefix = "\n";
      const nextLineEnd = nextBreak < 0 ? -1 : markdown.indexOf("\n", nextBreak + 1);
      const nextLine = nextBreak < 0 ? "" : markdown.slice(nextBreak + 1, nextLineEnd < 0 ? markdown.length : nextLineEnd);
      if (after.trim()) suffix = template.text.endsWith("\n") ? "\n" : "\n\n";
      else if (nextLine.trim()) suffix = template.text.endsWith("\n") ? "" : "\n";
    }
  }

  const insert = prefix + template.text + suffix;
  const [selectionStart, selectionEnd] = template.selection ?? [template.text.length, template.text.length];
  const base = replaceFrom + prefix.length;
  const changes: SlashChange[] = [{ from: replaceFrom, to, insert }];
  let selection = { anchor: base + selectionStart, head: base + selectionEnd };

  if (template.appendix) {
    const updated = markdown.slice(0, replaceFrom) + insert + markdown.slice(to);
    const separator = updated.endsWith("\n\n") ? "" : updated.endsWith("\n") ? "\n" : "\n\n";
    const appendixText = separator + template.appendix.text;
    const [appendixStart, appendixEnd] = template.appendix.selection ?? [template.appendix.text.length, template.appendix.text.length];
    const delta = insert.length - (to - replaceFrom);
    const appendixBase = markdown.length + delta + separator.length;
    if (to === markdown.length) changes[0] = { from: replaceFrom, to, insert: insert + appendixText };
    else changes.push({ from: markdown.length, to: markdown.length, insert: appendixText });
    selection = { anchor: appendixBase + appendixStart, head: appendixBase + appendixEnd };
  }

  return { changes, selection };
}

/** Applies a `SlashEdit` to a string (for tests and non-CodeMirror callers). */
export function applySlashEdit(markdown: string, edit: SlashEdit) {
  let result = markdown;
  for (const change of [...edit.changes].sort((a, b) => b.from - a.from)) {
    result = result.slice(0, change.from) + change.insert + result.slice(change.to);
  }
  return result;
}
