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
  limits: {
    maxFileBytes: number;
    maxArchiveEntries: number;
    maxExpandedBytes: number;
  };
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

export const DEFAULT_CONVERSION_LIMITS = {
  maxFileBytes: 100 * 1024 * 1024,
  maxArchiveEntries: 100,
  maxExpandedBytes: 250 * 1024 * 1024,
};
