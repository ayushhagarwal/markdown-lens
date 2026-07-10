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

export function matrixToMarkdown(rows: unknown[][]) {
  if (rows.length === 0) return "_No data rows found._";
  const width = Math.max(1, ...rows.map((row) => row.length));
  const normalized = rows.map((row) => [
    ...row.map(escapeTableCell),
    ...Array.from({ length: width - row.length }, () => ""),
  ]);
  const [header, ...body] = normalized;
  const divider = Array.from({ length: width }, () => "---");
  return [header, divider, ...body].map((row) => `| ${row.join(" | ")} |`).join("\n");
}

export function assertNonEmpty(markdown: string, format: string) {
  if (markdown.trim().length === 0) {
    throw new ConverterError("no-text", `This ${format} file does not contain usable text.`, true);
  }
}
