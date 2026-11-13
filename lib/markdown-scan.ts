/**
 * Single-pass, line-based Markdown block scanner shared by the linter and the
 * formatter. It is not a full CommonMark parser: it recognises just enough
 * block structure (front matter, fences, math, HTML, lists, headings, tables)
 * to keep both tools out of code and to group list items and table rows.
 */

export type LineKind =
  | "blank"
  | "text"
  | "frontmatter"
  | "fence-open"
  | "fence-close"
  | "code"
  | "math"
  | "html"
  | "comment";

export type LineRole = "paragraph" | "heading" | "setext-underline" | "hr" | "table";

export type ListItemInfo = {
  listId: number;
  ordered: boolean;
  /** `-`, `*` or `+` for bullets; `.` or `)` for ordered items. */
  marker: string;
  number: number;
  /** Index in `content` where the marker (bullet char or first digit) starts. */
  markerStart: number;
  /** Index in `content` just after the marker (bullet char or delimiter). */
  markerEnd: number;
  /** Whitespace characters between the marker and the item text. */
  spacing: number;
  empty: boolean;
};

export type HeadingInfo = {
  level: number;
  style: "atx" | "setext";
  /** True for `#Heading` (no space), which Markdown renders as plain text. */
  noSpace: boolean;
  /** Raw inline Markdown of the heading text, without markers or closing hashes. */
  raw: string;
  /** Absolute offsets of `raw` in the document. */
  textFrom: number;
  textTo: number;
  /** Absolute offset just after the opening hashes (ATX only). */
  hashesEnd: number;
};

export type TableRowInfo = {
  tableId: number;
  row: "header" | "delimiter" | "body";
  columns: number;
};

export type ScannedLine = {
  index: number;
  /** 1-based line number. */
  number: number;
  /** Absolute offset of the line start. */
  from: number;
  /** Full line text without the line ending. */
  text: string;
  kind: LineKind;
  role?: LineRole;
  /** Length of the blockquote prefix (`> `) stripped from `content`. */
  prefix: number;
  quoteDepth: number;
  /** `text` without the blockquote prefix. */
  content: string;
  /** Visual indentation of `content` (tabs expand to 4). */
  indent: number;
  /** Whether the line sits inside a list after it was processed. */
  listContext: boolean;
  item?: ListItemInfo;
  heading?: HeadingInfo;
  table?: TableRowInfo;
};

export type MarkdownScan = {
  lines: ScannedLine[];
  /** Opening lines of fences that are never closed. */
  unclosedFences: ScannedLine[];
};

type ListFrame = { id: number; column: number; contentColumn: number; ordered: boolean };

