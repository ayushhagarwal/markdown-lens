import Papa from "papaparse";

export type TableAlignment = "left" | "center" | "right" | null;

export type TableModel = {
  headers: string[];
  alignments: TableAlignment[];
  rows: string[][];
};

export type TableRange = { from: number; to: number; table: TableModel };

export type SortDirection = "asc" | "desc";

const DELIMITER_CELL = /^:?-+:?$/;
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const BLOCK_START = /^ {0,3}(?:#{1,6}(?:\s|$)|>|`{3,}|~{3,})/;
const THEMATIC_BREAK = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;

/* ------------------------------------------------------------------------ */
/* Construction                                                             */
/* ------------------------------------------------------------------------ */

/** A fresh table with numbered headers and empty body rows. */
export function createTable(columns = 3, bodyRows = 2): TableModel {
  const count = Math.max(1, columns);
  return {
    headers: Array.from({ length: count }, (_, index) => `Column ${index + 1}`),
    alignments: Array.from({ length: count }, () => null),
    rows: Array.from({ length: Math.max(0, bodyRows) }, () => Array.from({ length: count }, () => "")),
  };
}

/** Pads headers, alignments and rows to one column count (at least one). Extra row cells are dropped. */
export function normalizeTable(table: TableModel): TableModel {
  const columns = Math.max(1, table.headers.length);
  const headers = padCells(table.headers, columns);
  const alignments = Array.from({ length: columns }, (_, index) => table.alignments[index] ?? null);
  const rows = table.rows.map((row) => padCells(row, columns));
  return { headers, alignments, rows };
}

function padCells(cells: readonly string[], columns: number) {
  return Array.from({ length: columns }, (_, index) => cells[index] ?? "");
}

export function columnCount(table: TableModel) {
  return Math.max(1, table.headers.length);
}

/* ------------------------------------------------------------------------ */
/* Parsing                                                                  */
/* ------------------------------------------------------------------------ */

/** Parses the GFM pipe table at the start of `text` (leading blank lines are skipped). */
export function parseMarkdownTable(text: string): TableModel | null {
  const lines = text.split(/\r?\n/);
  let start = 0;
  while (start < lines.length && !lines[start].trim()) start += 1;
  return parseTableLines(lines, start)?.table ?? null;
}

/** Splits one table row into unescaped cell strings. Pipes inside inline code never split cells. */
export function splitTableRow(line: string): string[] {
  let text = line.trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|") && !isEscaped(text, text.length - 1)) text = text.slice(0, -1);

  const cells: string[] = [];
  let current = "";
  let index = 0;
  while (index < text.length) {
    const character = text[index];
    if (character === "\\" && index + 1 < text.length) {
      current += text[index + 1] === "|" ? "|" : character + text[index + 1];
      index += 2;
      continue;
    }
    if (character === "`") {
      let run = 1;
      while (text[index + run] === "`") run += 1;
      const close = findClosingBackticks(text, index + run, run);
      if (close >= 0) {
        current += text.slice(index, close + run).replace(/\\\|/g, "|");
        index = close + run;
      } else {
        current += text.slice(index, index + run);
        index += run;
      }
      continue;
    }
    if (character === "|") {
      cells.push(current.trim());
      current = "";
      index += 1;
      continue;
    }
    current += character;
    index += 1;
  }
  cells.push(current.trim());
  return cells;
}

function findClosingBackticks(text: string, from: number, run: number) {
  let index = from;
  while (index < text.length) {
    if (text[index] !== "`") {
      index += 1;
      continue;
    }
    let length = 1;
    while (text[index + length] === "`") length += 1;
    if (length === run) return index;
    index += length;
  }
  return -1;
}

function isEscaped(text: string, index: number) {
  let backslashes = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) backslashes += 1;
  return backslashes % 2 === 1;
}

function parseAlignment(cell: string): TableAlignment {
  const left = cell.startsWith(":");
  const right = cell.endsWith(":") && cell.length > 1;
  if (left && right) return "center";
  if (left) return "left";
  if (right) return "right";
  return null;
}

function indentation(line: string) {
  return line.length - line.replace(/^[ \t]+/, "").length;
}

function delimiterAlignments(line: string): TableAlignment[] | null {
  if (!line.includes("|") || indentation(line) > 3) return null;
  const cells = splitTableRow(line);
  if (!cells.every((cell) => DELIMITER_CELL.test(cell))) return null;
  return cells.map(parseAlignment);
}

