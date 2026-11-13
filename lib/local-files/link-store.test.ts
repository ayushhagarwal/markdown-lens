import "fake-indexeddb/auto";
import { deleteDB } from "idb";
import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";
import {
  closeLocalFilesDatabase,
  findLinkByHandle,
  forgetFolder,
  getLink,
  getRememberedFolder,
  hasUnsavedDiskChanges,
  linkDocument,
  listLinks,
  pruneLinks,
  rememberFolder,
  textFingerprint,
  unlinkDocument,
  updateLinkSync,
} from "@/lib/local-files";
import { mockFileHandle, storableFileHandle } from "@/lib/local-files/test-helpers";

const DATABASE_NAME = "markdown-lens-local-files";

async function reset() {
  await closeLocalFilesDatabase();
  await deleteDB(DATABASE_NAME);
}

describe.sequential("local file link store", () => {
  beforeEach(reset);
  afterAll(async () => {
    vi.unstubAllGlobals();
    await reset();
  });

  test("links a document and reads it back after reconnecting", async () => {
    const handle = storableFileHandle("notes.md");
    const link = await linkDocument("doc-1", handle, { lastModified: 100, size: 7, text: "# Notes" }, { folderPath: "docs/notes.md" });
    expect(link).toMatchObject({ documentId: "doc-1", name: "notes.md", lastModified: 100, size: 7, folderPath: "docs/notes.md" });
    expect(link.fingerprint).toBe(textFingerprint("# Notes"));

    await closeLocalFilesDatabase();
    const stored = await getLink("doc-1");
    expect(stored).toMatchObject({ documentId: "doc-1", lastModified: 100, size: 7, handle: { name: "notes.md" } });
    await expect(getLink("missing")).resolves.toBeNull();
  });

  test("relinking replaces the previous link and unlinking removes it", async () => {
    await linkDocument("doc-1", storableFileHandle("a.md"), { lastModified: 1, size: 1 });
    await linkDocument("doc-1", storableFileHandle("b.md"), { lastModified: 2, size: 2 });
    expect((await listLinks()).map((link) => link.name)).toEqual(["b.md"]);

    await unlinkDocument("doc-1");
    await expect(getLink("doc-1")).resolves.toBeNull();
    await expect(listLinks()).resolves.toEqual([]);
  });

  test("finds the document already linked to the same disk entry", async () => {
    await linkDocument("doc-1", storableFileHandle("notes.md", "entry-1"), { lastModified: 1, size: 1 });
    await linkDocument("doc-2", storableFileHandle("notes.md", "entry-2"), { lastModified: 1, size: 1 });

    const reopened = mockFileHandle("notes.md", { text: "", lastModified: 1 }, { entryId: "entry-2" });
    await expect(findLinkByHandle(reopened.handle)).resolves.toMatchObject({ documentId: "doc-2" });

    const other = mockFileHandle("notes.md", { text: "", lastModified: 1 }, { entryId: "entry-3" });
    await expect(findLinkByHandle(other.handle)).resolves.toBeNull();
  });

  test("updates sync metadata and tracks unsaved disk changes", async () => {
    const link = await linkDocument("doc-1", storableFileHandle("a.md"), { lastModified: 1, size: 3, text: "old" });
    expect(hasUnsavedDiskChanges(link, "old")).toBe(false);
    expect(hasUnsavedDiskChanges(link, "new")).toBe(true);

    const updated = await updateLinkSync("doc-1", { lastModified: 9, size: 3, text: "new" });
    expect(updated).toMatchObject({ lastModified: 9, size: 3, linkedAt: link.linkedAt });
    expect(hasUnsavedDiskChanges(updated!, "new")).toBe(false);
    await expect(getLink("doc-1")).resolves.toMatchObject({ lastModified: 9 });

    // Metadata-only updates keep the previous fingerprint.
    const statOnly = await updateLinkSync("doc-1", { lastModified: 10, size: 3 });
    expect(statOnly?.fingerprint).toBe(textFingerprint("new"));
    await expect(updateLinkSync("missing", { lastModified: 1, size: 1 })).resolves.toBeNull();
  });

  test("a link without a fingerprint counts as unsaved", async () => {
    const link = await linkDocument("doc-1", storableFileHandle("a.md"), { lastModified: 1, size: 3 });
    expect(hasUnsavedDiskChanges(link, "anything")).toBe(true);
  });

  test("prunes links whose documents no longer exist", async () => {
    await linkDocument("doc-1", storableFileHandle("a.md"), { lastModified: 1, size: 1 });
    await linkDocument("doc-2", storableFileHandle("b.md"), { lastModified: 1, size: 1 });
    await expect(pruneLinks(["doc-2", "doc-3"])).resolves.toEqual(["doc-1"]);
    expect((await listLinks()).map((link) => link.documentId)).toEqual(["doc-2"]);
  });

  test("remembers and forgets the last opened folder", async () => {
    await expect(getRememberedFolder()).resolves.toBeNull();
    const folder = { kind: "directory", name: "vault" } as unknown as FileSystemDirectoryHandle;
    await rememberFolder(folder);
    await closeLocalFilesDatabase();
    await expect(getRememberedFolder()).resolves.toMatchObject({ name: "vault", handle: { kind: "directory" } });
    await forgetFolder();
    await expect(getRememberedFolder()).resolves.toBeNull();
  });

  test("a handle that cannot be stored stays linked for the session", async () => {
    // Functions are not structured-cloneable, like a handle the browser refuses to persist.
    const { handle } = mockFileHandle("live.md", { text: "x", lastModified: 1 });
    await linkDocument("doc-1", handle, { lastModified: 1, size: 1, text: "x" });
    await expect(getLink("doc-1")).resolves.toMatchObject({ name: "live.md" });
    expect(await listLinks()).toHaveLength(1);
    await expect(findLinkByHandle(handle)).resolves.toMatchObject({ documentId: "doc-1" });
    await unlinkDocument("doc-1");
    await expect(getLink("doc-1")).resolves.toBeNull();
  });

  test("falls back to memory when IndexedDB is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined);
    try {
      await linkDocument("doc-1", storableFileHandle("a.md"), { lastModified: 1, size: 1 });
      await expect(getLink("doc-1")).resolves.toMatchObject({ name: "a.md" });
      await rememberFolder({ kind: "directory", name: "vault" } as unknown as FileSystemDirectoryHandle);
      await expect(getRememberedFolder()).resolves.toMatchObject({ name: "vault" });
      await forgetFolder();
      await expect(getRememberedFolder()).resolves.toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