const QUOTE = /^(?: {0,3}>[ \t]?)+/;
const FENCE_OPEN = /^([ \t]*)(`{3,}|~{3,})(.*)$/;
const HR = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const ATX = /^( {0,3})(#{1,6})(?=[ \t]|$)/;
const ATX_NO_SPACE = /^( {0,3})(#{1,6})(?=[^\s#])/;
const SETEXT = /^ {0,3}(=+|-+)[ \t]*$/;
const BULLET = /^([ \t]*)([-*+])([ \t]+|$)/;
const ORDERED = /^([ \t]*)(\d{1,9})([.)])([ \t]+|$)/;
const MATH_OPEN = /^[ \t]*\$\$/;
const COMMENT_OPEN = /^ {0,3}<!--/;
const RAW_HTML = /^ {0,3}<(script|pre|style|textarea)(?=[\s>]|$)/i;
const HTML_BLOCK =
  /^ {0,3}<\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?=[\s/>]|$)/i;
const HTML_TAG_LINE = /^ {0,3}<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?\/?>\s*$/;
const DELIMITER_CELL = /^:?-+:?$/;
const CLOSING_HASHES = /(?:^|[ \t]+)#+[ \t]*$/;

/** Splits a document into lines with their start offsets (handles `\r\n`). */
export function splitLines(markdown: string) {
  const lines: { text: string; from: number }[] = [];
  let from = 0;
  while (true) {
    const end = markdown.indexOf("\n", from);
    const stop = end === -1 ? markdown.length : end;
    const text = stop > from && markdown.charCodeAt(stop - 1) === 13 ? markdown.slice(from, stop - 1) : markdown.slice(from, stop);
    lines.push({ text, from });
    if (end === -1) break;
    from = end + 1;
  }
  return lines;
}

export function indentWidth(text: string) {
  let width = 0;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code === 32) width += 1;
    else if (code === 9) width += 4 - (width % 4);
    else break;
  }
  return width;
}

export function leadingWhitespace(text: string) {
  return /^[ \t]*/.exec(text)?.[0] ?? "";
}

export function hasUnescapedPipe(text: string) {
  let index = text.indexOf("|");
  while (index !== -1) {
    if (index === 0 || text[index - 1] !== "\\") return true;
    index = text.indexOf("|", index + 1);
  }
  return false;
}

/** Splits a GFM table row into trimmed cells. Escaped pipes (`\|`) stay inside cells. */
export function splitTableCells(content: string) {
  let row = content.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|") && !row.endsWith("\\|")) row = row.slice(0, -1);
  const cells: string[] = [];
  let current = "";
  for (let index = 0; index < row.length; index++) {
    const char = row[index];
    if (char === "\\" && index + 1 < row.length) {
      current += char + row[index + 1];
      index += 1;
    } else if (char === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

/** Returns the delimiter cells when `content` is a valid GFM delimiter row. */
export function parseDelimiterRow(content: string) {
  if (!content.includes("|") || !content.includes("-")) return null;
  if (!/^[ \t|:-]+$/.test(content)) return null;
  const cells = splitTableCells(content);
  return cells.every((cell) => DELIMITER_CELL.test(cell)) ? cells : null;
}

/** A line that was meant as a delimiter row (only pipes, dashes, colons, `=`, `+`). */
export function looksLikeDelimiterRow(content: string) {
  return content.includes("|") && /[-=]/.test(content) && /^[ \t|:=+-]+$/.test(content);
}

export function isThematicBreak(content: string) {
  return HR.test(content);
}

/**
 * Masks inline code spans, inline HTML (comments, tags, autolinks), inline
 * math and backslash escapes with spaces so inline rules can scan the line
 * without matching inside them. The result has the same length as `text`.
 */
export function maskInline(text: string) {
  if (!/[`\\$<]/.test(text)) return text;
  let result = "";
  let last = 0;
  const mask = (start: number, end: number) => {
    result += text.slice(last, start) + " ".repeat(end - start);
    last = end;
  };
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === "\\" && index + 1 < text.length && isAsciiPunctuation(text.charCodeAt(index + 1))) {
      mask(index, index + 2);
      index += 2;
    } else if (char === "`") {
      let run = 1;
      while (text[index + run] === "`") run += 1;
      const close = findBacktickRun(text, index + run, run);
      if (close === -1) {
        index += run;
      } else {
        mask(index, close + run);
        index = close + run;
      }
    } else if (char === "<") {
      if (text.startsWith("<!--", index)) {
        const close = text.indexOf("-->", index + 4);
        const end = close === -1 ? text.length : close + 3;
        mask(index, end);
        index = end;
        continue;
      }
      const tag = /^<(?:[A-Za-z][A-Za-z0-9+.-]{1,31}:[^\s<>]*|\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?\/?)>/.exec(text.slice(index, index + 2000));
      if (tag) {
        mask(index, index + tag[0].length);
        index += tag[0].length;
      } else {
        index += 1;
      }
    } else if (char === "$") {
      const end = findMathEnd(text, index);
      if (end === -1) {
        index += 1;
      } else {
        mask(index, end);
        index = end;
      }
    } else {
      index += 1;
    }
  }
  return result + text.slice(last);
}

/** Masks only inline code spans (same length as `text`). */
export function maskCodeSpans(text: string) {
  if (!text.includes("`")) return text;
  let result = "";
  let last = 0;
  let index = text.indexOf("`");
  while (index !== -1) {
    let run = 1;
    while (text[index + run] === "`") run += 1;
    const close = findBacktickRun(text, index + run, run);
    if (close === -1) {
      index = text.indexOf("`", index + run);
      continue;
    }
    result += text.slice(last, index) + " ".repeat(close + run - index);
    last = close + run;
    index = text.indexOf("`", last);
  }
  return result + text.slice(last);
}

function findBacktickRun(text: string, from: number, length: number) {
  let index = text.indexOf("`", from);
  while (index !== -1) {
    let run = 1;
    while (text[index + run] === "`") run += 1;
    if (run === length) return index;
    index = text.indexOf("`", index + run);
  }
  return -1;
}

