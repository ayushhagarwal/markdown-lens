import { ConverterError, throwIfAborted } from "@/lib/converters/error";
import type { ConversionContext, ConversionResult } from "@/lib/converters/types";

export function extensionOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function titleFromFile(file: File) {
  return file.name.replace(/\.[^.]+$/, "").trim() || "Imported document";
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
    .replace(/\r?\n/g, "<br>")
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
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
