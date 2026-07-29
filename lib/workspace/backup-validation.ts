import type {
  ConversionReport,
  DocumentRecord,
  DocumentSource,
  WorkspaceBackup,
} from "@/lib/workspace/types";

export const MAX_WORKSPACE_BACKUP_FILE_BYTES = 64 * 1024 * 1024;
export const MAX_WORKSPACE_BACKUP_DOCUMENTS = 1_000;
export const MAX_WORKSPACE_BACKUP_ASSETS = 2_000;
export const MAX_WORKSPACE_BACKUP_ASSET_BYTES = 16 * 1024 * 1024;
export const MAX_WORKSPACE_BACKUP_TOTAL_ASSET_BYTES = 48 * 1024 * 1024;

const MAX_ID_LENGTH = 256;
const MAX_TITLE_LENGTH = 512;
const MAX_MARKDOWN_LENGTH = 8 * 1024 * 1024;
const MAX_TOTAL_MARKDOWN_LENGTH = 24 * 1024 * 1024;
const MAX_SHORT_TEXT_LENGTH = 1_024;
const MAX_REPORT_ITEMS = 1_000;
const MAX_STATISTICS = 256;

type UnknownRecord = Record<string, unknown>;

export type ValidatedWorkspaceBackup = {
  backup: WorkspaceBackup;
  decodedAssetBytes: number;
};

export async function parseWorkspaceBackupFile(file: Pick<File, "size" | "text">) {
  if (file.size > MAX_WORKSPACE_BACKUP_FILE_BYTES) {
    throw invalid("This workspace backup is too large to restore safely.");
  }
  try {
    return JSON.parse(await file.text()) as unknown;
  } catch {
    throw invalid("This workspace backup is not valid JSON.");
  }
}

export function validateWorkspaceBackup(value: unknown): ValidatedWorkspaceBackup {
  const backup = expectRecord(value, "backup");
  expectExactKeys(backup, ["format", "version", "exportedAt", "documents", "assets"], "backup");
  if (backup.format !== "markdown-lens-workspace" || backup.version !== 1) {
    throw invalid("This is not a supported Markdown Lens workspace backup.");
  }
  expectIsoDate(backup.exportedAt, "backup.exportedAt");

  const rawDocuments = expectArray(
    backup.documents,
    "backup.documents",
    MAX_WORKSPACE_BACKUP_DOCUMENTS,
  );
  const rawAssets = expectArray(backup.assets, "backup.assets", MAX_WORKSPACE_BACKUP_ASSETS);
  const documents = rawDocuments.map((document, index) =>
    validateDocumentRecord(document, `backup.documents[${index}]`),
  );

  let totalMarkdownLength = 0;
  for (const document of documents) {
    totalMarkdownLength += document.markdown.length;
    if (totalMarkdownLength > MAX_TOTAL_MARKDOWN_LENGTH) {
      throw invalid("Backup Markdown content exceeds the restore limit.");
    }
  }

  let decodedAssetBytes = 0;
  const assets = rawAssets.map((asset, index) => {
    const validated = validateBackupAsset(asset, `backup.assets[${index}]`);
    decodedAssetBytes += validated.decodedBytes;
    if (decodedAssetBytes > MAX_WORKSPACE_BACKUP_TOTAL_ASSET_BYTES) {
      throw invalid("Backup assets exceed the aggregate restore limit.");
    }
    return validated.asset;
  });

  validateBackupRelationships(documents, assets);

  return {
    backup: {
      format: "markdown-lens-workspace",
      version: 1,
      exportedAt: backup.exportedAt as string,
      documents,
      assets,
    },
    decodedAssetBytes,
  };
}

export function validateDocumentRecord(value: unknown, path = "document"): DocumentRecord {
  const document = expectRecord(value, path);
  expectExactKeys(
    document,
    [
      "id",
      "title",
      "markdown",
      "createdAt",
      "updatedAt",
      "deletedAt",
      "source",
      "conversion",
      "assetIds",
      "schemaVersion",
    ],
    path,
  );

  const id = expectString(document.id, `${path}.id`, 1, MAX_ID_LENGTH);
  const title = expectString(document.title, `${path}.title`, 0, MAX_TITLE_LENGTH);
  const markdown = expectString(
    document.markdown,
    `${path}.markdown`,
    0,
    MAX_MARKDOWN_LENGTH,
  );
  const createdAt = expectTimestamp(document.createdAt, `${path}.createdAt`);
  const updatedAt = expectTimestamp(document.updatedAt, `${path}.updatedAt`);
  const deletedAt =
    document.deletedAt === undefined
      ? undefined
      : expectTimestamp(document.deletedAt, `${path}.deletedAt`);
  if (document.schemaVersion !== 1) {
    throw invalid(`${path}.schemaVersion is not supported.`);
  }

  const rawAssetIds = expectArray(document.assetIds, `${path}.assetIds`, MAX_WORKSPACE_BACKUP_ASSETS);
  const assetIds = rawAssetIds.map((assetId, index) =>
    expectString(assetId, `${path}.assetIds[${index}]`, 1, MAX_ID_LENGTH),
  );
  if (new Set(assetIds).size !== assetIds.length) {
    throw invalid(`${path}.assetIds contains duplicate IDs.`);
  }

  const source =
    document.source === undefined
      ? undefined
      : validateDocumentSource(document.source, `${path}.source`);
  const conversion =
    document.conversion === undefined
      ? undefined
      : validateConversionReport(document.conversion, `${path}.conversion`);

  return {
    id,
    title,
    markdown,
    createdAt,
    updatedAt,
    ...(deletedAt === undefined ? {} : { deletedAt }),
    ...(source === undefined ? {} : { source }),
    ...(conversion === undefined ? {} : { conversion }),
    assetIds,
    schemaVersion: 1,
  };
}

