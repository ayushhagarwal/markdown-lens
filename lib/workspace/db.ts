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

let databasePromise: Promise<IDBPDatabase<MarkdownLensSchema>> | null = null;

function database() {
  databasePromise ??= openDB<MarkdownLensSchema>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(db) {
      const documents = db.createObjectStore("documents", { keyPath: "id" });
      documents.createIndex("by-updated", "updatedAt");
      const assets = db.createObjectStore("assets", { keyPath: "id" });
      assets.createIndex("by-document", "documentId");
    },
  });
  return databasePromise;
}

export async function initializeWorkspace() {
  const db = await database();
  const existing = await db.count("documents");
  if (existing > 0) return;

  const legacyDraft = localStorage.getItem(LEGACY_DRAFT_KEY);
  const document = createDocumentRecord({
    title: legacyDraft ? titleFromMarkdown(legacyDraft) : "Welcome to Markdown Lens",
    markdown: legacyDraft ?? welcomeMarkdown,
  });
  await db.put("documents", document);
  localStorage.setItem(MIGRATION_KEY, "1");
}

export async function listDocuments({ includeDeleted = false } = {}) {
  const records = await (await database()).getAllFromIndex("documents", "by-updated");
  return records
    .filter((record) => includeDeleted || record.deletedAt === undefined)
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function getDocument(id: string) {
  return (await database()).get("documents", id);
}

export async function saveDocument(document: DocumentRecord) {
  const next = { ...document, updatedAt: Date.now() };
  await (await database()).put("documents", next);
  return next;
}

export async function addDocument(document: DocumentRecord) {
  await (await database()).put("documents", document);
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
  const db = await database();
  const transaction = db.transaction(["documents", "assets"], "readwrite");
  const assets = await transaction.objectStore("assets").index("by-document").getAllKeys(id);
  await Promise.all([
    transaction.objectStore("documents").delete(id),
    ...assets.map((assetId) => transaction.objectStore("assets").delete(assetId)),
    transaction.done,
  ]);
}

export async function putAssets(assets: DocumentAsset[]) {
  if (assets.length === 0) return;
  const transaction = (await database()).transaction("assets", "readwrite");
  await Promise.all([...assets.map((asset) => transaction.store.put(asset)), transaction.done]);
}

export async function getDocumentAssets(documentId: string) {
  return (await database()).getAllFromIndex("assets", "by-document", documentId);
}

export async function exportWorkspace(): Promise<WorkspaceBackup> {
  const db = await database();
  const [documents, assets] = await Promise.all([db.getAll("documents"), db.getAll("assets")]);
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
  const db = await database();
  const transaction = db.transaction(["documents", "assets"], "readwrite");
  for (const document of backup.documents) await transaction.objectStore("documents").put(document);
  for (const { dataUrl, ...asset } of backup.assets) {
    await transaction.objectStore("assets").put({ ...asset, blob: dataUrlToBlob(dataUrl) });
  }
  await transaction.done;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
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
