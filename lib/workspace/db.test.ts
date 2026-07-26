import "fake-indexeddb/auto";
import { Blob as NodeBlob } from "node:buffer";
import { deleteDB } from "idb";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import {
  addDocument,
  closeWorkspaceDatabase,
  duplicateDocument,
  exportWorkspace,
  getDocument,
  getDocumentAssets,
  getWorkspaceStorageStatus,
  importWorkspace,
  initializeWorkspace,
  listDocuments,
  moveDocumentToTrash,
  permanentlyDeleteDocument,
  putAssets,
  restoreDocument,
  saveDocument,
} from "@/lib/workspace/db";
import { createDocumentRecord, type WorkspaceBackup } from "@/lib/workspace/types";

const DATABASE_NAME = "markdown-lens-workspace";

describe.sequential("IndexedDB workspace", () => {
  beforeAll(async () => {
    await closeWorkspaceDatabase();
    await deleteDB(DATABASE_NAME);
    localStorage.clear();
  });

  afterAll(async () => {
    await closeWorkspaceDatabase();
    await deleteDB(DATABASE_NAME);
    localStorage.clear();
  });

  test("migrates the legacy draft once and survives a new database connection", async () => {
    localStorage.setItem("markdown-lens:draft", "# Migrated draft\n\nKept locally.");

    await initializeWorkspace();
    expect(getWorkspaceStorageStatus().mode).toBe("persistent");
    expect(localStorage.getItem("markdown-lens:workspace-migrated-v1")).toBe("1");

    let documents = await listDocuments();
    expect(documents).toHaveLength(1);
    expect(documents[0]).toMatchObject({
      title: "Migrated draft",
      markdown: "# Migrated draft\n\nKept locally.",
    });

    await closeWorkspaceDatabase();
    documents = await listDocuments();
    expect(documents).toHaveLength(1);
    expect(documents[0].markdown).toContain("Kept locally.");

    await initializeWorkspace();
    expect(await listDocuments()).toHaveLength(1);
  });

  test("persists independent documents, trash state, assets, and backups", async () => {
    const first = createDocumentRecord({ title: "First", markdown: "first body" });
    const second = createDocumentRecord({ title: "Second", markdown: "second body" });
    await addDocument(first);
    await addDocument(second);

    const savedFirst = await saveDocument({ ...first, markdown: "first body updated" });
    expect((await getDocument(first.id))?.markdown).toBe("first body updated");
    expect((await getDocument(second.id))?.markdown).toBe("second body");

    const copy = await duplicateDocument(savedFirst);
    expect(copy.id).not.toBe(first.id);
    expect(copy).toMatchObject({ title: "First copy", markdown: "first body updated" });

    await moveDocumentToTrash(second.id);
    expect((await listDocuments()).some((document) => document.id === second.id)).toBe(false);
    expect((await listDocuments({ includeDeleted: true })).find((document) => document.id === second.id)?.deletedAt).toBeTypeOf("number");

    await restoreDocument(second.id);
    expect((await getDocument(second.id))?.deletedAt).toBeUndefined();

    await putAssets([
      {
        id: "asset-1",
        documentId: first.id,
        name: "diagram.txt",
        mimeType: "text/plain",
        blob: new NodeBlob(["asset body"], { type: "text/plain" }) as unknown as Blob,
      },
    ]);
    expect(await getDocumentAssets(first.id)).toHaveLength(1);

    const backup = await exportWorkspace();
    expect(backup.documents.some((document) => document.id === first.id)).toBe(true);
    expect(backup.assets[0].dataUrl).toMatch(/^data:text\/plain;base64,/);

    await permanentlyDeleteDocument(first.id);
    expect(await getDocument(first.id)).toBeUndefined();
    expect(await getDocumentAssets(first.id)).toEqual([]);
  });

  test("validates and restores versioned workspace backups", async () => {
    const imported = createDocumentRecord({ title: "Imported backup", markdown: "restored" });
    const backup: WorkspaceBackup = {
      format: "markdown-lens-workspace",
      version: 1,
      exportedAt: new Date().toISOString(),
      documents: [imported],
      assets: [
        {
          id: "asset-imported",
          documentId: imported.id,
          name: "note.txt",
          mimeType: "text/plain",
          dataUrl: "data:text/plain;base64,aGVsbG8=",
        },
      ],
    };

    await importWorkspace(backup);
    expect(await getDocument(imported.id)).toMatchObject({ title: "Imported backup", markdown: "restored" });
    expect(await getDocumentAssets(imported.id)).toHaveLength(1);

    await expect(
      importWorkspace({ ...backup, version: 2 } as unknown as WorkspaceBackup),
    ).rejects.toThrow("not a supported");
  });
});

test("falls back to a usable in-memory workspace when IndexedDB is blocked", async () => {
  await closeWorkspaceDatabase();
  const originalIndexedDB = globalThis.indexedDB;
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: {
      open() {
        throw new DOMException("Blocked for this browser profile.", "SecurityError");
      },
    },
  });
  vi.resetModules();

  try {
    const fallback = await import("@/lib/workspace/db");
    const status = await fallback.initializeWorkspace();
    expect(status.mode).toBe("memory");
    expect(status.message).toContain("Export a workspace backup");

    const document = createDocumentRecord({ title: "Session draft", markdown: "still editable" });
    await fallback.addDocument(document);
    expect(await fallback.getDocument(document.id)).toMatchObject({ markdown: "still editable" });
    expect((await fallback.exportWorkspace()).documents.some((item) => item.id === document.id)).toBe(true);
  } finally {
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: originalIndexedDB,
    });
    vi.resetModules();
  }
});
