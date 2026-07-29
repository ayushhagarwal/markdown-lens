import type { DocumentAsset, DocumentSource } from "@/lib/workspace/types";

export type ConverterProgress = {
  stage: string;
  current?: number;
  total?: number;
  message: string;
};

export type ConversionOptions = {
  ocr?: boolean;
  includeHiddenSheets?: boolean;
  tableMode?: "gfm" | "html-fallback";
};

export type ConversionContext = {
  signal: AbortSignal;
  onProgress: (progress: ConverterProgress) => void;
  limits: ConversionLimits;
};

export type ConversionLimits = {
  maxFileBytes: number;
  maxArchiveEntries: number;
  maxArchiveEntryBytes: number;
  maxExpandedBytes: number;
  maxCompressionRatio: number;
  maxGeneratedMarkdownChars: number;
  maxGeneratedHtmlChars: number;
  maxTableRows: number;
  maxTableColumns: number;
  maxTableCells: number;
  maxAssets: number;
  maxAssetBytes: number;
  maxTotalAssetBytes: number;
  maxImageDimension: number;
  maxImagePixels: number;
  maxPdfPages: number;
  maxPdfItemsPerPage: number;
  maxPdfTextItems: number;
  maxPdfAnnotations: number;
  maxPdfExtractedCharacters: number;
};

export type ConversionResult = {
  converterId: string;
  detectedFormat: string;
  title: string;
  markdown: string;
  warnings: string[];
  omitted: string[];
  statistics: Record<string, number | string | boolean>;
  usedOcr: boolean;
  source: DocumentSource;
  assets: Array<Omit<DocumentAsset, "id" | "documentId">>;
  children?: ConversionResult[];
};

export type LocalConverter = {
  id: string;
  label: string;
  extensions: readonly string[];
  mimeTypes: readonly string[];
  canConvert(file: File, hints?: { extension?: string; mimeType?: string }): boolean;
  convert(
    file: File,
    options: ConversionOptions,
    context: ConversionContext,
  ): Promise<ConversionResult>;
};

export const DEFAULT_CONVERSION_LIMITS: ConversionLimits = {
  maxFileBytes: 100 * 1024 * 1024,
  maxArchiveEntries: 100,
  maxArchiveEntryBytes: 32 * 1024 * 1024,
  maxExpandedBytes: 128 * 1024 * 1024,
  maxCompressionRatio: 200,
  maxGeneratedMarkdownChars: 2 * 1024 * 1024,
  maxGeneratedHtmlChars: 4 * 1024 * 1024,
  maxTableRows: 10_000,
  maxTableColumns: 16_384,
  maxTableCells: 250_000,
  maxAssets: 200,
  maxAssetBytes: 16 * 1024 * 1024,
  maxTotalAssetBytes: 64 * 1024 * 1024,
  maxImageDimension: 16_384,
  maxImagePixels: 40_000_000,
  maxPdfPages: 500,
  maxPdfItemsPerPage: 5_000,
  maxPdfTextItems: 250_000,
  maxPdfAnnotations: 10_000,
  maxPdfExtractedCharacters: 5_000_000,
};
