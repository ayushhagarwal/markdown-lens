import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { WELCOME_DOCUMENT_MARKDOWN, WELCOME_DOCUMENT_TITLE } from "@/lib/welcome-document";
import { nextDocumentVersions } from "@/lib/document-versions";
import {
  createId,
  createDocumentRecord,
  type DocumentAsset,
  type DocumentRecord,
  type DocumentVersion,
} from "@/lib/workspace/types";
import {
  validateDocumentRecord,
  validateWorkspaceBackup,
} from "@/lib/workspace/backup-validation";

const DATABASE_NAME = "markdown-lens-workspace";
const DATABASE_VERSION = 3;
const LEGACY_DRAFT_KEY = "markdown-lens:draft";
const MIGRATION_KEY = "markdown-lens:workspace-migrated-v1";

export type QuarantinedWorkspaceRecord = {
  id: string;
  sourceStore: "documents" | "assets";
  sourceKey: string;
  reason: string;
  quarantinedAt: number;
  record: unknown;
};

interface MarkdownLensSchema extends DBSchema {
  documents: {
    key: string;
    value: DocumentRecord;
    indexes: { "by-updated": number };
  };
  assets: {
    key: string;
    value: DocumentAsset;
    indexes: { "by-document": string };
  };
  quarantine: {
    key: string;
    value: QuarantinedWorkspaceRecord;
    indexes: { "by-quarantined": number };
  };
  versions: {
    key: string;
    value: DocumentVersion;
    indexes: { "by-document": string };
  };
}

export type WorkspaceStorageStatus =
  | { mode: "persistent"; message: null }
  | { mode: "memory"; message: string };

const memoryDocuments = new Map<string, DocumentRecord>();
const memoryAssets = new Map<string, DocumentAsset>();
const memoryQuarantine = new Map<string, QuarantinedWorkspaceRecord>();
const memoryVersions = new Map<string, DocumentVersion>();
const storageListeners = new Set<(status: WorkspaceStorageStatus) => void>();
let storageStatus: WorkspaceStorageStatus = { mode: "persistent", message: null };
let databasePromise: Promise<IDBPDatabase<MarkdownLensSchema> | null> | null = null;

function database() {
  if (storageStatus.mode === "memory") return Promise.resolve(null);
  if (!databasePromise) {
    try {
      databasePromise = openDB<MarkdownLensSchema>(DATABASE_NAME, DATABASE_VERSION, {
        upgrade(db, oldVersion) {
          if (oldVersion < 1) {
            const documents = db.createObjectStore("documents", { keyPath: "id" });
            documents.createIndex("by-updated", "updatedAt");
            const assets = db.createObjectStore("assets", { keyPath: "id" });
            assets.createIndex("by-document", "documentId");
          }
          if (oldVersion < 2) {
            const quarantine = db.createObjectStore("quarantine", { keyPath: "id" });
            quarantine.createIndex("by-quarantined", "quarantinedAt");
          }
          if (oldVersion < 3) {
            const versions = db.createObjectStore("versions", { keyPath: "id" });
            versions.createIndex("by-document", "documentId");
          }
        },
      }).catch(async () => {
        await activateMemoryFallback(null);
        return null;
      });
    } catch {
      void activateMemoryFallback(null);
      databasePromise = Promise.resolve(null);
    }
  }
  return databasePromise;
}

export function getWorkspaceStorageStatus() {
  return storageStatus;
}

export function subscribeToWorkspaceStorage(
  listener: (status: WorkspaceStorageStatus) => void,
) {
  storageListeners.add(listener);
  listener(storageStatus);
  return () => {
    storageListeners.delete(listener);
  };
}

export async function closeWorkspaceDatabase() {
  const db = await databasePromise;
  db?.close();
  databasePromise = null;
}

let initializeQueue: Promise<unknown> = Promise.resolve();

