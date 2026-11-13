import { afterEach, describe, expect, test, vi } from "vitest";
import {
  LocalFileError,
  ensureAccess,
  isAbortError,
  isFileSystemAccessSupported,
  isMarkdownFileName,
  localFileErrorMessage,
  openLocalFiles,
  pickFolder,
  queryAccess,
  readFileHandle,
  requestAccess,
  saveTextAs,
  suggestedFileName,
  titleFromFileName,
  toLocalFileError,
  writeFileHandle,
} from "@/lib/local-files";
import { domError, mockFileHandle } from "@/lib/local-files/test-helpers";

type Pickers = Pick<Window, "showOpenFilePicker" | "showSaveFilePicker" | "showDirectoryPicker">;

function installPickers(pickers: Partial<Pickers> = {}) {
  const unused = async () => {
    throw new Error("unexpected picker");
  };
  Object.assign(window, {
    showOpenFilePicker: unused,
    showSaveFilePicker: unused,
    showDirectoryPicker: unused,
    ...pickers,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  const target = window as unknown as Record<string, unknown>;
  delete target.showOpenFilePicker;
  delete target.showSaveFilePicker;
  delete target.showDirectoryPicker;
});

describe("unsupported browsers", () => {
  test("detection is false in jsdom and on the server", () => {
    expect(isFileSystemAccessSupported()).toBe(false);
    vi.stubGlobal("window", undefined);
    expect(isFileSystemAccessSupported()).toBe(false);
  });

  test("pickers resolve to empty results instead of throwing", async () => {
    await expect(openLocalFiles()).resolves.toEqual([]);
    await expect(pickFolder()).resolves.toBeNull();
    await expect(saveTextAs("# Draft", { suggestedName: "Draft" })).resolves.toBeNull();
  });

  test("handles without permission methods are treated as usable", async () => {
    const bare = { kind: "file", name: "a.md" } as unknown as FileSystemFileHandle;
    await expect(queryAccess(bare, "readwrite")).resolves.toBe("granted");
    await expect(requestAccess(bare, "readwrite")).resolves.toBe("granted");
  });
});

describe("pickers", () => {
  test("opens the chosen files with their text and metadata", async () => {
    const first = mockFileHandle("a.md", { text: "# A", lastModified: 10 });
    const second = mockFileHandle("b.txt", { text: "héllo", lastModified: 20 });
    const picker = vi.fn(async () => [first.handle, second.handle]);
    installPickers({ showOpenFilePicker: picker });

    expect(isFileSystemAccessSupported()).toBe(true);
    const opened = await openLocalFiles();
    expect(picker).toHaveBeenCalledWith(expect.objectContaining({ multiple: true }));
    expect(opened).toEqual([
      { handle: first.handle, name: "a.md", text: "# A", lastModified: 10, size: 3 },
      { handle: second.handle, name: "b.txt", text: "héllo", lastModified: 20, size: 6 },
    ]);
  });

  test("a cancelled picker returns an empty result", async () => {
    const cancel = async () => {
      throw domError("AbortError");
    };
    installPickers({ showOpenFilePicker: cancel, showSaveFilePicker: cancel, showDirectoryPicker: cancel });
    await expect(openLocalFiles()).resolves.toEqual([]);
    await expect(saveTextAs("text")).resolves.toBeNull();
    await expect(pickFolder()).resolves.toBeNull();
  });

  test("picker failures other than cancel become typed errors", async () => {
    installPickers({
      showOpenFilePicker: async () => {
        throw domError("SecurityError");
      },
    });
    await expect(openLocalFiles()).rejects.toMatchObject({ name: "LocalFileError", code: "permission-denied" });
  });

  test("save as writes the text and returns the new handle", async () => {
    const target = mockFileHandle("Release notes.md", { text: "", lastModified: 100 });
    const picker = vi.fn(async () => target.handle);
    installPickers({ showSaveFilePicker: picker });

    const saved = await saveTextAs("# Notes", { suggestedName: "Release: notes?" });
    expect(picker).toHaveBeenCalledWith(expect.objectContaining({ suggestedName: "Release notes.md" }));
    expect(saved).toEqual({ handle: target.handle, name: "Release notes.md", lastModified: 1100, size: 7 });
    expect(target.state.writes).toEqual(["# Notes"]);
  });
});

describe("reading and writing handles", () => {
  test("write returns the new metadata", async () => {
    const { handle, state } = mockFileHandle("a.md", { text: "old", lastModified: 5 });
    await expect(writeFileHandle(handle, "new text")).resolves.toEqual({ lastModified: 1005, size: 8 });
    expect(state.file.text).toBe("new text");
  });

  test("a failed write aborts the stream and reports a quota error", async () => {
    const { handle, state } = mockFileHandle("a.md", { text: "old", lastModified: 5 }, { writeError: "QuotaExceededError" });
    await expect(writeFileHandle(handle, "new")).rejects.toMatchObject({ code: "quota-exceeded" });
    expect(state.aborted).toBe(1);
    expect(state.file.text).toBe("old");
  });

  test("reading a deleted or blocked file throws typed errors", async () => {
    const gone = mockFileHandle("a.md", { text: "", lastModified: 1 }, { missing: true });
    await expect(readFileHandle(gone.handle)).rejects.toMatchObject({ code: "not-found" });
    const blocked = mockFileHandle("a.md", { text: "", lastModified: 1 }, { permission: "prompt" });
    await expect(readFileHandle(blocked.handle)).rejects.toMatchObject({ code: "permission-denied" });
  });
});

describe("permissions", () => {
  test("ensureAccess prompts only when needed", async () => {
    const granted = mockFileHandle("a.md", { text: "", lastModified: 1 });
    await expect(ensureAccess(granted.handle, "readwrite")).resolves.toBe("granted");
    expect(granted.state.requests).toBe(0);

    const lapsed = mockFileHandle("a.md", { text: "", lastModified: 1 }, { permission: "prompt" });
    await expect(ensureAccess(lapsed.handle, "readwrite", { request: false })).resolves.toBe("prompt");
    expect(lapsed.state.requests).toBe(0);
    await expect(ensureAccess(lapsed.handle, "readwrite")).resolves.toBe("granted");
    expect(lapsed.state.requests).toBe(1);
  });

  test("a declined prompt reports denied", async () => {
    const declined = mockFileHandle("a.md", { text: "", lastModified: 1 }, { permission: "prompt", permissionAfterRequest: "denied" });
    await expect(requestAccess(declined.handle, "read")).resolves.toBe("denied");
  });

  test("a prompt without a user gesture leaves the status unchanged", async () => {
    const handle = {
      kind: "file",
      name: "a.md",
      queryPermission: async () => "prompt" as PermissionState,
      requestPermission: async () => {
        throw domError("SecurityError");
      },
    } as unknown as FileSystemFileHandle;
    await expect(requestAccess(handle, "readwrite")).resolves.toBe("prompt");
  });
});

describe("errors and names", () => {
  test("maps DOMException names to codes with readable messages", () => {
    expect(toLocalFileError(domError("NotAllowedError")).code).toBe("permission-denied");
    expect(toLocalFileError(domError("NotFoundError")).code).toBe("not-found");
    expect(toLocalFileError(domError("QuotaExceededError")).code).toBe("quota-exceeded");
    expect(toLocalFileError(domError("NoModificationAllowedError")).code).toBe("locked");
    expect(toLocalFileError("boom").code).toBe("unknown");
    const existing = new LocalFileError("not-found");
    expect(toLocalFileError(existing)).toBe(existing);
    expect(localFileErrorMessage(domError("QuotaExceededError"))).toMatch(/free space/);
    expect(isAbortError(domError("AbortError"))).toBe(true);
    expect(isAbortError(null)).toBe(false);
  });

  test("recognises Markdown file names and derives titles", () => {
    expect(["a.md", "B.MARKDOWN", "c.mdx", "d.txt"].every(isMarkdownFileName)).toBe(true);
    expect([".md", "a.pdf", "md", "a.md.bak"].some(isMarkdownFileName)).toBe(false);
    expect(titleFromFileName("Release notes.md")).toBe("Release notes");
    expect(titleFromFileName("archive.zip")).toBe("archive.zip");
    expect(suggestedFileName("  ")).toBe("Untitled.md");
    expect(suggestedFileName("a/b\\c")).toBe("a b c.md");
    expect(suggestedFileName("notes.txt")).toBe("notes.txt");
  });
});