function validateDocumentSource(value: unknown, path: string): DocumentSource {
  const source = expectRecord(value, path);
  expectExactKeys(
    source,
    ["name", "mimeType", "size", "lastModified", "detectedFormat"],
    path,
  );
  return {
    name: expectString(source.name, `${path}.name`, 0, MAX_SHORT_TEXT_LENGTH),
    mimeType: expectString(source.mimeType, `${path}.mimeType`, 0, MAX_SHORT_TEXT_LENGTH),
    size: expectNonNegativeInteger(source.size, `${path}.size`),
    ...(source.lastModified === undefined
      ? {}
      : { lastModified: expectTimestamp(source.lastModified, `${path}.lastModified`) }),
    ...(source.detectedFormat === undefined
      ? {}
      : {
          detectedFormat: expectString(
            source.detectedFormat,
            `${path}.detectedFormat`,
            0,
            MAX_SHORT_TEXT_LENGTH,
          ),
        }),
  };
}

function validateConversionReport(value: unknown, path: string): ConversionReport {
  const report = expectRecord(value, path);
  expectExactKeys(
    report,
    [
      "converterId",
      "startedAt",
      "completedAt",
      "warnings",
      "omitted",
      "statistics",
      "usedOcr",
    ],
    path,
  );
  const statistics = expectRecord(report.statistics, `${path}.statistics`);
  const statisticEntries = Object.entries(statistics);
  if (statisticEntries.length > MAX_STATISTICS) {
    throw invalid(`${path}.statistics has too many entries.`);
  }
  const validatedStatistics: ConversionReport["statistics"] = {};
  for (const [key, statistic] of statisticEntries) {
    if (key.length === 0 || key.length > MAX_SHORT_TEXT_LENGTH) {
      throw invalid(`${path}.statistics contains an invalid key.`);
    }
    if (
      typeof statistic !== "boolean" &&
      !(typeof statistic === "number" && Number.isFinite(statistic)) &&
      !(typeof statistic === "string" && statistic.length <= MAX_SHORT_TEXT_LENGTH)
    ) {
      throw invalid(`${path}.statistics.${key} has an invalid value.`);
    }
    validatedStatistics[key] = statistic;
  }

  return {
    converterId: expectString(
      report.converterId,
      `${path}.converterId`,
      1,
      MAX_SHORT_TEXT_LENGTH,
    ),
    startedAt: expectTimestamp(report.startedAt, `${path}.startedAt`),
    completedAt: expectTimestamp(report.completedAt, `${path}.completedAt`),
    warnings: validateStringArray(report.warnings, `${path}.warnings`, MAX_REPORT_ITEMS),
    omitted: validateStringArray(report.omitted, `${path}.omitted`, MAX_REPORT_ITEMS),
    statistics: validatedStatistics,
    usedOcr: expectBoolean(report.usedOcr, `${path}.usedOcr`),
  };
}

function validateBackupAsset(value: unknown, path: string) {
  const asset = expectRecord(value, path);
  expectExactKeys(
    asset,
    ["id", "documentId", "name", "mimeType", "altText", "sourceLocation", "dataUrl"],
    path,
  );
  const mimeType = expectString(asset.mimeType, `${path}.mimeType`, 1, MAX_SHORT_TEXT_LENGTH);
  const dataUrl = expectString(
    asset.dataUrl,
    `${path}.dataUrl`,
    1,
    Math.ceil((MAX_WORKSPACE_BACKUP_ASSET_BYTES * 4) / 3) + MAX_SHORT_TEXT_LENGTH,
  );
  const decodedBytes = validateDataUrl(dataUrl, mimeType, path);
  return {
    decodedBytes,
    asset: {
      id: expectString(asset.id, `${path}.id`, 1, MAX_ID_LENGTH),
      documentId: expectString(asset.documentId, `${path}.documentId`, 1, MAX_ID_LENGTH),
      name: expectString(asset.name, `${path}.name`, 1, MAX_SHORT_TEXT_LENGTH),
      mimeType,
      ...(asset.altText === undefined
        ? {}
        : {
            altText: expectString(
              asset.altText,
              `${path}.altText`,
              0,
              MAX_SHORT_TEXT_LENGTH,
            ),
          }),
      ...(asset.sourceLocation === undefined
        ? {}
        : {
            sourceLocation: expectString(
              asset.sourceLocation,
              `${path}.sourceLocation`,
              0,
              MAX_SHORT_TEXT_LENGTH,
            ),
          }),
      dataUrl,
    },
  };
}