function endsTableBody(line: string) {
  return !line.trim() || BLOCK_START.test(line) || THEMATIC_BREAK.test(line);
}

/** Parses a table whose header is `lines[start]`; returns the index of its last line. */
function parseTableLines(lines: readonly string[], start: number): { table: TableModel; end: number } | null {
  const headerLine = lines[start];
  const delimiterLine = lines[start + 1];
  if (headerLine === undefined || delimiterLine === undefined) return null;
  if (!headerLine.trim() || indentation(headerLine) > 3 || endsTableBody(headerLine)) return null;
  const alignments = delimiterAlignments(delimiterLine);
  if (!alignments) return null;
  const headers = splitTableRow(headerLine);
  if (headers.length !== alignments.length) return null;

  const rows: string[][] = [];
  let end = start + 1;
  for (let index = start + 2; index < lines.length; index += 1) {
    const line = lines[index];
    if (endsTableBody(line)) break;
    rows.push(padCells(splitTableRow(line), headers.length));
    end = index;
  }
  return { table: { headers, alignments, rows }, end };
}

/**
 * Finds the pipe table containing `offset` (inclusive of both ends of the block).
 * Tables inside fenced code blocks are ignored.
 */
export function findTableAt(markdown: string, offset: number): TableRange | null {
  const lines = markdown.split("\n");
  const starts: number[] = [];
  let position = 0;
  for (const line of lines) {
    starts.push(position);
    position += line.length + 1;
  }
  const lineEnd = (index: number) => starts[index] + lines[index].replace(/\r$/, "").length;
  const contentLines = lines.map((line) => line.replace(/\r$/, ""));

  let fence: { character: string; length: number } | null = null;
  for (let index = 0; index < contentLines.length; index += 1) {
    const line = contentLines[index];
    if (fence) {
      const close = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      if (close && close[1][0] === fence.character && close[1].length >= fence.length) fence = null;
      continue;
    }
    const open = line.match(FENCE_OPEN);
    if (open && !(open[1][0] === "`" && open[2].includes("`"))) {
      fence = { character: open[1][0], length: open[1].length };
      continue;
    }
    const parsed = parseTableLines(contentLines, index);
    if (!parsed) continue;
    const from = starts[index];
    const to = lineEnd(parsed.end);
    if (offset >= from && offset <= to) return { from, to, table: parsed.table };
    if (offset < from) return null;
    index = parsed.end;
  }
  return null;
}

/* ------------------------------------------------------------------------ */
/* Pasted spreadsheet data                                                  */
/* ------------------------------------------------------------------------ */

/**
 * Parses TSV (Excel, Google Sheets, Numbers) or CSV text into rows of cells.
 * Tabs win when present; otherwise the delimiter is detected. Quoted cells may contain newlines.
 */
export function parseDelimitedCells(text: string, delimiter?: "\t" | ","): string[][] {
  const source = text.replace(/\r\n?/g, "\n").replace(/\n+$/, "");
  if (!source.trim()) return [];
  const result = Papa.parse<string[]>(source, {
    delimiter: delimiter ?? (source.includes("\t") ? "\t" : ""),
    delimitersToGuess: [",", ";", "\t"],
    skipEmptyLines: true,
  });
  const rows = result.data.filter((row) => Array.isArray(row));
  const width = Math.max(0, ...rows.map((row) => row.length));
  return rows.map((row) => padCells(row, width));
}

/** Turns pasted TSV/CSV into a table model; the first row becomes the header. */
export function parseDelimitedTable(text: string): TableModel | null {
  const cells = parseDelimitedCells(text);
  if (!cells.length) return null;
  const [headers, ...rows] = cells;
  return normalizeTable({ headers, alignments: [], rows });
}

/** Accepts a Markdown pipe table or spreadsheet text. */
export function parsePastedTable(text: string): TableModel | null {
  return parseMarkdownTable(text) ?? parseDelimitedTable(text);
}

/* ------------------------------------------------------------------------ */
/* Serialising                                                              */
/* ------------------------------------------------------------------------ */

let segmenter: Intl.Segmenter | null | undefined;

function graphemes(text: string): string[] {
  if (segmenter === undefined) {
    segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  }
  if (!segmenter) return Array.from(text);
  return Array.from(segmenter.segment(text), (part) => part.segment);
}

