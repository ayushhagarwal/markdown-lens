export type LocalFileErrorCode =
  | "unsupported"
  | "permission-denied"
  | "not-found"
  | "quota-exceeded"
  | "locked"
  | "unknown";

const MESSAGES: Record<LocalFileErrorCode, string> = {
  unsupported: "This browser cannot open or save files on disk directly. Use download instead.",
  "permission-denied": "Markdown Lens does not have permission to access this file. Grant access and try again.",
  "not-found": "This file was moved, renamed, or deleted on disk. Save it as a new file to keep your changes.",
  "quota-exceeded": "There is not enough free space on the disk to save this file.",
  locked: "This file is in use by another app or cannot be modified right now. Try again in a moment.",
  unknown: "The file could not be read or saved. Try again.",
};

export class LocalFileError extends Error {
  readonly code: LocalFileErrorCode;

  constructor(code: LocalFileErrorCode, options?: { cause?: unknown; message?: string }) {
    super(options?.message ?? MESSAGES[code]);
    this.name = "LocalFileError";
    this.code = code;
    if (options?.cause !== undefined) (this as { cause?: unknown }).cause = options.cause;
  }
}

function errorName(error: unknown) {
  if (typeof error !== "object" || error === null) return "";
  const name = (error as { name?: unknown }).name;
  return typeof name === "string" ? name : "";
}

/** True when a picker was dismissed by the user. */
export function isAbortError(error: unknown) {
  return errorName(error) === "AbortError";
}

/** Maps DOMExceptions thrown by the File System Access API onto typed errors. */
export function toLocalFileError(error: unknown): LocalFileError {
  if (error instanceof LocalFileError) return error;
  switch (errorName(error)) {
    case "NotAllowedError":
    case "SecurityError":
      return new LocalFileError("permission-denied", { cause: error });
    case "NotFoundError":
      return new LocalFileError("not-found", { cause: error });
    case "QuotaExceededError":
      return new LocalFileError("quota-exceeded", { cause: error });
    case "NoModificationAllowedError":
    case "InvalidStateError":
    case "InvalidModificationError":
      return new LocalFileError("locked", { cause: error });
    default:
      return new LocalFileError("unknown", { cause: error });
  }
}

/** A message suitable for a toast, whatever was thrown. */
export function localFileErrorMessage(error: unknown) {
  return toLocalFileError(error).message;
}