function validateDataUrl(value: string, expectedMimeType: string, path: string) {
  const match = /^data:([^;,]{1,1024});base64,([A-Za-z0-9+/]*={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0 || match[1] !== expectedMimeType) {
    throw invalid(`${path}.dataUrl is not valid Base64 data for its MIME type.`);
  }
  const padding = match[2].endsWith("==") ? 2 : match[2].endsWith("=") ? 1 : 0;
  const decodedBytes = (match[2].length / 4) * 3 - padding;
  if (decodedBytes > MAX_WORKSPACE_BACKUP_ASSET_BYTES) {
    throw invalid(`${path}.dataUrl exceeds the per-asset restore limit.`);
  }
  return decodedBytes;
}

function validateBackupRelationships(
  documents: DocumentRecord[],
  assets: WorkspaceBackup["assets"],
) {
  const documentById = new Map<string, DocumentRecord>();
  const assetById = new Map<string, WorkspaceBackup["assets"][number]>();
  const allIds = new Set<string>();

  for (const document of documents) {
    if (documentById.has(document.id) || allIds.has(document.id)) {
      throw invalid("Backup contains duplicate record IDs.");
    }
    documentById.set(document.id, document);
    allIds.add(document.id);
  }
  for (const asset of assets) {
    if (assetById.has(asset.id) || allIds.has(asset.id)) {
      throw invalid("Backup contains duplicate record IDs.");
    }
    assetById.set(asset.id, asset);
    allIds.add(asset.id);
  }

  for (const document of documents) {
    for (const assetId of document.assetIds) {
      const asset = assetById.get(assetId);
      if (!asset || asset.documentId !== document.id) {
        throw invalid(`Document ${document.id} has an invalid asset reference.`);
      }
    }
  }
  for (const asset of assets) {
    const owner = documentById.get(asset.documentId);
    if (!owner || !owner.assetIds.includes(asset.id)) {
      throw invalid(`Asset ${asset.id} is not owned by its declared document.`);
    }
  }
}

function validateStringArray(value: unknown, path: string, maximum: number) {
  return expectArray(value, path, maximum).map((item, index) =>
    expectString(item, `${path}[${index}]`, 0, MAX_SHORT_TEXT_LENGTH),
  );
}

function expectRecord(value: unknown, path: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalid(`${path} must be an object.`);
  }
  return value as UnknownRecord;
}

function expectExactKeys(value: UnknownRecord, allowedKeys: string[], path: string) {
  const allowed = new Set(allowedKeys);
  const unknownKey = Object.keys(value).find((key) => !allowed.has(key));
  if (unknownKey) throw invalid(`${path}.${unknownKey} is not supported.`);
}

function expectArray(value: unknown, path: string, maximum: number): unknown[] {
  if (!Array.isArray(value) || value.length > maximum) {
    throw invalid(`${path} must contain at most ${maximum.toLocaleString()} items.`);
  }
  return value;
}

function expectString(
  value: unknown,
  path: string,
  minimumLength: number,
  maximumLength: number,
) {
  if (
    typeof value !== "string" ||
    value.length < minimumLength ||
    value.length > maximumLength
  ) {
    throw invalid(`${path} has an invalid string value.`);
  }
  return value;
}

function expectTimestamp(value: unknown, path: string) {
  const timestamp = expectNonNegativeInteger(value, path);
  if (timestamp > 8_640_000_000_000_000) {
    throw invalid(`${path} is outside the supported date range.`);
  }
  return timestamp;
}

function expectNonNegativeInteger(value: unknown, path: string) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw invalid(`${path} must be a non-negative integer.`);
  }
  return value;
}

function expectIsoDate(value: unknown, path: string) {
  const text = expectString(value, path, 1, 64);
  if (!Number.isFinite(Date.parse(text))) throw invalid(`${path} must be a valid date.`);
  return text;
}

function expectBoolean(value: unknown, path: string) {
  if (typeof value !== "boolean") throw invalid(`${path} must be a boolean.`);
  return value;
}

function invalid(message: string) {
  return new Error(`Invalid workspace backup: ${message}`);
}
