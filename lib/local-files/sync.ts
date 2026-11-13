import { LocalFileError, toLocalFileError } from "@/lib/local-files/errors";
import { readFileHandle, statFileHandle, writeFileHandle, type LocalFileStat } from "@/lib/local-files/files";
import { updateLinkSync, type LocalFileLink } from "@/lib/local-files/link-store";
import { ensureAccess, queryAccess, type AccessStatus } from "@/lib/local-files/permissions";

export type DiskState =
  | ({ status: "unchanged" } & LocalFileStat)
  | ({ status: "changed" } & LocalFileStat)
  | { status: "missing" }
  | { status: "permission-required"; access: Exclude<AccessStatus, "granted"> };

export type SaveOutcome = "write" | "confirm-overwrite" | "needs-permission" | "missing";

export type SaveLinkedResult =
  | { status: "saved"; link: LocalFileLink }
  /** The file changed on disk since the last sync. Confirm, then call again with `overwrite: true`. */
  | { status: "conflict"; disk: LocalFileStat }
  | { status: "permission-required"; access: Exclude<AccessStatus, "granted"> }
  | { status: "missing" };

export type ReloadLinkedResult =
  | { status: "reloaded"; link: LocalFileLink; text: string }
  | { status: "permission-required"; access: Exclude<AccessStatus, "granted"> }
  | { status: "missing" };

/** True when the file's metadata differs from what the link recorded at the last sync. */
export function hasDiskChanged(link: Pick<LocalFileLink, "lastModified" | "size">, stat: LocalFileStat) {
  return stat.lastModified !== link.lastModified || stat.size !== link.size;
}

/** Compares the file on disk with the link's last sync, without prompting for permission. */
export async function checkDiskState(link: LocalFileLink): Promise<DiskState> {
  const access = await queryAccess(link.handle, "read");
  if (access !== "granted") return { status: "permission-required", access };
  try {
    const stat = await statFileHandle(link.handle);
    return { status: hasDiskChanged(link, stat) ? "changed" : "unchanged", ...stat };
  } catch (error) {
    const code = toLocalFileError(error).code;
    if (code === "not-found") return { status: "missing" };
    if (code === "permission-denied") return { status: "permission-required", access: "prompt" };
    throw toLocalFileError(error);
  }
}

/** Decides what a save should do. Pure: `access` is the readwrite permission, `disk` from `checkDiskState`. */
export function decideSaveOutcome({
  access,
  disk,
  overwrite = false,
}: {
  access: AccessStatus;
  disk: DiskState;
  overwrite?: boolean;
}): SaveOutcome {
  if (access !== "granted" || disk.status === "permission-required") return "needs-permission";
  if (disk.status === "missing") return "missing";
  if (disk.status === "changed" && !overwrite) return "confirm-overwrite";
  return "write";
}

/**
 * Saves `text` to the linked file and updates the link. Call from a user
 * gesture so the readwrite prompt can appear (`requestAccess: false` skips it).
 * Throws a `LocalFileError` when the write itself fails (quota, locked file).
 */
export async function saveLinkedDocument(
  link: LocalFileLink,
  text: string,
  { overwrite = false, requestAccess = true }: { overwrite?: boolean; requestAccess?: boolean } = {},
): Promise<SaveLinkedResult> {
  const access = await ensureAccess(link.handle, "readwrite", { request: requestAccess });
  if (access !== "granted") return { status: "permission-required", access };
  const disk = await checkDiskState(link);
  const outcome = decideSaveOutcome({ access, disk, overwrite });
  if (outcome === "needs-permission") {
    return { status: "permission-required", access: disk.status === "permission-required" ? disk.access : "prompt" };
  }
  if (outcome === "missing") return { status: "missing" };
  if (outcome === "confirm-overwrite" && disk.status === "changed") {
    return { status: "conflict", disk: { lastModified: disk.lastModified, size: disk.size } };
  }
  let stat: LocalFileStat;
  try {
    stat = await writeFileHandle(link.handle, text);
  } catch (error) {
    const failure = toLocalFileError(error);
    if (failure.code === "not-found") return { status: "missing" };
    throw failure;
  }
  const updated = await updateLinkSync(link.documentId, { ...stat, text });
  if (!updated) throw new LocalFileError("unknown", { message: "This document is no longer linked to a file on disk." });
  return { status: "saved", link: updated };
}

/**
 * Reads the linked file and records it as the new sync point. Use it to pull
 * an external change into a document that has no unsaved edits.
 */
export async function reloadLinkedDocument(
  link: LocalFileLink,
  { requestAccess = false }: { requestAccess?: boolean } = {},
): Promise<ReloadLinkedResult> {
  const access = await ensureAccess(link.handle, "read", { request: requestAccess });
  if (access !== "granted") return { status: "permission-required", access };
  try {
    const contents = await readFileHandle(link.handle);
    const updated = await updateLinkSync(link.documentId, contents);
    if (!updated) throw new LocalFileError("unknown", { message: "This document is no longer linked to a file on disk." });
    return { status: "reloaded", link: updated, text: contents.text };
  } catch (error) {
    const failure = toLocalFileError(error);
    if (failure.code === "not-found") return { status: "missing" };
    if (failure.code === "permission-denied") return { status: "permission-required", access: "prompt" };
    throw failure;
  }
}
