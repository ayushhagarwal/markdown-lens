import { describe, expect, test } from "vitest";
import { findFolderFile, walkFolder, type FolderNode } from "@/lib/local-files";
import { mockDirectoryHandle } from "@/lib/local-files/test-helpers";

function outline(nodes: readonly FolderNode[]): string[] {
  return nodes.flatMap((node) => (node.kind === "file" ? [node.path] : [`${node.path}/`, ...outline(node.children)]));
}

describe("walkFolder", () => {
  test("keeps Markdown files, sorts directories first, and skips ignored directories", async () => {
    const root = mockDirectoryHandle("notes", {
      "zeta.md": "",
      "note10.md": "",
      "note2.md": "",
      "image.png": "",
      "README.MD": "",
      "todo.txt": "",
      node_modules: { "pkg.md": "" },
      ".git": { "HEAD.md": "" },
      ".obsidian": { "config.md": "" },
      assets: { "logo.svg": "" },
      guides: { "intro.mdx": "", deep: { "page.markdown": "" } },
      Archive: { "old.md": "" },
    });

    const tree = await walkFolder(root);
    expect(tree.name).toBe("notes");
    expect(tree.truncated).toBe(false);
    expect(tree.fileCount).toBe(8);
    expect(outline(tree.children)).toEqual([
      "Archive/",
      "Archive/old.md",
      "guides/",
      "guides/deep/",
      "guides/deep/page.markdown",
      "guides/intro.mdx",
      "note2.md",
      "note10.md",
      "README.MD",
      "todo.txt",
      "zeta.md",
    ]);
    expect(findFolderFile(tree.children, "guides/deep/page.markdown")?.handle.name).toBe("page.markdown");
    expect(findFolderFile(tree.children, "guides/missing.md")).toBeNull();
  });

  test("stops at the depth limit and reports truncation", async () => {
    const root = mockDirectoryHandle("root", {
      "top.md": "",
      one: { "one.md": "", two: { "two.md": "", three: { "three.md": "" } } },
    });

    const shallow = await walkFolder(root, { maxDepth: 0 });
    expect(outline(shallow.children)).toEqual(["top.md"]);
    expect(shallow.truncated).toBe(true);

    const twoLevels = await walkFolder(root, { maxDepth: 2 });
    expect(outline(twoLevels.children)).toEqual(["one/", "one/two/", "one/two/two.md", "one/one.md", "top.md"]);
    expect(twoLevels.truncated).toBe(true);

    const full = await walkFolder(root, { maxDepth: 3 });
    expect(full.fileCount).toBe(4);
    expect(full.truncated).toBe(false);
  });

  test("caps the number of files, preferring files nearest the root", async () => {
    const root = mockDirectoryHandle("root", {
      "c.md": "",
      "a.md": "",
      "b.md": "",
      sub: { "d.md": "" },
    });
    const tree = await walkFolder(root, { maxEntries: 2 });
    expect(outline(tree.children)).toEqual(["a.md", "b.md"]);
    expect(tree.fileCount).toBe(2);
    expect(tree.truncated).toBe(true);

    const exact = await walkFolder(root, { maxEntries: 4 });
    expect(exact.fileCount).toBe(4);
    expect(exact.truncated).toBe(false);
  });

  test("caps the number of entries scanned", async () => {
    const shape = Object.fromEntries(Array.from({ length: 50 }, (_, index) => [`file-${index}.md`, ""]));
    const tree = await walkFolder(mockDirectoryHandle("big", shape), { maxScanned: 10 });
    expect(tree.fileCount).toBe(10);
    expect(tree.truncated).toBe(true);
  });

  test("reports an empty folder without truncation", async () => {
    const tree = await walkFolder(mockDirectoryHandle("empty", { "photo.jpg": "", docs: { "a.pdf": "" } }));
    expect(tree).toMatchObject({ children: [], fileCount: 0, truncated: false });
  });

  test("an unreadable sub-directory is skipped; an unreadable root throws", async () => {
    const shape = { "a.md": "", locked: { "b.md": "" } };
    const partial = await walkFolder(mockDirectoryHandle("root", shape, { failOn: ["locked"] }));
    expect(outline(partial.children)).toEqual(["a.md"]);
    expect(partial.truncated).toBe(true);

    await expect(walkFolder(mockDirectoryHandle("root", shape, { failOn: ["root"] }))).rejects.toMatchObject({
      name: "LocalFileError",
      code: "permission-denied",
    });
  });
});
