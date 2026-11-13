import "fake-indexeddb/auto";
import { deleteDB } from "idb";
import { afterAll, beforeEach, describe, expect, test } from "vitest";
import {
  checkDiskState,
  closeLocalFilesDatabase,
  decideSaveOutcome,
  getLink,
  hasDiskChanged,
  hasUnsavedDiskChanges,
  linkDocument,
  reloadLinkedDocument,
  saveLinkedDocument,
  type DiskState,
} from "@/lib/local-files";
import { mockFileHandle, type MockFileHandleOptions } from "@/lib/local-files/test-helpers";

const DATABASE_NAME = "markdown-lens-local-files";

async function reset() {
  await closeLocalFilesDatabase();
  await deleteDB(DATABASE_NAME);
}

/** Links "doc-1" to a mock file whose disk state matches the link. */
async function linked(text = "# Notes", options: MockFileHandleOptions = {}) {
  const mock = mockFileHandle("notes.md", { text, lastModified: 1000 }, options);
  const link = await linkDocument("doc-1", mock.handle, { lastModified: 1000, size: new TextEncoder().encode(text).length, text });
  return { ...mock, link };
}

describe("decideSaveOutcome", () => {
  const unchanged: DiskState = { status: "unchanged", lastModified: 1, size: 1 };
  const changed: DiskState = { status: "changed", lastModified: 2, size: 5 };

  test("writes when access is granted and the disk is unchanged", () => {
    expect(decideSaveOutcome({ access: "granted", disk: unchanged })).toBe("write");
  });

  test("asks for confirmation when the file changed externally", () => {
    expect(decideSaveOutcome({ access: "granted", disk: changed })).toBe("confirm-overwrite");
    expect(decideSaveOutcome({ access: "granted", disk: changed, overwrite: true })).toBe("write");
  });

  test("permission comes before everything else", () => {
    expect(decideSaveOutcome({ access: "prompt", disk: unchanged })).toBe("needs-permission");
    expect(decideSaveOutcome({ access: "denied", disk: changed, overwrite: true })).toBe("needs-permission");
    expect(decideSaveOutcome({ access: "granted", disk: { status: "permission-required", access: "prompt" } })).toBe("needs-permission");
  });

  test("a missing file is never overwritten silently", () => {
    expect(decideSaveOutcome({ access: "granted", disk: { status: "missing" } })).toBe("missing");
    expect(decideSaveOutcome({ access: "granted", disk: { status: "missing" }, overwrite: true })).toBe("missing");
  });
});

describe("hasDiskChanged", () => {
  test("compares lastModified and size", () => {
    const link = { lastModified: 10, size: 4 };
    expect(hasDiskChanged(link, { lastModified: 10, size: 4 })).toBe(false);
    expect(hasDiskChanged(link, { lastModified: 11, size: 4 })).toBe(true);
    expect(hasDiskChanged(link, { lastModified: 10, size: 5 })).toBe(true);
  });
});

describe.sequential("linked documents on disk", () => {
  beforeEach(reset);
  afterAll(reset);

  test("detects unchanged, changed, missing and permission states", async () => {
    const { link, state } = await linked();
    await expect(checkDiskState(link)).resolves.toEqual({ status: "unchanged", lastModified: 1000, size: 7 });

    state.file = { text: "# Notes edited elsewhere", lastModified: 2000 };
    await expect(checkDiskState(link)).resolves.toMatchObject({ status: "changed", lastModified: 2000 });

    state.missing = true;
    await expect(checkDiskState(link)).resolves.toEqual({ status: "missing" });

    state.permission = "prompt";
    await expect(checkDiskState(link)).resolves.toEqual({ status: "permission-required", access: "prompt" });
    expect(state.requests).toBe(0);
  });

  test("a clean save writes the file and updates the link", async () => {
    const { link, state } = await linked();
    const result = await saveLinkedDocument(link, "# Notes v2");
    expect(result).toMatchObject({ status: "saved", link: { lastModified: 2000, size: 10 } });
    expect(state.writes).toEqual(["# Notes v2"]);

    const stored = await getLink("doc-1");
    expect(stored).toMatchObject({ lastModified: 2000, size: 10 });
    expect(hasUnsavedDiskChanges(stored!, "# Notes v2")).toBe(false);
    await expect(checkDiskState(stored!)).resolves.toMatchObject({ status: "unchanged" });
  });

  test("an external change needs confirmation before overwriting", async () => {
    const { link, state } = await linked();
    state.file = { text: "changed elsewhere", lastModified: 5000 };

    await expect(saveLinkedDocument(link, "mine")).resolves.toEqual({
      status: "conflict",
      disk: { lastModified: 5000, size: 17 },
    });
    expect(state.writes).toEqual([]);

    await expect(saveLinkedDocument(link, "mine", { overwrite: true })).resolves.toMatchObject({ status: "saved" });
    expect(state.file.text).toBe("mine");
  });

  test("requests write access when it lapsed and reports a refusal", async () => {
    const lapsed = await linked("# Notes", { permission: "prompt" });
    await expect(saveLinkedDocument(lapsed.link, "x", { requestAccess: false })).resolves.toEqual({
      status: "permission-required",
      access: "prompt",
    });
    expect(lapsed.state.requests).toBe(0);
    await expect(saveLinkedDocument(lapsed.link, "x")).resolves.toMatchObject({ status: "saved" });
    expect(lapsed.state.requests).toBe(1);

    await reset();
    const refused = await linked("# Notes", { permission: "prompt", permissionAfterRequest: "denied" });
    await expect(saveLinkedDocument(refused.link, "x")).resolves.toEqual({ status: "permission-required", access: "denied" });
    expect(refused.state.writes).toEqual([]);
  });

  test("a deleted file is reported as missing instead of being recreated", async () => {
    const { link, state } = await linked();
    state.missing = true;
    await expect(saveLinkedDocument(link, "x")).resolves.toEqual({ status: "missing" });
    expect(state.writes).toEqual([]);
  });

  test("write failures surface as typed errors and leave the link untouched", async () => {
    const { link } = await linked("# Notes", { writeError: "QuotaExceededError" });
    await expect(saveLinkedDocument(link, "x")).rejects.toMatchObject({ code: "quota-exceeded" });
    await expect(getLink("doc-1")).resolves.toMatchObject({ lastModified: 1000 });
  });

  test("reload pulls the disk text and resets the sync point", async () => {
    const { link, state } = await linked();
    state.file = { text: "from disk", lastModified: 3000 };
    const result = await reloadLinkedDocument(link);
    expect(result).toMatchObject({ status: "reloaded", text: "from disk", link: { lastModified: 3000, size: 9 } });
    if (result.status === "reloaded") expect(hasUnsavedDiskChanges(result.link, "from disk")).toBe(false);

    state.missing = true;
    await expect(reloadLinkedDocument(link)).resolves.toEqual({ status: "missing" });
    state.permission = "prompt";
    await expect(reloadLinkedDocument(link)).resolves.toEqual({ status: "permission-required", access: "prompt" });
  });
});
