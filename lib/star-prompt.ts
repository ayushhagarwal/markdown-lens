export const STAR_CONVERSION_COUNT_KEY = "markdown-lens:successful-conversions";
export const STAR_PROMPT_SHOWN_KEY = "markdown-lens:star-prompt-shown";
export const STAR_PROMPT_RESOLVED_KEY = "markdown-lens:star-prompt-resolved";
export const STAR_EXPORT_COUNT_KEY = "markdown-lens:successful-exports";

/** The export prompt appears on this successful export. */
const EXPORT_PROMPT_AT = 3;

type LocalStorageLike = Pick<Storage, "getItem" | "setItem">;

type PromptOptions = {
  /**
   * False when the moment is not a good one to ask (for example the
   * conversion produced warnings, or an error is on screen). The action is
   * still counted, but the one-time prompt is not spent.
   */
  eligible?: boolean;
};

function readCount(storage: LocalStorageLike, key: string) {
  const value = Number.parseInt(storage.getItem(key) ?? "0", 10);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function incrementCount(storage: LocalStorageLike, key: string) {
  const count = readCount(storage, key) + 1;
  storage.setItem(key, String(count));
  return count;
}

function isClosed(storage: LocalStorageLike) {
  return storage.getItem(STAR_PROMPT_RESOLVED_KEY) === "1" || storage.getItem(STAR_PROMPT_SHOWN_KEY) === "1";
}

/**
 * Records a successful conversion locally and returns whether the optional
 * GitHub prompt should be shown for this conversion (from the second
 * successful conversion on, at most once, never after the prompt was
 * resolved). Storage failures (private mode) return false.
 */
export function recordConversionAndShouldAsk(storage: LocalStorageLike, { eligible = true }: PromptOptions = {}) {
  try {
    const count = incrementCount(storage, STAR_CONVERSION_COUNT_KEY);
    if (!eligible || count < 2 || isClosed(storage)) return false;
    storage.setItem(STAR_PROMPT_SHOWN_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

/**
 * Records a successful export (copy, download, HTML, bundle, share link) and
 * returns true once, on the third export, unless the star prompt was already
 * shown (for example after a conversion) or resolved. Showing it marks the
 * prompt as shown, so the GitHub ask appears at most once overall.
 */
export function recordExportAndShouldAsk(storage: LocalStorageLike, { eligible = true }: PromptOptions = {}) {
  try {
    const count = incrementCount(storage, STAR_EXPORT_COUNT_KEY);
    if (!eligible || count < EXPORT_PROMPT_AT || isClosed(storage)) return false;
    storage.setItem(STAR_PROMPT_SHOWN_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

/**
 * Marks the star prompt as resolved (the person starred or dismissed it).
 * After this, no prompt function returns true again.
 */
export function resolveStarPrompt(storage: LocalStorageLike) {
  try {
    storage.setItem(STAR_PROMPT_RESOLVED_KEY, "1");
  } catch {
    // Preference storage is optional.
  }
}
