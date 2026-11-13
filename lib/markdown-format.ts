import type { MarkdownFix, MarkdownIssue } from "@/lib/markdown-lint";
import {
  continuesParagraph,
  isThematicBreak,
  isTopLevel,
  leadingWhitespace,
  scanMarkdown,
  splitTableCells,
  type ScannedLine,
} from "@/lib/markdown-scan";

export type MarkdownFormatOptions = {
  /** Align GFM tables (default true). */
  alignTables?: boolean;
  /** Normalise `*` and `+` bullets to `-` (default true). */
  normalizeListMarkers?: boolean;
  /** Renumber ordered lists sequentially from their first number (default true). */
  renumberLists?: boolean;
};

type Alignment = "none" | "left" | "center" | "right";

/**
 * Formats Markdown conservatively and idempotently. Content inside fenced
 * code, math blocks, HTML blocks, HTML comments and front matter is copied
 * verbatim.
 */
export function formatMarkdown(markdown: string, options: MarkdownFormatOptions = {}): string {
  if (!markdown.trim()) return "";
  const alignTables = options.alignTables !== false;
  const normalizeMarkers = options.normalizeListMarkers !== false;
  const renumber = options.renumberLists !== false;
  const eol = markdown.includes("\r\n") ? "\r\n" : "\n";
  const { lines } = scanMarkdown(markdown);
  const out: string[] = [];
  const listCounters = new Map<number, number>();
  let pendingBlanks = 0;
  let blankAfter = false;

  const emit = (text: string, blankBefore = false, needsBlankAfter = false) => {
    let blanks = pendingBlanks >= 3 ? 1 : pendingBlanks;
    if ((blankBefore || blankAfter) && blanks === 0) blanks = 1;
    if (!out.length) blanks = 0;
    for (let count = 0; count < blanks; count++) out.push("");
    out.push(text);
    pendingBlanks = 0;
    blankAfter = needsBlankAfter;
  };

  const lastIndex = lines.length > 1 && lines[lines.length - 1].text === "" ? lines.length - 2 : lines.length - 1;
  for (let index = 0; index <= lastIndex; index++) {
    const line = lines[index];
    const quote = line.text.slice(0, line.prefix);

    switch (line.kind) {
      case "frontmatter":
      case "code":
      case "math":
      case "html":
      case "comment":
        emit(line.text);
        continue;
      case "fence-open":
        emit(line.text, isTopLevel(line));
        continue;
      case "fence-close":
        emit(line.text, false, isTopLevel(line));
        continue;
      case "blank":
        if (line.prefix === 0) {
          pendingBlanks += 1;
          blankAfter = false;
        } else {
          emit(line.text.trimEnd());
        }
        continue;
    }

    if (line.role === "table" && line.table?.row === "header") {
      const rows: ScannedLine[] = [line];
      while (lines[index + 1]?.table?.tableId === line.table.tableId) rows.push(lines[++index]);
      const formatted = alignTables ? formatTable(rows) : rows.map((row) => row.text.trimEnd());
      const top = isTopLevel(line);
      formatted.forEach((text, position) => emit(text, top && position === 0, top && position === formatted.length - 1));
      continue;
    }

    if (line.role === "heading" && line.heading?.style === "atx") {
      const match = /^( {0,3})(#{1,6})[ \t]*(.*)$/.exec(line.content);
      const body = match ? match[3].trim() : line.content.trim();
      const text = match ? `${match[1]}${match[2]}${body ? ` ${body}` : ""}` : line.content.trimEnd();
      const top = isTopLevel(line);
      emit(quote + text, top, top);
      continue;
    }

    if (line.role === "hr" && isThematicBreak(line.content)) {
      const previous = lines[index - 1];
      const afterParagraph = previous?.kind === "text" && previous.role === "paragraph";
      if (isTopLevel(line)) emit("---", true, true);
      else if (!afterParagraph) emit(quote + leadingWhitespace(line.content) + "---");
      else emit(line.text.trimEnd());
      continue;
    }

    let content = line.content;
    const item = line.item;
    if (item && !item.ordered && normalizeMarkers && item.marker !== "-" && !item.empty) {
      content = content.slice(0, item.markerStart) + "-" + content.slice(item.markerEnd);
    } else if (item?.ordered && renumber) {
      const position = listCounters.get(item.listId);
      const first = position === undefined;
      const expected = first ? item.number : position;
      listCounters.set(item.listId, expected + 1);
      if (!first && expected !== item.number) {
        const digits = String(expected);
        const oldLength = item.markerEnd - 1 - item.markerStart;
        const growth = digits.length - oldLength;
        const spacing = item.spacing > 1 && growth > 0 ? Math.max(1, item.spacing - growth) : item.spacing;
        content =
          content.slice(0, item.markerStart) +
          digits +
          item.marker +
          content.slice(item.markerEnd, item.markerEnd + spacing) +
          content.slice(item.markerEnd + item.spacing);
      }
    }

    let text = quote + content;
    const trailing = /[ \t]+$/.exec(text);
    if (trailing) {
      const keepBreak = /^ {2,}$/.test(trailing[0]) && continuesParagraph(lines, index);
      text = text.slice(0, trailing.index) + (keepBreak ? "  " : "");
    }
    emit(text);
  }

  return out.length ? out.join(eol) + eol : "";
}

/** Returns the non-overlapping fixes of `issues`, sorted by position. */
export function selectLintFixes(issues: readonly MarkdownIssue[]): MarkdownFix[] {
  const fixes = issues
    .flatMap((issue) => (issue.fix ? [issue.fix] : []))
    .sort((a, b) => a.from - b.from || a.to - b.to);
  const selected: MarkdownFix[] = [];
  let lastTo = -1;
  for (const fix of fixes) {
    if (fix.from > fix.to || fix.from < lastTo) continue;
    selected.push(fix);
    lastTo = Math.max(lastTo, fix.to);
  }
  return selected;
}

/** Applies every non-overlapping fix in `issues` (offsets refer to `markdown`). */
export function applyLintFixes(markdown: string, issues: readonly MarkdownIssue[]): string {
  const fixes = selectLintFixes(issues).filter((fix) => fix.to <= markdown.length);
  if (!fixes.length) return markdown;
  let result = "";
  let last = 0;
  for (const fix of fixes) {
    result += markdown.slice(last, fix.from) + fix.insert;
    last = fix.to;
  }
  return result + markdown.slice(last);
}

function formatTable(rows: ScannedLine[]) {
  const header = rows[0];
  const indent = leadingWhitespace(header.content);
  const cells = rows.map((row) => splitTableCells(row.content));
  const columns = cells[0].length;
  const alignments: Alignment[] = (cells[1] ?? []).slice(0, columns).map((cell) => {
    const left = cell.startsWith(":");
    const right = cell.endsWith(":");
    return left && right ? "center" : right ? "right" : left ? "left" : "none";
  });
  const widths = Array.from({ length: columns }, (_, column) =>
    Math.max(3, ...cells.map((row, rowIndex) => (rowIndex === 1 ? 0 : displayWidth(row[column] ?? "")))),
  );

  return rows.map((row, rowIndex) => {
    const rowCells = cells[rowIndex];
    const parts =
      rowIndex === 1
        ? widths.map((width, column) => delimiterCell(alignments[column] ?? "none", width))
        : widths.map((width, column) => padCell(rowCells[column] ?? "", width, alignments[column] ?? "none"));
    if (rowIndex !== 1) parts.push(...rowCells.slice(columns));
    return `${row.text.slice(0, row.prefix)}${indent}| ${parts.join(" | ")} |`;
  });
}

function delimiterCell(alignment: Alignment, width: number) {
  if (alignment === "center") return `:${"-".repeat(width - 2)}:`;
  if (alignment === "left") return `:${"-".repeat(width - 1)}`;
  if (alignment === "right") return `${"-".repeat(width - 1)}:`;
  return "-".repeat(width);
}

function padCell(text: string, width: number, alignment: Alignment) {
  const space = Math.max(0, width - displayWidth(text));
  if (alignment === "right") return " ".repeat(space) + text;
  if (alignment === "center") {
    const left = Math.floor(space / 2);
    return " ".repeat(left) + text + " ".repeat(space - left);
  }
  return text + " ".repeat(space);
}

/** Monospace display width: East Asian wide characters and emoji count as 2, combining marks as 0. */
export function displayWidth(text: string) {
  let width = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (
      (code >= 0x300 && code <= 0x36f) ||
      (code >= 0x200b && code <= 0x200f) ||
      (code >= 0xfe00 && code <= 0xfe0f) ||
      (code >= 0x1ab0 && code <= 0x1aff) ||
      (code >= 0x20d0 && code <= 0x20ff)
    ) {
      continue;
    }
    width += isWide(code) ? 2 : 1;
  }
  return width;
}

function isWide(code: number) {
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0x303e) ||
    (code >= 0x3041 && code <= 0x33ff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0xa000 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x1f300 && code <= 0x1f64f) ||
    (code >= 0x1f680 && code <= 0x1f6ff) ||
    (code >= 0x1f900 && code <= 0x1f9ff) ||
    (code >= 0x20000 && code <= 0x3fffd)
  );
}
