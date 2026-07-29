import "fake-indexeddb/auto";
import { Blob as NodeBlob } from "node:buffer";
import { deleteDB, openDB } from "idb";
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
  listQuarantinedRecords,
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
    await saveDocument({ ...savedFirst, assetIds: ["asset-1"] });
    expect(await getDocumentAssets(first.id, ["asset-1"])).toHaveLength(1);
    expect(await getDocumentAssets(first.id, [])).toEqual([]);

    const backup = await exportWorkspace();
    expect(backup.documents.some((document) => document.id === first.id)).toBe(true);
    expect(backup.assets[0].dataUrl).toMatch(/^data:text\/plain;base64,/);

    await permanentlyDeleteDocument(first.id);
    expect(await getDocument(first.id)).toBeUndefined();
    expect(await getDocumentAssets(first.id, ["asset-1"])).toEqual([]);
  });

  test("validates and restores versioned workspace backups", async () => {
    const imported = {
      ...createDocumentRecord({ title: "Imported backup", markdown: "restored" }),
      assetIds: ["asset-imported"],
    };
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
    expect(await getDocumentAssets(imported.id, imported.assetIds)).toHaveLength(1);

    await expect(
      importWorkspace({ ...backup, version: 2 } as unknown as WorkspaceBackup),
    ).rejects.toThrow("not a supported");
  });

  test("rejects malformed nested records before changing the workspace", async () => {
    const existing = createDocumentRecord({
      title: "Keep this document",
      markdown: "safe local content",
    });
    await addDocument(existing);
    const malformed = {
      ...createDocumentRecord({ title: "Malformed", markdown: "not imported" }),
      title: null,
      updatedAt: Number.NaN,
    };

    await expect(
      importWorkspace({
        format: "markdown-lens-workspace",
        version: 1,
        exportedAt: new Date().toISOString(),
        documents: [malformed],
        assets: [],
      }),
    ).rejects.toThrow("Invalid workspace backup");

    expect(await getDocument(existing.id)).toMatchObject({ markdown: "safe local content" });
    expect(await getDocument(malformed.id)).toBeUndefined();
  });

  test("rejects document and asset ID collisions without overwriting local records", async () => {
    const local = createDocumentRecord({ title: "Local original", markdown: "keep me" });
    await addDocument(local);
    const collidingDocument = { ...local, title: "Attacker replacement", markdown: "replace me" };

    await expect(
      importWorkspace({
        format: "markdown-lens-workspace",
        version: 1,
        exportedAt: new Date().toISOString(),
        documents: [collidingDocument],
        assets: [],
      }),
    ).rejects.toThrow("already exist");
    expect(await getDocument(local.id)).toMatchObject({
      title: "Local original",
      markdown: "keep me",
    });

    const incomingOwner = {
      ...createDocumentRecord({ title: "Incoming owner", markdown: "asset collision" }),
      assetIds: ["asset-imported"],
    };
    await expect(
      importWorkspace({
        format: "markdown-lens-workspace",
        version: 1,
        exportedAt: new Date().toISOString(),
        documents: [incomingOwner],
        assets: [
          {
            id: "asset-imported",
            documentId: incomingOwner.id,
            name: "replacement.txt",
            mimeType: "text/plain",
            dataUrl: "data:text/plain;base64,YmFk",
          },
        ],
      }),
    ).rejects.toThrow("already exist");
    expect(await getDocument(incomingOwner.id)).toBeUndefined();
  });

  test("rejects dangling, unlisted, and cross-workspace asset relationships", async () => {
    const externalDocument = createDocumentRecord({
      title: "Existing outside backup",
      markdown: "local",
    });
    await addDocument(externalDocument);
    const incoming = createDocumentRecord({ title: "Incoming", markdown: "restore" });
    const asset = {
      id: "relationship-asset",
      documentId: incoming.id,
      name: "note.txt",
      mimeType: "text/plain",
      dataUrl: "data:text/plain;base64,aGVsbG8=",
    };
    const invalidBackups = [
      {
        documents: [],
        assets: [{ ...asset, documentId: externalDocument.id }],
      },
      {
        documents: [{ ...incoming, assetIds: [asset.id] }],
        assets: [],
      },
      {
        documents: [incoming],
        assets: [asset],
      },
    ];

    for (const invalidBackup of invalidBackups) {
      await expect(
        importWorkspace({
          format: "markdown-lens-workspace",
          version: 1,
          exportedAt: new Date().toISOString(),
          ...invalidBackup,
        }),
      ).rejects.toThrow("Invalid workspace backup");
    }
    expect(await getDocument(incoming.id)).toBeUndefined();
    expect(await getDocument(externalDocument.id)).toMatchObject({ markdown: "local" });
  });

  test("quarantines a legacy malformed record while preserving valid documents", async () => {
    const valid = createDocumentRecord({ title: "Still readable", markdown: "valid" });
    await addDocument(valid);
    await closeWorkspaceDatabase();
    const rawDb = await openDB(DATABASE_NAME, 2);
    await rawDb.put("documents", {
      ...createDocumentRecord({ title: "Corrupt", markdown: "invalid" }),
      id: "corrupt-document",
      title: 42,
    });
    rawDb.close();

    const documents = await listDocuments({ includeDeleted: true });
    expect(documents.some((document) => document.id === valid.id)).toBe(true);
    expect(documents.some((document) => document.id === "corrupt-document")).toBe(false);
    expect(await getDocument("corrupt-document")).toBeUndefined();
    expect(await listQuarantinedRecords()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceStore: "documents",
          sourceKey: "corrupt-document",
          record: expect.objectContaining({ id: "corrupt-document", title: 42 }),
        }),
      ]),
    );
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