function findMathEnd(text: string, start: number) {
  if (text[start + 1] === "$") {
    const close = text.indexOf("$$", start + 2);
    return close === -1 ? -1 : close + 2;
  }
  const next = text[start + 1];
  if (!next || /\s/.test(next)) return -1;
  let index = text.indexOf("$", start + 1);
  while (index !== -1) {
    const before = text[index - 1];
    const after = text[index + 1];
    if (before !== "\\" && !/\s/.test(before) && !(after && /[0-9]/.test(after))) return index + 1;
    index = text.indexOf("$", index + 1);
  }
  return -1;
}

export function isAsciiPunctuation(code: number) {
  return (code >= 33 && code <= 47) || (code >= 58 && code <= 64) || (code >= 91 && code <= 96) || (code >= 123 && code <= 126);
}

/**
 * Whether trailing spaces on `lines[index]` form a hard line break: the line
 * is paragraph text and the next line continues the same paragraph.
 */
export function continuesParagraph(lines: readonly ScannedLine[], index: number) {
  const line = lines[index];
  const next = lines[index + 1];
  if (!line || !next || line.kind !== "text" || line.role !== "paragraph") return false;
  return next.kind === "text" && next.role === "paragraph" && !next.item && next.quoteDepth === line.quoteDepth;
}

/** Whether a block on this line sits at document level (not in a list or blockquote). */
export function isTopLevel(line: ScannedLine) {
  return line.prefix === 0 && !line.listContext && line.indent <= 3;
}

function frontMatterEnd(lines: { text: string }[]) {
  const first = lines[0]?.text.trimEnd();
  if (first !== "---" && first !== "+++") return -1;
  for (let index = 1; index < lines.length; index++) {
    const text = lines[index].text.trimEnd();
    if (text === first || (first === "---" && text === "...")) return index;
  }
  return -1;
}