function isWideCodePoint(code: number) {
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
    (code >= 0x1f900 && code <= 0x1f9ff) ||
    (code >= 0x20000 && code <= 0x3fffd)
  );
}

/** Monospace display width: East Asian wide characters and emoji count as two columns. */
export function displayWidth(text: string) {
  let width = 0;
  for (const grapheme of graphemes(text)) {
    let graphemeWidth = 0;
    for (const character of grapheme) {
      if (/\p{M}|‍|[︀-️]/u.test(character)) continue;
      const code = character.codePointAt(0) ?? 0;
      const characterWidth = isWideCodePoint(code) || /\p{Emoji_Presentation}/u.test(character) ? 2 : 1;
      graphemeWidth = Math.max(graphemeWidth, characterWidth);
    }
    width += graphemeWidth;
  }
  return width;
}

/** Escapes a cell for a pipe table: pipes become `\|`, line breaks become `<br>`. */
export function escapeTableCell(value: string) {
  return value
    .replace(/\r\n|\r|\n/g, "<br>")
    .replace(/\\?\|/g, "\\|")
    .trim();
}

function padCell(text: string, width: number, alignment: TableAlignment) {
  const space = Math.max(0, width - displayWidth(text));
  if (alignment === "right") return " ".repeat(space) + text;
  if (alignment === "center") {
    const left = Math.floor(space / 2);
    return " ".repeat(left) + text + " ".repeat(space - left);
  }
  return text + " ".repeat(space);
}

function delimiterCell(width: number, alignment: TableAlignment) {
  if (alignment === "left") return `:${"-".repeat(width - 1)}`;
  if (alignment === "right") return `${"-".repeat(width - 1)}:`;
  if (alignment === "center") return `:${"-".repeat(width - 2)}:`;
  return "-".repeat(width);
}

/** Serialises a table with aligned columns (by display width). No trailing newline. */
export function serializeMarkdownTable(table: TableModel): string {
  const normalized = normalizeTable(table);
  const headers = normalized.headers.map(escapeTableCell);
  const rows = normalized.rows.map((row) => row.map(escapeTableCell));
  const widths = headers.map((header, column) =>
    Math.max(3, displayWidth(header), ...rows.map((row) => displayWidth(row[column]))),
  );
  const line = (cells: string[]) =>
    `| ${cells.map((cell, column) => padCell(cell, widths[column], normalized.alignments[column])).join(" | ")} |`;
  const delimiter = `| ${widths.map((width, column) => delimiterCell(width, normalized.alignments[column])).join(" | ")} |`;
  return [line(headers), delimiter, ...rows.map(line)].join("\n");
}

/* ------------------------------------------------------------------------ */
/* Immutable operations                                                     */
/* ------------------------------------------------------------------------ */

function clampIndex(index: number, max: number) {
  return Math.min(Math.max(0, index), max);
}

function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (from < 0 || from >= items.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(clampIndex(to, next.length), 0, item);
  return next;
}

/** Inserts an empty body row at `index` (0 = first body row). */
export function insertRow(table: TableModel, index: number, cells: readonly string[] = []): TableModel {
  const normalized = normalizeTable(table);
  const rows = [...normalized.rows];
  rows.splice(clampIndex(index, rows.length), 0, padCells(cells, columnCount(normalized)));
  return { ...normalized, rows };
}

export function deleteRow(table: TableModel, index: number): TableModel {
  if (index < 0 || index >= table.rows.length) return table;
  return { ...table, rows: table.rows.filter((_, rowIndex) => rowIndex !== index) };
}

export function moveRow(table: TableModel, from: number, to: number): TableModel {
  return { ...table, rows: moveItem(table.rows, from, to) };
}

/** Inserts an empty column at `index`; existing columns at or after it shift right. */
export function insertColumn(table: TableModel, index: number, header = ""): TableModel {
  const normalized = normalizeTable(table);
  const at = clampIndex(index, columnCount(normalized));
  const insert = <T,>(cells: readonly T[], value: T) => [...cells.slice(0, at), value, ...cells.slice(at)];
  return {
    headers: insert(normalized.headers, header),
    alignments: insert<TableAlignment>(normalized.alignments, null),
    rows: normalized.rows.map((row) => insert(row, "")),
  };
}

