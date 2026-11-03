import { ConverterError, throwIfAborted } from "@/lib/converters/error";
import type { ConversionContext, ConversionResult } from "@/lib/converters/types";

export function extensionOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function titleFromFile(file: File) {
  return file.name.replace(/\.[^.]+$/, "").trim() || "Imported document";
}

const MARKDOWN_SPECIAL = /([\\`*_[\]{}()#!|<>~])/g;

export function escapeMarkdownText(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(MARKDOWN_SPECIAL, "\\$1");
}

/** Basename safe to embed in a Markdown link destination. */
export function safeAssetFileName(name: string, usedNames?: Set<string>) {
  const basename = String(name ?? "")
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment.length > 0)
    .pop() ?? "";
  const cleaned = basename.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  const safe = cleaned && !/^\.+$/.test(cleaned) ? cleaned : "asset";
  if (!usedNames) return safe;

  const key = safe.toLowerCase();
  if (!usedNames.has(key)) {
    usedNames.add(key);
    return safe;
  }
  const extensionIndex = safe.lastIndexOf(".");
  const stem = extensionIndex > 0 ? safe.slice(0, extensionIndex) : safe;
  const extension = extensionIndex > 0 ? safe.slice(extensionIndex) : "";
  let suffix = 2;
  let candidate = `${stem}-${suffix}${extension}`;
  while (usedNames.has(candidate.toLowerCase())) {
    suffix += 1;
    candidate = `${stem}-${suffix}${extension}`;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

export function markdownHeading(level: number, value: unknown, fallback = "Untitled") {
  const text = escapeMarkdownText(value) || fallback;
  return `${"#".repeat(Math.min(6, Math.max(1, level)))} ${text}`;
}

export function markdownListItem(value: unknown) {
  return `- ${escapeMarkdownText(value)}`;
}

export function fencedCodeBlock(language: string, content: string) {
  const longestBacktickRun = Math.max(
    0,
    ...[...content.matchAll(/`+/g)].map((match) => match[0].length),
  );
  const fence = "`".repeat(Math.max(3, longestBacktickRun + 1));
  return `${fence}${language}\n${content}\n${fence}`;
}

export function matchesFile(
  file: File,
  extensions: readonly string[],
  mimeTypes: readonly string[],
  hints?: { extension?: string; mimeType?: string },
) {
  const extension = hints?.extension ?? extensionOf(file.name);
  const mimeType = hints?.mimeType ?? file.type;
  return extensions.includes(extension) || (mimeType.length > 0 && mimeTypes.includes(mimeType));
}

export function assertFileAllowed(file: File, context: ConversionContext) {
  throwIfAborted(context.signal);
  if (file.size > context.limits.maxFileBytes) {
    throw new ConverterError(
      "too-large",
      `“${file.name}” is larger than the ${Math.round(context.limits.maxFileBytes / 1024 / 1024)} MB local conversion limit.`,
    );
  }
}

export function baseResult(
  file: File,
  input: Pick<ConversionResult, "converterId" | "detectedFormat" | "title" | "markdown"> &
    Partial<Omit<ConversionResult, "converterId" | "detectedFormat" | "title" | "markdown" | "source">>,
): ConversionResult {
  return {
    warnings: [],
    omitted: [],
    statistics: {},
    usedOcr: false,
    assets: [],
    ...input,
    source: {
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      lastModified: file.lastModified,
      detectedFormat: input.detectedFormat,
    },
  };
}

export function escapeTableCell(value: unknown) {
  return String(value ?? "")
    .replace(MARKDOWN_SPECIAL, "\\$1")
    .replace(/\r?\n/g, "<br>")
    .trim();
}

export function matrixToMarkdown(
  rows: unknown[][],
  limits: Pick<
    ConversionContext["limits"],
    "maxTableRows" | "maxTableColumns" | "maxTableCells" | "maxGeneratedMarkdownChars"
  >,
) {
  if (rows.length === 0) return "_No data rows found._";
  const width = Math.max(1, ...rows.map((row) => row.length));
  const sourceCells = rows.reduce((total, row) => total + row.length, 0);
  const rectangularCells = rows.length * width;
  if (
    rows.length > limits.maxTableRows ||
    width > limits.maxTableColumns ||
    sourceCells > limits.maxTableCells ||
    !Number.isSafeInteger(rectangularCells) ||
    rectangularCells > limits.maxTableCells
  ) {
    throw new ConverterError(
      "resource-limit",
      `This table exceeds the safe ${limits.maxTableRows.toLocaleString()} row, ${limits.maxTableColumns.toLocaleString()} column, or ${limits.maxTableCells.toLocaleString()} cell limit.`,
    );
  }

  const renderRow = (row: unknown[]) => {
    const cells: string[] = [];
    for (let index = 0; index < width; index += 1) {
      cells.push(index < row.length ? escapeTableCell(row[index]) : "");
    }
    return `| ${cells.join(" | ")} |`;
  };
  const [header = [], ...body] = rows;
  const divider = Array.from({ length: width }, () => "---");
  const markdown = [renderRow(header), renderRow(divider), ...body.map(renderRow)].join("\n");
  if (markdown.length > limits.maxGeneratedMarkdownChars) {
    throw new ConverterError(
      "resource-limit",
      "This table would generate more Markdown than can be opened safely.",
    );
  }
  return markdown;
}

export function assertNonEmpty(markdown: string, format: string) {
  if (markdown.trim().length === 0) {
    throw new ConverterError("no-text", `This ${format} file does not contain usable text.`, true);
  }
}

export function assertGeneratedMarkdown(
  markdown: string,
  context: ConversionContext,
  format: string,
) {
  if (markdown.length > context.limits.maxGeneratedMarkdownChars) {
    throw new ConverterError(
      "resource-limit",
      `This ${format} would generate more Markdown than can be opened safely.`,
    );
  }
}