export function scanMarkdown(markdown: string): MarkdownScan {
  const raw = splitLines(markdown);
  const lines: ScannedLine[] = [];
  const unclosedFences: ScannedLine[] = [];
  const frontMatter = frontMatterEnd(raw);

  type Mode = "normal" | "fence" | "math" | "comment" | "html" | "raw-html";
  type OpenFence = { char: string; length: number; indent: number; quoteDepth: number; line: ScannedLine };
  let mode = "normal" as Mode;
  let fence = null as OpenFence | null;
  let rawHtmlEnd: RegExp | null = null;
  let prevParagraph = false;
  let prevBlank = true;
  let paragraphStart = -1;
  let previousQuoteDepth = 0;
  let stack: ListFrame[] = [];
  let listCounter = 0;
  let tableCounter = 0;
  let table: { id: number; columns: number; awaitingDelimiter: boolean } | null = null;

  const popLists = (indent: number) => {
    while (stack.length && indent < stack[stack.length - 1].contentColumn) stack.pop();
  };
  const endParagraph = () => {
    prevParagraph = false;
    paragraphStart = -1;
  };

  for (let index = 0; index < raw.length; index++) {
    const { text, from } = raw[index];
    if (index <= frontMatter) {
      lines.push({ index, number: index + 1, from, text, kind: "frontmatter", prefix: 0, quoteDepth: 0, content: text, indent: 0, listContext: false });
      continue;
    }

    const quote = mode === "normal" || mode === "fence" ? QUOTE.exec(text) : null;
    const prefix = quote ? quote[0].length : 0;
    const quoteDepth = quote ? quote[0].split(">").length - 1 : 0;
    const content = text.slice(prefix);
    const line: ScannedLine = {
      index,
      number: index + 1,
      from,
      text,
      kind: "text",
      prefix,
      quoteDepth,
      content,
      indent: indentWidth(content),
      listContext: false,
    };
    lines.push(line);
    classify(line);
    line.listContext = stack.length > 0;
  }

  if (mode === "fence" && fence) unclosedFences.push(fence.line);
  return { lines, unclosedFences };

  function classify(line: ScannedLine) {
    const { content, quoteDepth, indent } = line;

    if (mode === "fence" && fence) {
      if (quoteDepth < fence.quoteDepth) {
        mode = "normal";
        fence = null;
      } else {
        const close = /^[ \t]*(`{3,}|~{3,})[ \t]*$/.exec(content);
        if (close && close[1][0] === fence.char && close[1].length >= fence.length && indent <= fence.indent + 3) {
          line.kind = "fence-close";
          mode = "normal";
          fence = null;
          prevBlank = false;
          endParagraph();
        } else {
          line.kind = "code";
        }
        return;
      }
    }
    if (mode === "math") {
      line.kind = "math";
      if (/\$\$[ \t]*$/.test(content)) mode = "normal";
      return;
    }
    if (mode === "comment") {
      line.kind = "comment";
      if (content.includes("-->")) mode = "normal";
      return;
    }
    if (mode === "raw-html") {
      line.kind = "html";
      if (rawHtmlEnd?.test(content)) mode = "normal";
      return;
    }
    if (mode === "html") {
      if (content.trim()) {
        line.kind = "html";
        return;
      }
      mode = "normal";
    }

    if (quoteDepth !== previousQuoteDepth) {
      stack = [];
      table = null;
      previousQuoteDepth = quoteDepth;
    }

    if (!content.trim()) {
      line.kind = "blank";
      prevBlank = true;
      table = null;
      endParagraph();
      return;
    }

    const top = stack[stack.length - 1];
    const blockIndentLimit = (top?.contentColumn ?? 0) + 3;

    if (table) {
      if (table.awaitingDelimiter) {
        table.awaitingDelimiter = false;
        line.role = "table";
        line.table = { tableId: table.id, row: "delimiter", columns: table.columns };
        prevBlank = false;
        return;
      }
      if (hasUnescapedPipe(content) && !FENCE_OPEN.test(content) && !ATX.test(content)) {
        line.role = "table";
        line.table = { tableId: table.id, row: "body", columns: table.columns };
        prevBlank = false;
        return;
      }
      table = null;
    }

    if (indent > blockIndentLimit && !prevParagraph) {
      line.kind = "code";
      prevBlank = false;
      return;
    }

    const fenceMatch = FENCE_OPEN.exec(content);
    if (fenceMatch && indent <= blockIndentLimit && (fenceMatch[2][0] !== "`" || !fenceMatch[3].includes("`"))) {
      popLists(indent);
      line.kind = "fence-open";
      mode = "fence";
      fence = { char: fenceMatch[2][0], length: fenceMatch[2].length, indent, quoteDepth, line };
      prevBlank = false;
      endParagraph();
      return;
    }

    if (MATH_OPEN.test(content) && indent <= blockIndentLimit && !prevParagraph) {
      popLists(indent);
      line.kind = "math";
      const rest = content.trim().slice(2);
      if (!/\$\$$/.test(rest.trim())) mode = "math";
      prevBlank = false;
      endParagraph();
      return;
    }

    if (COMMENT_OPEN.test(content)) {
      popLists(indent);
      line.kind = "comment";
      if (!content.slice(content.indexOf("<!--") + 4).includes("-->")) mode = "comment";
      prevBlank = false;
      endParagraph();
      return;
    }

    const rawTag = RAW_HTML.exec(content);
    if (rawTag) {
      popLists(indent);
      line.kind = "html";
      rawHtmlEnd = new RegExp(`</${rawTag[1]}>`, "i");
      if (!rawHtmlEnd.test(content)) mode = "raw-html";
      prevBlank = false;
      endParagraph();
      return;
    }

    if (HTML_BLOCK.test(content) || (!prevParagraph && HTML_TAG_LINE.test(content))) {
      popLists(indent);
      line.kind = "html";
      mode = "html";
      prevBlank = false;
      endParagraph();
      return;
    }

    line.kind = "text";

    const setext = SETEXT.exec(content);
    if (setext && prevParagraph && paragraphStart >= 0 && !lines[paragraphStart].item && lines[paragraphStart].quoteDepth === quoteDepth) {
      const first = lines[paragraphStart];
      const last = lines[line.index - 1];
      const rawText = lines
        .slice(paragraphStart, line.index)
        .map((entry) => entry.content.trim())
        .join(" ");
      const textFrom = first.from + first.prefix + leadingWhitespace(first.content).length;
      const textTo = last.from + last.prefix + last.content.trimEnd().length;
      first.role = "heading";
      first.heading = { level: setext[1][0] === "=" ? 1 : 2, style: "setext", noSpace: false, raw: rawText, textFrom, textTo, hashesEnd: textFrom };
      for (let lineIndex = paragraphStart + 1; lineIndex < line.index; lineIndex++) lines[lineIndex].role = "paragraph";
      line.role = "setext-underline";
      prevBlank = false;
      endParagraph();
      return;
    }

    if (HR.test(content)) {
      popLists(indent);
      line.role = "hr";
      prevBlank = false;
      endParagraph();
      return;
    }

    const atx = ATX.exec(content) ?? (prevParagraph ? null : ATX_NO_SPACE.exec(content));
    if (atx) {
      popLists(indent);
      const noSpace = !ATX.test(content);
      const hashesEndIndex = atx[1].length + atx[2].length;
      let body = content.slice(hashesEndIndex).replace(/[ \t]+$/, "");
      const closing = CLOSING_HASHES.exec(body);
      if (closing) body = body.slice(0, closing.index);
      const leading = leadingWhitespace(body).length;
      const absoluteBody = line.from + line.prefix + hashesEndIndex;
      line.role = "heading";
      line.heading = {
        level: atx[2].length,
        style: "atx",
        noSpace,
        raw: body.trim(),
        textFrom: absoluteBody + leading,
        textTo: absoluteBody + body.trimEnd().length,
        hashesEnd: absoluteBody,
      };
      prevBlank = false;
      endParagraph();
      return;
    }

    const item = matchListItem(content, indent);
    if (item) {
      line.role = "paragraph";
      line.item = item;
      paragraphStart = line.index;
      prevParagraph = !item.empty;
      prevBlank = false;
      return;
    }

    if (prevBlank) popLists(indent);

    if (hasUnescapedPipe(content)) {
      const next = peekContent(line.index + 1, quoteDepth);
      const delimiter = next === null ? null : parseDelimiterRow(next);
      const header = delimiter ? splitTableCells(content) : null;
      if (delimiter && header && header.length === delimiter.length) {
        tableCounter += 1;
        table = { id: tableCounter, columns: header.length, awaitingDelimiter: true };
        line.role = "table";
        line.table = { tableId: tableCounter, row: "header", columns: header.length };
        prevBlank = false;
        endParagraph();
        return;
      }
    }

    line.role = "paragraph";
    if (!prevParagraph) paragraphStart = line.index;
    prevParagraph = true;
    prevBlank = false;
    if (content.includes("<!--")) {
      const code = maskCodeSpans(content);
      if (code.lastIndexOf("<!--") > code.lastIndexOf("-->")) mode = "comment";
    }
  }

  function peekContent(index: number, quoteDepth: number) {
    const next = raw[index];
    if (!next) return null;
    const quote = QUOTE.exec(next.text);
    const depth = quote ? quote[0].split(">").length - 1 : 0;
    if (depth !== quoteDepth) return null;
    return next.text.slice(quote ? quote[0].length : 0);
  }

  function matchListItem(content: string, column: number): ListItemInfo | null {
    const bullet = BULLET.exec(content);
    const ordered = bullet ? null : ORDERED.exec(content);
    const match = bullet ?? ordered;
    if (!match) return null;
    const isOrdered = Boolean(ordered);
    const leading = match[1].length;
    const markerEnd = isOrdered ? leading + match[2].length + 1 : leading + 1;
    const spacingText = isOrdered ? match[4] : match[3];
    const empty = content.slice(markerEnd).trim() === "";
    const number = isOrdered ? Number.parseInt(match[2], 10) : 0;
    const spacingWidth = indentWidth(spacingText);
    const contentColumn = column + (markerEnd - leading) + (empty || spacingWidth > 4 ? 1 : spacingWidth);

    let frameIndex = stack.length - 1;
    while (frameIndex >= 0 && column < stack[frameIndex].column) frameIndex -= 1;
    const frame = frameIndex >= 0 ? stack[frameIndex] : undefined;
    const sibling = frame !== undefined && column < frame.contentColumn && frame.ordered === isOrdered;
    if (!sibling && prevParagraph && (empty || (isOrdered && number !== 1))) return null;

    stack.length = frameIndex + 1;
    let listId: number;
    if (sibling && frame) {
      frame.contentColumn = contentColumn;
      listId = frame.id;
    } else {
      if (frame && column < frame.contentColumn) stack.pop();
      listCounter += 1;
      listId = listCounter;
      stack.push({ id: listId, column, contentColumn, ordered: isOrdered });
    }

    return {
      listId,
      ordered: isOrdered,
      marker: isOrdered ? match[3] : match[2],
      number,
      markerStart: leading,
      markerEnd,
      spacing: spacingText.length,
      empty,
    };
  }
}