/** Deletes a column. The last remaining column is never deleted. */
export function deleteColumn(table: TableModel, index: number): TableModel {
  const normalized = normalizeTable(table);
  if (columnCount(normalized) <= 1 || index < 0 || index >= columnCount(normalized)) return normalized;
  const remove = <T,>(cells: readonly T[]) => cells.filter((_, column) => column !== index);
  return {
    headers: remove(normalized.headers),
    alignments: remove(normalized.alignments),
    rows: normalized.rows.map(remove),
  };
}

export function moveColumn(table: TableModel, from: number, to: number): TableModel {
  const normalized = normalizeTable(table);
  return {
    headers: moveItem(normalized.headers, from, to),
    alignments: moveItem(normalized.alignments, from, to),
    rows: normalized.rows.map((row) => moveItem(row, from, to)),
  };
}

export function setAlignment(table: TableModel, column: number, alignment: TableAlignment): TableModel {
  const normalized = normalizeTable(table);
  if (column < 0 || column >= columnCount(normalized)) return normalized;
  return { ...normalized, alignments: normalized.alignments.map((value, index) => (index === column ? alignment : value)) };
}

export function setHeader(table: TableModel, column: number, value: string): TableModel {
  if (column < 0 || column >= columnCount(table)) return table;
  const headers = padCells(table.headers, columnCount(table));
  headers[column] = value;
  return { ...table, headers };
}

/** Sets a body cell (`row` 0 = first body row). */
export function setCell(table: TableModel, row: number, column: number, value: string): TableModel {
  if (row < 0 || row >= table.rows.length || column < 0 || column >= columnCount(table)) return table;
  const rows = [...table.rows];
  const cells = padCells(rows[row], columnCount(table));
  cells[column] = value;
  rows[row] = cells;
  return { ...table, rows };
}

/** Reads a cell by grid row, where grid row 0 is the header and 1.. are body rows. */
export function getGridCell(table: TableModel, gridRow: number, column: number) {
  return (gridRow === 0 ? table.headers[column] : table.rows[gridRow - 1]?.[column]) ?? "";
}

/** Writes a cell by grid row (0 = header). */
export function setGridCell(table: TableModel, gridRow: number, column: number, value: string): TableModel {
  return gridRow === 0 ? setHeader(table, column, value) : setCell(table, gridRow - 1, column, value);
}

/**
 * Writes a block of cells starting at a grid position (row 0 = header),
 * adding rows and columns as needed.
 */
export function pasteCells(table: TableModel, start: { row: number; column: number }, block: readonly (readonly string[])[]): TableModel {
  if (!block.length) return table;
  const blockWidth = Math.max(...block.map((row) => row.length));
  let next = normalizeTable(table);
  while (columnCount(next) < start.column + blockWidth) next = insertColumn(next, columnCount(next));
  while (next.rows.length + 1 < start.row + block.length) next = insertRow(next, next.rows.length);
  block.forEach((cells, rowOffset) => {
    cells.forEach((value, columnOffset) => {
      next = setGridCell(next, start.row + rowOffset, start.column + columnOffset, value);
    });
  });
  return next;
}

const NUMERIC_CELL = /^[-+]?[$€£¥]?\s*(?:\d{1,3}(?:,\d{3})+|\d+)?(?:\.\d+)?%?$/;

function numericValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed || !/\d/.test(trimmed) || !NUMERIC_CELL.test(trimmed)) return null;
  const number = Number.parseFloat(trimmed.replace(/[$€£¥,%\s]/g, ""));
  return Number.isFinite(number) ? number : null;
}

/** Stable sort of body rows by one column. Numbers compare numerically; empty cells always sort last. */
export function sortByColumn(table: TableModel, column: number, direction: SortDirection = "asc"): TableModel {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  const sign = direction === "asc" ? 1 : -1;
  const rows = table.rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const left = (a.row[column] ?? "").trim();
      const right = (b.row[column] ?? "").trim();
      if (!left || !right) return left === right ? a.index - b.index : left ? -1 : 1;
      const leftNumber = numericValue(left);
      const rightNumber = numericValue(right);
      const compared =
        leftNumber !== null && rightNumber !== null ? leftNumber - rightNumber : collator.compare(left, right);
      return compared === 0 ? a.index - b.index : compared * sign;
    })
    .map(({ row }) => row);
  return { ...table, rows };
}