export function initializeWorkspace() {
  const run = initializeQueue.then(() => initializeWorkspaceOnce());
  initializeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function initializeWorkspaceOnce() {
  const records = await listDocuments({ includeDeleted: true });
  const migrationComplete = readLocalStorage(MIGRATION_KEY) === "1";
  const legacyDraft = migrationComplete ? null : readLocalStorage(LEGACY_DRAFT_KEY);

  if (
    legacyDraft !== null &&
    !records.some((record) => record.markdown === legacyDraft && record.deletedAt === undefined)
  ) {
    await addDocument(
      createDocumentRecord({
        title: titleFromMarkdown(legacyDraft),
        markdown: legacyDraft,
      }),
    );
  } else if (records.length === 0) {
    await addDocument(
      createDocumentRecord({
        title: WELCOME_DOCUMENT_TITLE,
        markdown: WELCOME_DOCUMENT_MARKDOWN,
      }),
    );
  }

  writeLocalStorage(MIGRATION_KEY, "1");
  return storageStatus;
}

export async function listDocuments({ includeDeleted = false } = {}) {
  const records = await withStorage(
    (db) => readValidDocuments(db),
    () => readValidMemoryDocuments(),
  );
  return records
    .filter((record) => includeDeleted || record.deletedAt === undefined)
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function getDocument(id: string) {
  const records = await listDocuments({ includeDeleted: true });
  return records.find((record) => record.id === id);
}

export async function saveDocument(document: DocumentRecord) {
  const next = { ...document, updatedAt: Date.now() };
  await withStorage(
    async (db) => {
      await db.put("documents", next);
    },
    () => {
      memoryDocuments.set(next.id, next);
    },
  );
  return next;
}

export async function addDocument(document: DocumentRecord) {
  await withStorage(
    async (db) => {
      await db.put("documents", document);
    },
    () => {
      memoryDocuments.set(document.id, document);
    },
  );
  return document;
}

export async function addDocumentWithAssets(document: DocumentRecord, assets: DocumentAsset[]) {
  await withStorage(
    async (db) => {
      const transaction = db.transaction(["documents", "assets"], "readwrite");
      await transaction.objectStore("documents").put(document);
      for (const asset of assets) await transaction.objectStore("assets").put(asset);
      await transaction.done;
    },
    () => {
      memoryDocuments.set(document.id, document);
      for (const asset of assets) memoryAssets.set(asset.id, asset);
    },
  );
  return document;
}

export async function duplicateDocument(document: DocumentRecord) {
  const copy = createDocumentRecord({
    title: `${document.title} copy`,
    markdown: document.markdown,
    source: document.source,
    conversion: document.conversion,
  });
  const assets = await getDocumentAssets(document.id, document.assetIds);
  const copiedAssets = assets.map((asset) => ({
    ...asset,
    id: createId(),
    documentId: copy.id,
  }));
  copy.assetIds = copiedAssets.map((asset) => asset.id);
  await addDocument(copy);
  await putAssets(copiedAssets);
  return copy;
}

export async function moveDocumentToTrash(id: string) {
  const document = await getDocument(id);
  if (!document) return;
  await saveDocument({ ...document, deletedAt: Date.now() });
}

export async function restoreDocument(id: string) {
  const document = await getDocument(id);
  if (!document) return;
  const restored = { ...document };
  delete restored.deletedAt;
  await saveDocument(restored);
}

export async function permanentlyDeleteDocument(id: string) {
  await withStorage(
    async (db) => {
      const transaction = db.transaction(["documents", "assets", "versions"], "readwrite");
      const [assets, versions] = await Promise.all([
        transaction.objectStore("assets").index("by-document").getAllKeys(id),
        transaction.objectStore("versions").index("by-document").getAllKeys(id),
      ]);
      await Promise.all([
        transaction.objectStore("documents").delete(id),
        ...assets.map((assetId) => transaction.objectStore("assets").delete(assetId)),
        ...versions.map((versionId) => transaction.objectStore("versions").delete(versionId)),
        transaction.done,
      ]);
    },
    () => {
      memoryDocuments.delete(id);
      for (const [assetId, asset] of memoryAssets) {
        if (asset.documentId === id) memoryAssets.delete(assetId);
      }
      for (const [versionId, version] of memoryVersions) {
        if (version.documentId === id) memoryVersions.delete(versionId);
      }
    },
  );
}

export async function listDocumentVersions(documentId: string) {
  const records = await withStorage(
    (db) => db.getAllFromIndex("versions", "by-document", documentId),
    () => [...memoryVersions.values()].filter((version) => version.documentId === documentId),
  );
  return records.sort((left, right) => right.savedAt - left.savedAt);
}

export async function recordDocumentVersion(
  documentId: string,
  markdown: string,
  savedAt: number,
  options?: { force?: boolean },
) {
  const existing = await listDocumentVersions(documentId);
  const next = nextDocumentVersions(existing, {
    id: createId(),
    documentId,
    markdown,
    savedAt,
  }, savedAt, options);
  if (next === existing) return existing;
  await replaceDocumentVersions(documentId, next);
  return next;
}

export async function putAssets(assets: DocumentAsset[]) {
  if (assets.length === 0) return;
  await withStorage(
    async (db) => {
      const transaction = db.transaction("assets", "readwrite");
      await Promise.all([...assets.map((asset) => transaction.store.put(asset)), transaction.done]);
    },
    () => {
      for (const asset of assets) memoryAssets.set(asset.id, asset);
    },
  );
}

export async function getDocumentAssets(documentId: string, assetIds: readonly string[]) {
  const records = await withStorage(
    (db) => db.getAllFromIndex("assets", "by-document", documentId),
    () => [...memoryAssets.values()].filter((asset) => asset.documentId === documentId),
  );
  const allowedIds = new Set(assetIds);
  return records.filter(
    (asset) =>
      allowedIds.has(asset.id) &&
      asset.documentId === documentId &&
      isStoredDocumentAsset(asset),
  );
}

export async function listQuarantinedRecords() {
  return withStorage(
    (db) => db.getAllFromIndex("quarantine", "by-quarantined"),
    () => [...memoryQuarantine.values()],
  );
}

export async function exportWorkspace() {
  const [rawDocuments, rawAssets] = await withStorage(
    (db) => Promise.all([db.getAll("documents"), db.getAll("assets")]),
    () => [[...memoryDocuments.values()], [...memoryAssets.values()]],
  );
  const documents = rawDocuments.flatMap((document) => {
    try {
      return [validateDocumentRecord(document)];
    } catch {
      return [];
    }
  });
  const documentById = new Map(documents.map((document) => [document.id, document]));
  const assets = rawAssets.filter((asset) => {
    if (!isStoredDocumentAsset(asset)) return false;
    const owner = documentById.get(asset.documentId);
    return owner?.assetIds.includes(asset.id) ?? false;
  });
  const exportedAssetIds = new Set(assets.map((asset) => asset.id));
  return {
    format: "markdown-lens-workspace",
    version: 1,
    exportedAt: new Date().toISOString(),
    documents: documents.map((document) => ({
      ...document,
      assetIds: document.assetIds.filter((assetId) => exportedAssetIds.has(assetId)),
    })),
    assets: await Promise.all(
      assets.map(async ({ blob, ...asset }) => ({ ...asset, dataUrl: await blobToDataUrl(blob) })),
    ),
  };
}

export async function importWorkspace(value: unknown) {
  const { backup } = validateWorkspaceBackup(value);
  const assets = backup.assets.map(({ dataUrl, ...asset }) => ({
    ...asset,
    blob: dataUrlToBlob(dataUrl),
  }));

  const db = await database();
  if (!db) {
    importIntoMemory(backup.documents, assets);
    return;
  }

  try {
    const transaction = db.transaction(["documents", "assets"], "readwrite");
    const [documentKeys, assetKeys] = await Promise.all([
      transaction.objectStore("documents").getAllKeys(),
      transaction.objectStore("assets").getAllKeys(),
    ]);
    assertNoImportCollisions(
      backup.documents,
      assets,
      new Set([...documentKeys, ...assetKeys]),
    );
    try {
      for (const document of backup.documents) {
        await transaction.objectStore("documents").put(document);
      }
      for (const asset of assets) await transaction.objectStore("assets").put(asset);
      await transaction.done;
    } catch (error) {
      transaction.abort();
      throw error;
    }
  } catch (error) {
    if (error instanceof WorkspaceImportCollisionError) throw error;
    await activateMemoryFallback(db);
    importIntoMemory(backup.documents, assets);
  }
}

class WorkspaceImportCollisionError extends Error {
  constructor() {
    super(
      "This backup contains IDs that already exist in the workspace. No records were restored.",
    );
    this.name = "WorkspaceImportCollisionError";
  }
}

async function readValidDocuments(db: IDBPDatabase<MarkdownLensSchema>) {
  const transaction = db.transaction(["documents", "quarantine"], "readwrite");
  const documentStore = transaction.objectStore("documents");
  const quarantineStore = transaction.objectStore("quarantine");
  const [records, keys] = await Promise.all([
    documentStore.getAll() as Promise<unknown[]>,
    documentStore.getAllKeys(),
  ]);
  const validRecords: DocumentRecord[] = [];

  for (const [index, record] of records.entries()) {
    try {
      validRecords.push(validateDocumentRecord(record, "stored document"));
    } catch (error) {
      await quarantineStore.put(
        createQuarantinedRecord(
          "documents",
          String(keys[index]),
          record,
          error instanceof Error ? error.message : "Document schema validation failed.",
        ),
      );
      await documentStore.delete(keys[index]);
    }
  }
  await transaction.done;
  return validRecords;
}

function readValidMemoryDocuments() {
  const validRecords: DocumentRecord[] = [];
  for (const [key, record] of memoryDocuments) {
    try {
      validRecords.push(validateDocumentRecord(record, "stored document"));
    } catch (error) {
      const quarantined = createQuarantinedRecord(
        "documents",
        key,
        record,
        error instanceof Error ? error.message : "Document schema validation failed.",
      );
      memoryQuarantine.set(quarantined.id, quarantined);
      memoryDocuments.delete(key);
    }
  }
  return validRecords;
}

function createQuarantinedRecord(
  sourceStore: QuarantinedWorkspaceRecord["sourceStore"],
  sourceKey: string,
  record: unknown,
  reason: string,
): QuarantinedWorkspaceRecord {
  return {
    id: createId(),
    sourceStore,
    sourceKey,
    reason,
    quarantinedAt: Date.now(),
    record,
  };
}

function isStoredDocumentAsset(value: unknown): value is DocumentAsset {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const asset = value as Record<string, unknown>;
  return (
    typeof asset.id === "string" &&
    asset.id.length > 0 &&
    typeof asset.documentId === "string" &&
    asset.documentId.length > 0 &&
    typeof asset.name === "string" &&
    typeof asset.mimeType === "string" &&
    asset.blob !== undefined &&
    asset.blob !== null &&
    (asset.altText === undefined || typeof asset.altText === "string") &&
    (asset.sourceLocation === undefined || typeof asset.sourceLocation === "string")
  );
}

function assertNoImportCollisions(
  documents: DocumentRecord[],
  assets: DocumentAsset[],
  existingIds: Set<string>,
) {
  if (
    documents.some((document) => existingIds.has(document.id)) ||
    assets.some((asset) => existingIds.has(asset.id))
  ) {
    throw new WorkspaceImportCollisionError();
  }
}

async function replaceDocumentVersions(documentId: string, versions: readonly DocumentVersion[]) {
  await withStorage(
    async (db) => {
      const transaction = db.transaction("versions", "readwrite");
      const keep = new Set(versions.map((version) => version.id));
      const keys = await transaction.store.index("by-document").getAllKeys(documentId);
      await Promise.all([
        ...keys.filter((key) => !keep.has(String(key))).map((key) => transaction.store.delete(key)),
        ...versions.map((version) => transaction.store.put(version)),
        transaction.done,
      ]);
    },
    () => {
      for (const [id, version] of memoryVersions) {
        if (version.documentId === documentId) memoryVersions.delete(id);
      }
      for (const version of versions) memoryVersions.set(version.id, version);
    },
  );
}

function isStoredDocumentVersion(value: unknown): value is DocumentVersion {
  if (!value || typeof value !== "object") return false;
  const version = value as Partial<DocumentVersion>;
  return typeof version.id === "string"
    && typeof version.documentId === "string"
    && typeof version.markdown === "string"
    && typeof version.savedAt === "number";
}

function importIntoMemory(documents: DocumentRecord[], assets: DocumentAsset[]) {
  assertNoImportCollisions(
    documents,
    assets,
    new Set([...memoryDocuments.keys(), ...memoryAssets.keys()]),
  );
  for (const document of documents) memoryDocuments.set(document.id, document);
  for (const asset of assets) memoryAssets.set(asset.id, asset);
}

async function withStorage<T>(
  persistent: (db: IDBPDatabase<MarkdownLensSchema>) => Promise<T>,
  memory: () => T | Promise<T>,
) {
  const db = await database();
  if (!db) return memory();
  try {
    return await persistent(db);
  } catch {
    await activateMemoryFallback(db);
    return memory();
  }
}

async function activateMemoryFallback(db: IDBPDatabase<MarkdownLensSchema> | null) {
  if (storageStatus.mode === "memory") return;
  if (db) {
    try {
      const [documents, assets] = await Promise.all([
        db.getAll("documents"),
        db.getAll("assets"),
      ]);
      for (const document of documents as unknown[]) {
        try {
          const validated = validateDocumentRecord(document, "stored document");
          memoryDocuments.set(validated.id, validated);
        } catch (error) {
          const quarantined = createQuarantinedRecord(
            "documents",
            getRecordId(document),
            document,
            error instanceof Error ? error.message : "Document schema validation failed.",
          );
          memoryQuarantine.set(quarantined.id, quarantined);
        }
      }
      const versions = await db.getAll("versions").catch(() => []);
      for (const version of versions) {
        if (isStoredDocumentVersion(version)) memoryVersions.set(version.id, version);
      }
      for (const asset of assets as unknown[]) {
        if (isStoredDocumentAsset(asset)) {
          memoryAssets.set(asset.id, asset);
        } else {
          const quarantined = createQuarantinedRecord(
            "assets",
            getRecordId(asset),
            asset,
            "Asset schema validation failed.",
          );
          memoryQuarantine.set(quarantined.id, quarantined);
        }
      }
    } catch {
      // Retain any records already copied into the in-memory workspace.
    }
    db.close();
  }
  databasePromise = Promise.resolve(null);
  storageStatus = {
    mode: "memory",
    message:
      "Persistent browser storage is unavailable. Changes will last only until this page is closed or reloaded. Export a workspace backup to keep a copy.",
  };
  for (const listener of storageListeners) listener(storageStatus);
}

function getRecordId(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return "unknown";
  const id = (value as Record<string, unknown>).id;
  return typeof id === "string" ? id : "unknown";
}

function readLocalStorage(key: string) {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string) {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // IndexedDB remains authoritative when preference storage is unavailable.
  }
}

async function blobToDataUrl(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  }
  return `data:${blob.type || "application/octet-stream"};base64,${btoa(binary)}`;
}

function dataUrlToBlob(value: string) {
  const [header, body] = value.split(",", 2);
  const mimeType = header.match(/^data:([^;]+)/)?.[1] ?? "application/octet-stream";
  const bytes = Uint8Array.from(atob(body), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

function titleFromMarkdown(markdown: string) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || "Imported draft";
}
