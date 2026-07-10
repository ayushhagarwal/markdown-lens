export type DocumentSource = {
  name: string;
  mimeType: string;
  size: number;
  lastModified?: number;
  detectedFormat?: string;
};

export type DocumentAsset = {
  id: string;
  documentId: string;
  name: string;
  mimeType: string;
  blob: Blob;
  altText?: string;
  sourceLocation?: string;
};

export type ConversionReport = {
  converterId: string;
  startedAt: number;
  completedAt: number;
  warnings: string[];
  omitted: string[];
  statistics: Record<string, number | string | boolean>;
  usedOcr: boolean;
};

export type DocumentRecord = {
  id: string;
  title: string;
  markdown: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  source?: DocumentSource;
  conversion?: ConversionReport;
  assetIds: string[];
  schemaVersion: 1;
};

export type WorkspaceBackup = {
  format: "markdown-lens-workspace";
  version: 1;
  exportedAt: string;
  documents: DocumentRecord[];
  assets: Array<Omit<DocumentAsset, "blob"> & { dataUrl: string }>;
};

export function createDocumentRecord(
  input: Partial<Pick<DocumentRecord, "title" | "markdown" | "source" | "conversion">> = {},
): DocumentRecord {
  const now = Date.now();
  return {
    id: createId(),
    title: input.title?.trim() || "Untitled document",
    markdown: input.markdown ?? "",
    createdAt: now,
    updatedAt: now,
    source: input.source,
    conversion: input.conversion,
    assetIds: [],
    schemaVersion: 1,
  };
}

export function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
