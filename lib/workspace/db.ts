import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  createDocumentRecord,
  type DocumentAsset,
  type DocumentRecord,
  type WorkspaceBackup,
} from "@/lib/workspace/types";

const DATABASE_NAME = "markdown-lens-workspace";
const DATABASE_VERSION = 1;
const LEGACY_DRAFT_KEY = "markdown-lens:draft";
const MIGRATION_KEY = "markdown-lens:workspace-migrated-v1";

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
}

export type WorkspaceStorageStatus =
  | { mode: "persistent"; message: null }
  | { mode: "memory"; message: string };

const memoryDocuments = new Map<string, DocumentRecord>();
const memoryAssets = new Map<string, DocumentAsset>();
const storageListeners = new Set<(status: WorkspaceStorageStatus) => void>();
let storageStatus: WorkspaceStorageStatus = { mode: "persistent", message: null };
let databasePromise: Promise<IDBPDatabase<MarkdownLensSchema> | null> | null = null;

function database() {
  if (storageStatus.mode === "memory") return Promise.resolve(null);
  if (!databasePromise) {
    try {
      databasePromise = openDB<MarkdownLensSchema>(DATABASE_NAME, DATABASE_VERSION, {
        upgrade(db) {
          const documents = db.createObjectStore("documents", { keyPath: "id" });
          documents.createIndex("by-updated", "updatedAt");
          const assets = db.createObjectStore("assets", { keyPath: "id" });
          assets.createIndex("by-document", "documentId");
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

export async function initializeWorkspace() {
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
        title: "Welcome to Markdown Lens",
        markdown: welcomeMarkdown,
      }),
    );
  }

  writeLocalStorage(MIGRATION_KEY, "1");
  return storageStatus;
}

export async function listDocuments({ includeDeleted = false } = {}) {
  const records = await withStorage(
    (db) => db.getAllFromIndex("documents", "by-updated"),
    () => [...memoryDocuments.values()],
  );
  return records
    .filter((record) => includeDeleted || record.deletedAt === undefined)
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function getDocument(id: string) {
  return withStorage(
    (db) => db.get("documents", id),
    () => memoryDocuments.get(id),
  );
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

export async function duplicateDocument(document: DocumentRecord) {
  const copy = createDocumentRecord({
    title: `${document.title} copy`,
    markdown: document.markdown,
    source: document.source,
    conversion: document.conversion,
  });
  await addDocument(copy);
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
      const transaction = db.transaction(["documents", "assets"], "readwrite");
      const assets = await transaction.objectStore("assets").index("by-document").getAllKeys(id);
      await Promise.all([
        transaction.objectStore("documents").delete(id),
        ...assets.map((assetId) => transaction.objectStore("assets").delete(assetId)),
        transaction.done,
      ]);
    },
    () => {
      memoryDocuments.delete(id);
      for (const [assetId, asset] of memoryAssets) {
        if (asset.documentId === id) memoryAssets.delete(assetId);
      }
    },
  );
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

export async function getDocumentAssets(documentId: string) {
  return withStorage(
    (db) => db.getAllFromIndex("assets", "by-document", documentId),
    () => [...memoryAssets.values()].filter((asset) => asset.documentId === documentId),
  );
}

export async function exportWorkspace(): Promise<WorkspaceBackup> {
  const [documents, assets] = await withStorage(
    (db) => Promise.all([db.getAll("documents"), db.getAll("assets")]),
    () => [[...memoryDocuments.values()], [...memoryAssets.values()]],
  );
  return {
    format: "markdown-lens-workspace",
    version: 1,
    exportedAt: new Date().toISOString(),
    documents,
    assets: await Promise.all(
      assets.map(async ({ blob, ...asset }) => ({ ...asset, dataUrl: await blobToDataUrl(blob) })),
    ),
  };
}

export async function importWorkspace(backup: WorkspaceBackup) {
  if (backup.format !== "markdown-lens-workspace" || backup.version !== 1) {
    throw new Error("This is not a supported Markdown Lens workspace backup.");
  }
  const assets = backup.assets.map(({ dataUrl, ...asset }) => ({
    ...asset,
    blob: dataUrlToBlob(dataUrl),
  }));
  await withStorage(
    async (db) => {
      const transaction = db.transaction(["documents", "assets"], "readwrite");
      for (const document of backup.documents) {
        await transaction.objectStore("documents").put(document);
      }
      for (const asset of assets) await transaction.objectStore("assets").put(asset);
      await transaction.done;
    },
    () => {
      for (const document of backup.documents) memoryDocuments.set(document.id, document);
      for (const asset of assets) memoryAssets.set(asset.id, asset);
    },
  );
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
      for (const document of documents) memoryDocuments.set(document.id, document);
      for (const asset of assets) memoryAssets.set(asset.id, asset);
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

const welcomeMarkdown = `# Welcome to Markdown Lens

Your private, local-first Markdown workbench.

## Start here

- Create or import documents from the **Documents** rail.
- Edit Markdown and review the rendered preview side by side.
- Use the **Outline** to navigate long documents.
- Export Markdown, HTML, PDF, or a complete workspace backup.

> Documents stay in this browser unless you explicitly export or share them.
`;
