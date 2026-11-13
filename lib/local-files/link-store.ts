import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { LocalFileStat } from "@/lib/local-files/files";

const DATABASE_NAME = "markdown-lens-local-files";
const DATABASE_VERSION = 1;
const LAST_FOLDER_KEY = "last";

/** Connects a workspace document to a file on disk. */
export type LocalFileLink = {
  documentId: string;
  handle: FileSystemFileHandle;
  name: string;
  /** The file's `lastModified` when the document and the disk last agreed. */
  lastModified: number;
  /** The file's size in bytes at that moment. */
  size: number;
  /** Fingerprint of the text that was read from or written to disk. */
  fingerprint?: string;
  /** Path inside the opened folder, when the file was opened from the folder tree. */
  folderPath?: string;
  linkedAt: number;
  syncedAt: number;
};

/** Disk metadata after a read or write, plus the text involved when known. */
export type LocalFileSync = LocalFileStat & {
  text?: string;
};

export type RememberedFolder = {
  handle: FileSystemDirectoryHandle;
  name: string;
  rememberedAt: number;
};

interface LocalFilesSchema extends DBSchema {
  links: {
    key: string;
    value: LocalFileLink;
  };
  folders: {
    key: string;
    value: RememberedFolder;
  };
}

// Used when IndexedDB is unavailable: links then last until the page is closed.
const memoryLinks = new Map<string, LocalFileLink>();
let memoryFolder: RememberedFolder | null = null;
let useMemory = false;
let databasePromise: Promise<IDBPDatabase<LocalFilesSchema> | null> | null = null;

function database() {
  if (useMemory) return Promise.resolve(null);
  if (!databasePromise) {
    try {
      databasePromise = openDB<LocalFilesSchema>(DATABASE_NAME, DATABASE_VERSION, {
        upgrade(db) {
          db.createObjectStore("links", { keyPath: "documentId" });
          db.createObjectStore("folders");
        },
      }).catch(() => {
        useMemory = true;
        return null;
      });
    } catch {
      useMemory = true;
      databasePromise = Promise.resolve(null);
    }
  }
  return databasePromise;
}

async function withStore<T>(
  persistent: (db: IDBPDatabase<LocalFilesSchema>) => Promise<T>,
  memory: () => T,
): Promise<T> {
  const db = await database();
  if (!db) return memory();
  try {
    return await persistent(db);
  } catch {
    // For example a handle that cannot be cloned; keep working for this session.
    return memory();
  }
}

/** Closes the connection and clears in-memory state. Used by tests. */
export async function closeLocalFilesDatabase() {
  const db = await databasePromise;
  db?.close();
  databasePromise = null;
  useMemory = false;
  memoryLinks.clear();
  memoryFolder = null;
}

/**
 * Cheap, synchronous content fingerprint (FNV-1a plus length). It only answers
 * "does the editor still match what is on disk"; it is not a security hash.
 */
export function textFingerprint(text: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${text.length.toString(36)}-${(hash >>> 0).toString(36)}`;
}

/** True when `text` differs from what was last read from or written to disk. */
export function hasUnsavedDiskChanges(link: LocalFileLink, text: string) {
  return link.fingerprint === undefined || link.fingerprint !== textFingerprint(text);
}

function syncFields(sync: LocalFileSync, now: number) {
  return {
    lastModified: sync.lastModified,
    size: sync.size,
    syncedAt: now,
    ...(sync.text === undefined ? {} : { fingerprint: textFingerprint(sync.text) }),
  };
}

async function putLink(link: LocalFileLink) {
  await withStore(
    async (db) => {
      await db.put("links", link);
      memoryLinks.delete(link.documentId);
    },
    () => {
      memoryLinks.set(link.documentId, link);
    },
  );
  return link;
}

/** Links a document to a file, replacing any previous link for that document. */
export async function linkDocument(
  documentId: string,
  handle: FileSystemFileHandle,
  sync: LocalFileSync,
  options: { folderPath?: string } = {},
): Promise<LocalFileLink> {
  const now = Date.now();
  const link: LocalFileLink = {
    documentId,
    handle,
    name: handle.name,
    ...syncFields(sync, now),
    ...(options.folderPath === undefined ? {} : { folderPath: options.folderPath }),
    linkedAt: now,
  };
  return putLink(link);
}

export async function unlinkDocument(documentId: string) {
  memoryLinks.delete(documentId);
  await withStore(
    (db) => db.delete("links", documentId),
    () => undefined,
  );
}

export async function getLink(documentId: string): Promise<LocalFileLink | null> {
  const stored = await withStore(
    (db) => db.get("links", documentId),
    () => undefined,
  );
  return stored ?? memoryLinks.get(documentId) ?? null;
}

export async function listLinks(): Promise<LocalFileLink[]> {
  const stored = await withStore(
    (db) => db.getAll("links"),
    () => [] as LocalFileLink[],
  );
  const byId = new Map(stored.map((link) => [link.documentId, link]));
  for (const link of memoryLinks.values()) byId.set(link.documentId, link);
  return [...byId.values()].sort((left, right) => right.syncedAt - left.syncedAt);
}

/**
 * Finds the link whose file is the same disk entry as `handle`, so reopening a
 * file reuses its document. Works without permission on the stored handle.
 */
export async function findLinkByHandle(handle: FileSystemFileHandle): Promise<LocalFileLink | null> {
  const links = await listLinks();
  for (const link of links) {
    if (link.name !== handle.name) continue;
    try {
      if (await handle.isSameEntry(link.handle)) return link;
    } catch {
      // A stale stored handle cannot match.
    }
  }
  return null;
}

/** Records the disk state after a save or a reload from disk. Returns `null` when unlinked. */
export async function updateLinkSync(documentId: string, sync: LocalFileSync): Promise<LocalFileLink | null> {
  const link = await getLink(documentId);
  if (!link) return null;
  return putLink({ ...link, ...syncFields(sync, Date.now()) });
}

/** Removes links whose document no longer exists. Returns the removed document ids. */
export async function pruneLinks(existingDocumentIds: Iterable<string>): Promise<string[]> {
  const keep = new Set(existingDocumentIds);
  const removed: string[] = [];
  for (const link of await listLinks()) {
    if (keep.has(link.documentId)) continue;
    await unlinkDocument(link.documentId);
    removed.push(link.documentId);
  }
  return removed;
}

/** Remembers the opened folder so it can be offered again after a reload. */
export async function rememberFolder(handle: FileSystemDirectoryHandle): Promise<RememberedFolder> {
  const folder: RememberedFolder = { handle, name: handle.name, rememberedAt: Date.now() };
  await withStore(
    async (db) => {
      await db.put("folders", folder, LAST_FOLDER_KEY);
      memoryFolder = null;
    },
    () => {
      memoryFolder = folder;
    },
  );
  return folder;
}

export async function getRememberedFolder(): Promise<RememberedFolder | null> {
  const stored = await withStore(
    (db) => db.get("folders", LAST_FOLDER_KEY),
    () => undefined,
  );
  return stored ?? memoryFolder;
}

export async function forgetFolder() {
  memoryFolder = null;
  await withStore(
    (db) => db.delete("folders", LAST_FOLDER_KEY),
    () => undefined,
  );
}
