import { isAbortError, toLocalFileError } from "@/lib/local-files/errors";
import { isMarkdownFileName } from "@/lib/local-files/files";
import type { AccessMode } from "@/lib/local-files/permissions";
import { isFileSystemAccessSupported } from "@/lib/local-files/support";

export type FolderFileNode = {
  kind: "file";
  name: string;
  /** Path relative to the opened folder, "/" separated, e.g. "docs/intro.md". */
  path: string;
  handle: FileSystemFileHandle;
};

export type FolderDirectoryNode = {
  kind: "directory";
  name: string;
  path: string;
  children: FolderNode[];
};

export type FolderNode = FolderFileNode | FolderDirectoryNode;

export type FolderTree = {
  name: string;
  /** Directories first, then files, each sorted by name. Directories without Markdown files are omitted. */
  children: FolderNode[];
  fileCount: number;
  /** True when a limit stopped the walk, so some files may be missing. */
  truncated: boolean;
};

export type WalkFolderOptions = {
  /** Levels of sub-directories to descend into. 0 lists only the folder's own files. Default 8. */
  maxDepth?: number;
  /** Maximum Markdown files in the tree. Default 1000. */
  maxEntries?: number;
  /** Maximum directory entries inspected, of any type. Default 20000. */
  maxScanned?: number;
};

export const DEFAULT_WALK_LIMITS = { maxDepth: 8, maxEntries: 1000, maxScanned: 20_000 } as const;

const SKIPPED_DIRECTORIES = new Set(["node_modules", ".git"]);
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function isSkippedDirectory(name: string) {
  return name.startsWith(".") || SKIPPED_DIRECTORIES.has(name);
}

/** Shows the folder picker. Returns `null` when the user cancels or the API is unsupported. */
export async function pickFolder({ mode = "read" }: { mode?: AccessMode } = {}): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) return null;
  try {
    return await window.showDirectoryPicker!({ id: "markdown-lens-folder", mode });
  } catch (error) {
    if (isAbortError(error)) return null;
    throw toLocalFileError(error);
  }
}

/**
 * Walks a folder into a sorted tree of Markdown files. Entries are visited in
 * name order, a directory's own files before its sub-directories, so a
 * truncated result is deterministic. Throws a `LocalFileError` (for example
 * `permission-denied` when access lapsed after a reload).
 */
export async function walkFolder(
  root: FileSystemDirectoryHandle,
  options: WalkFolderOptions = {},
): Promise<FolderTree> {
  const maxDepth = options.maxDepth ?? DEFAULT_WALK_LIMITS.maxDepth;
  const maxEntries = options.maxEntries ?? DEFAULT_WALK_LIMITS.maxEntries;
  const maxScanned = options.maxScanned ?? DEFAULT_WALK_LIMITS.maxScanned;
  const state = { files: 0, scanned: 0, truncated: false };

  async function walk(directory: FileSystemDirectoryHandle, prefix: string, depth: number): Promise<FolderNode[]> {
    const files: FileSystemFileHandle[] = [];
    const directories: FileSystemDirectoryHandle[] = [];
    for await (const entry of directory.values()) {
      if (state.scanned >= maxScanned) {
        state.truncated = true;
        break;
      }
      state.scanned += 1;
      if (entry.kind === "file") {
        if (isMarkdownFileName(entry.name)) files.push(entry as FileSystemFileHandle);
      } else if (!isSkippedDirectory(entry.name)) {
        directories.push(entry as FileSystemDirectoryHandle);
      }
    }
    files.sort((left, right) => collator.compare(left.name, right.name));
    directories.sort((left, right) => collator.compare(left.name, right.name));

    const fileNodes: FolderFileNode[] = [];
    for (const handle of files) {
      if (state.files >= maxEntries) {
        state.truncated = true;
        break;
      }
      state.files += 1;
      fileNodes.push({ kind: "file", name: handle.name, path: `${prefix}${handle.name}`, handle });
    }

    const directoryNodes: FolderDirectoryNode[] = [];
    for (const handle of directories) {
      if (depth >= maxDepth || state.files >= maxEntries || state.scanned >= maxScanned) {
        // Not descended into, so it may hold files the tree does not show.
        state.truncated = true;
        break;
      }
      const path = `${prefix}${handle.name}`;
      let children: FolderNode[];
      try {
        children = await walk(handle, `${path}/`, depth + 1);
      } catch {
        // An unreadable sub-directory should not hide the rest of the folder.
        state.truncated = true;
        continue;
      }
      if (children.length) directoryNodes.push({ kind: "directory", name: handle.name, path, children });
    }
    return [...directoryNodes, ...fileNodes];
  }

  try {
    const children = await walk(root, "", 0);
    return { name: root.name, children, fileCount: state.files, truncated: state.truncated };
  } catch (error) {
    throw toLocalFileError(error);
  }
}

/** Finds a file node by its relative path. */
export function findFolderFile(nodes: readonly FolderNode[], path: string): FolderFileNode | null {
  for (const node of nodes) {
    if (node.kind === "file") {
      if (node.path === path) return node;
    } else if (path.startsWith(`${node.path}/`)) {
      const match = findFolderFile(node.children, path);
      if (match) return match;
    }
  }
  return null;
}
