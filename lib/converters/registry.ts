import { unzipSync } from "fflate";
import { ConverterError, throwIfAborted } from "@/lib/converters/error";
import { baseResult, extensionOf, titleFromFile } from "@/lib/converters/helpers";
import {
  DEFAULT_CONVERSION_LIMITS,
  type ConversionContext,
  type ConversionOptions,
  type ConversionResult,
  type ConverterProgress,
  type LocalConverter,
} from "@/lib/converters/types";

export const converterCapabilities = [
  { label: "Markdown", extensions: "MD, MARKDOWN, TXT" },
  { label: "Documents", extensions: "PDF, DOCX, HTML, EPUB" },
  { label: "Office", extensions: "PPTX, XLSX" },
  { label: "Structured data", extensions: "CSV, TSV, JSON, XML" },
  { label: "Images", extensions: "PNG, JPG, WEBP, BMP + local OCR" },
  { label: "Archives", extensions: "ZIP (safe, bounded import)" },
] as const;

let convertersPromise: Promise<LocalConverter[]> | null = null;

async function converters() {
  convertersPromise ??= Promise.all([
    import("@/lib/converters/text-converters"),
    import("@/lib/converters/document-converters"),
    import("@/lib/converters/office-converters"),
    import("@/lib/converters/image-converter"),
  ]).then(([text, documents, office, image]) => [
    ...text.textConverters,
    ...documents.documentConverters,
    ...office.officeConverters,
    image.imageConverter,
  ]);
  return convertersPromise;
}

export async function findConverter(file: File) {
  return (await converters()).find((converter) => converter.canConvert(file));
}

export async function convertLocalFile(
  file: File,
  options: ConversionOptions = {},
  input: { signal?: AbortSignal; onProgress?: (progress: ConverterProgress) => void } = {},
): Promise<ConversionResult> {
  const signal = input.signal ?? new AbortController().signal;
  const context: ConversionContext = {
    signal,
    onProgress: input.onProgress ?? (() => undefined),
    limits: DEFAULT_CONVERSION_LIMITS,
  };
  throwIfAborted(signal);
  if (extensionOf(file.name) === "zip" || file.type === "application/zip") {
    return convertArchive(file, options, context);
  }
  const converter = await findConverter(file);
  if (!converter) {
    throw new ConverterError(
      "unsupported",
      `“${file.name}” is not supported. Open the format guide to see local conversion options.`,
    );
  }
  const startedAt = performance.now();
  const result = await converter.convert(file, options, context);
  return {
    ...result,
    statistics: { ...result.statistics, durationMs: Math.round(performance.now() - startedAt) },
  };
}

async function convertArchive(file: File, options: ConversionOptions, context: ConversionContext) {
  if (file.size > context.limits.maxFileBytes) throw new ConverterError("too-large", "This ZIP exceeds the local file limit.");
  context.onProgress({ stage: "archive", message: `Inspecting “${file.name}” safely…` });
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new ConverterError("invalid", "This ZIP archive is invalid or encrypted.");
  }
  const paths = Object.keys(entries).filter((path) => !path.endsWith("/") && !path.startsWith("__MACOSX/"));
  if (paths.length > context.limits.maxArchiveEntries) {
    throw new ConverterError("archive-limit", `This ZIP has more than ${context.limits.maxArchiveEntries} entries.`);
  }
  const expandedBytes = paths.reduce((total, path) => total + entries[path].byteLength, 0);
  if (expandedBytes > context.limits.maxExpandedBytes) {
    throw new ConverterError("archive-limit", "This ZIP expands beyond the safe local processing limit.");
  }
  const children: ConversionResult[] = [];
  const warnings: string[] = [];
  for (let index = 0; index < paths.length; index += 1) {
    throwIfAborted(context.signal);
    const path = paths[index];
    if (extensionOf(path) === "zip") {
      warnings.push(`Nested archive skipped: ${path}`);
      continue;
    }
    context.onProgress({
      stage: "archive",
      current: index + 1,
      total: paths.length,
      message: `Converting archive entry ${index + 1} of ${paths.length}: ${path}`,
    });
    const nestedFile = new File([copyBytes(entries[path])], path, { type: guessMimeType(path) });
    const converter = await findConverter(nestedFile);
    if (!converter || converter.id === "legacy-office") {
      warnings.push(`Unsupported archive entry skipped: ${path}`);
      continue;
    }
    try {
      children.push(await converter.convert(nestedFile, options, context));
    } catch (error) {
      warnings.push(`${path}: ${error instanceof Error ? error.message : "conversion failed"}`);
    }
  }
  if (children.length === 0) throw new ConverterError("no-text", "This ZIP contains no supported readable documents.");
  const title = titleFromFile(file);
  return baseResult(file, {
    converterId: "archive",
    detectedFormat: "zip",
    title,
    markdown: `# ${title}\n\n${children.map((child) => child.markdown).join("\n\n---\n\n")}`,
    children,
    warnings,
    statistics: { entries: paths.length, converted: children.length, expandedBytes },
  });
}

function guessMimeType(path: string) {
  const extension = extensionOf(path);
  return extension === "md"
    ? "text/markdown"
    : extension === "html"
      ? "text/html"
      : extension === "json"
        ? "application/json"
        : extension === "csv"
          ? "text/csv"
          : "application/octet-stream";
}

function copyBytes(bytes: Uint8Array) {
  return bytes.slice().buffer;
}
