export type AccessMode = "read" | "readwrite";

/**
 * `granted`: usable now. `prompt`: the user must be asked (needs a user gesture,
 * typical after a reload). `denied`: the user or browser blocked access.
 */
export type AccessStatus = "granted" | "prompt" | "denied";

/** Reads the current permission without prompting. */
export async function queryAccess(handle: FileSystemHandle, mode: AccessMode = "read"): Promise<AccessStatus> {
  // Handles without the permission methods (older engines, OPFS) are always usable.
  if (typeof handle.queryPermission !== "function") return "granted";
  try {
    return await handle.queryPermission({ mode });
  } catch {
    return "denied";
  }
}

/** Prompts for access. Must be called from a user gesture (click or key press). */
export async function requestAccess(handle: FileSystemHandle, mode: AccessMode = "read"): Promise<AccessStatus> {
  if (typeof handle.requestPermission !== "function") return queryAccess(handle, mode);
  try {
    return await handle.requestPermission({ mode });
  } catch {
    // Thrown without a user gesture (SecurityError) or when the prompt is dismissed.
    return queryAccess(handle, mode);
  }
}

/** Queries first and only prompts when needed and `request` is true. */
export async function ensureAccess(
  handle: FileSystemHandle,
  mode: AccessMode = "read",
  { request = true }: { request?: boolean } = {},
): Promise<AccessStatus> {
  const current = await queryAccess(handle, mode);
  if (current !== "prompt" || !request) return current;
  return requestAccess(handle, mode);
}
