export const STAR_CONVERSION_COUNT_KEY = "markdown-lens:successful-conversions";
export const STAR_PROMPT_SHOWN_KEY = "markdown-lens:star-prompt-shown";

type LocalStorageLike = Pick<Storage, "getItem" | "setItem">;

function readCount(storage: LocalStorageLike) {
  const value = Number.parseInt(storage.getItem(STAR_CONVERSION_COUNT_KEY) ?? "0", 10);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

/**
 * Records a successful conversion locally and returns whether the optional
 * GitHub prompt should be shown for this conversion.
 */
export function recordConversionAndShouldAsk(storage: LocalStorageLike) {
  const count = readCount(storage) + 1;
  storage.setItem(STAR_CONVERSION_COUNT_KEY, String(count));

  if (count < 2 || storage.getItem(STAR_PROMPT_SHOWN_KEY) === "1") return false;

  storage.setItem(STAR_PROMPT_SHOWN_KEY, "1");
  return true;
}
