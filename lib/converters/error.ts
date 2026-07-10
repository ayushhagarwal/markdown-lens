export type ConverterErrorCode =
  | "unsupported"
  | "too-large"
  | "invalid"
  | "encrypted"
  | "no-text"
  | "cancelled"
  | "archive-limit"
  | "ocr-required"
  | "storage";

export class ConverterError extends Error {
  constructor(
    public readonly code: ConverterErrorCode,
    message: string,
    public readonly recoverable = false,
  ) {
    super(message);
    this.name = "ConverterError";
  }
}

export function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw new ConverterError("cancelled", "Conversion was cancelled.", true);
}
