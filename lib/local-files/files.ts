import { isAbortError, toLocalFileError } from "@/lib/local-files/errors";
import { isFileSystemAccessSupported } from "@/lib/local-files/support";

export const MARKDOWN_FILE_EXTENSIONS = [".md", ".markdown", ".mdx", ".txt"] as const;

const PICKER_ID = "markdown-lens";
const PICKER_TYPES: FilePickerAcceptType[] = [
  {
    description: "Markdown and text files",
    accept: { "text/markdown": [".md", ".markdown", ".mdx"], "text/plain": [".txt"] },
  },
];

/** What is known about a file on disk at the moment it was read or written. */
export type LocalFileStat = {
  lastModified: number;
  size: number;
};

export type LocalFileContents = LocalFileStat & {
  name: string;
  text: string;
};

export type OpenedLocalFile = LocalFileContents & {
  handle: FileSystemFileHandle;
};

export type SavedLocalFile = LocalFileStat & {
  handle: FileSystemFileHandle;
  name: string;
};

export function isMarkdownFileName(name: string) {
  const lower = name.toLowerCase();
  return MARKDOWN_FILE_EXTENSIONS.some((extension) => lower.endsWith(extension) && lower.length > extension.length);
}

/** "notes.md" -> "notes"; names without a known extension are returned unchanged. */
export function titleFromFileName(name: string) {
  const lower = name.toLowerCase();
  const extension = MARKDOWN_FILE_EXTENSIONS.find((item) => lower.endsWith(item) && lower.length > item.length);
  return extension ? name.slice(0, -extension.length) : name;
}

/** Builds a safe "Save as" file name from a document title, keeping a known extension. */
export function suggestedFileName(title: string) {
  const cleaned = title
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, 120)
    .trim();
  const base = cleaned || "Untitled";
  return isMarkdownFileName(base) ? base : `${base}.md`;
}

/** Reads a handle's current contents. Throws a `LocalFileError`. */
export async function readFileHandle(handle: FileSystemFileHandle): Promise<LocalFileContents> {
  try {
    const file = await handle.getFile();
    return { name: file.name, text: await file.text(), lastModified: file.lastModified, size: file.size };
  } catch (error) {
    throw toLocalFileError(error);
  }
}

/** Reads a handle's metadata without loading its text. Throws a `LocalFileError`. */
export async function statFileHandle(handle: FileSystemFileHandle): Promise<LocalFileStat> {
  try {
    const file = await handle.getFile();
    return { lastModified: file.lastModified, size: file.size };
  } catch (error) {
    throw toLocalFileError(error);
  }
}

/**
 * Opens the file picker. Returns `[]` when the user cancels or the API is
 * unsupported; throws a `LocalFileError` only when a chosen file cannot be read.
 */
export async function openLocalFiles({ multiple = true }: { multiple?: boolean } = {}): Promise<OpenedLocalFile[]> {
  if (!isFileSystemAccessSupported()) return [];
  let handles: FileSystemFileHandle[];
  try {
    handles = await window.showOpenFilePicker!({ id: PICKER_ID, multiple, types: PICKER_TYPES });
  } catch (error) {
    if (isAbortError(error)) return [];
    throw toLocalFileError(error);
  }
  const opened: OpenedLocalFile[] = [];
  for (const handle of handles) opened.push({ handle, ...(await readFileHandle(handle)) });
  return opened;
}

/**
 * Replaces the file's contents and returns its new metadata. The browser writes
 * to a temporary file and swaps it in on close, so a failed write leaves the
 * original untouched. Throws a `LocalFileError`.
 */
export async function writeFileHandle(handle: FileSystemFileHandle, text: string): Promise<LocalFileStat> {
  try {
    const writable = await handle.createWritable();
    try {
      await writable.write(text);
      await writable.close();
    } catch (error) {
      await writable.abort().catch(() => undefined);
      throw error;
    }
    const file = await handle.getFile();
    return { lastModified: file.lastModified, size: file.size };
  } catch (error) {
    throw toLocalFileError(error);
  }
}

/**
 * Shows the save picker and writes `text` to the chosen file. Returns `null`
 * when the user cancels or the API is unsupported.
 */
export async function saveTextAs(
  text: string,
  { suggestedName, startIn }: { suggestedName?: string; startIn?: FileSystemHandle } = {},
): Promise<SavedLocalFile | null> {
  if (!isFileSystemAccessSupported()) return null;
  let handle: FileSystemFileHandle;
  try {
    handle = await window.showSaveFilePicker!({
      id: PICKER_ID,
      suggestedName: suggestedFileName(suggestedName ?? "Untitled"),
      types: PICKER_TYPES,
      ...(startIn ? { startIn } : {}),
    });
  } catch (error) {
    if (isAbortError(error)) return null;
    throw toLocalFileError(error);
  }
  const stat = await writeFileHandle(handle, text);
  return { handle, name: handle.name, ...stat };
}
