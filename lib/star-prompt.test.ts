import { describe, expect, test } from "vitest";
import {
  STAR_CONVERSION_COUNT_KEY,
  STAR_EXPORT_COUNT_KEY,
  STAR_PROMPT_RESOLVED_KEY,
  STAR_PROMPT_SHOWN_KEY,
  recordConversionAndShouldAsk,
  recordExportAndShouldAsk,
  resolveStarPrompt,
} from "@/lib/star-prompt";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("GitHub star prompt timing", () => {
  test("waits until the second successful conversion", () => {
    const local = storage();

    expect(recordConversionAndShouldAsk(local)).toBe(false);
    expect(recordConversionAndShouldAsk(local)).toBe(true);
    expect(local.getItem(STAR_CONVERSION_COUNT_KEY)).toBe("2");
    expect(local.getItem(STAR_PROMPT_SHOWN_KEY)).toBe("1");
  });

  test("does not show again after it has been offered", () => {
    const local = storage();

    recordConversionAndShouldAsk(local);
    recordConversionAndShouldAsk(local);
    expect(recordConversionAndShouldAsk(local)).toBe(false);
    expect(local.getItem(STAR_CONVERSION_COUNT_KEY)).toBe("3");
  });

  test("recovers from invalid stored counts", () => {
    const local = storage();
    local.setItem(STAR_CONVERSION_COUNT_KEY, "not-a-number");

    expect(recordConversionAndShouldAsk(local)).toBe(false);
    expect(local.getItem(STAR_CONVERSION_COUNT_KEY)).toBe("1");
  });
});

describe("GitHub star prompt after exports", () => {
  test("asks on the third successful export, once", () => {
    const local = storage();

    expect(recordExportAndShouldAsk(local)).toBe(false);
    expect(recordExportAndShouldAsk(local)).toBe(false);
    expect(recordExportAndShouldAsk(local)).toBe(true);
    expect(recordExportAndShouldAsk(local)).toBe(false);
    expect(local.getItem(STAR_EXPORT_COUNT_KEY)).toBe("4");
  });

  test("does not ask after exports when the conversion prompt was already shown", () => {
    const local = storage();
    recordConversionAndShouldAsk(local);
    expect(recordConversionAndShouldAsk(local)).toBe(true);

    for (let index = 0; index < 5; index += 1) expect(recordExportAndShouldAsk(local)).toBe(false);
  });

  test("an export prompt also prevents a later conversion prompt", () => {
    const local = storage();
    recordExportAndShouldAsk(local);
    recordExportAndShouldAsk(local);
    expect(recordExportAndShouldAsk(local)).toBe(true);

    recordConversionAndShouldAsk(local);
    expect(recordConversionAndShouldAsk(local)).toBe(false);
  });

  test("an ineligible moment counts the action without spending the prompt", () => {
    const local = storage();
    recordExportAndShouldAsk(local);
    recordExportAndShouldAsk(local);
    expect(recordExportAndShouldAsk(local, { eligible: false })).toBe(false);
    expect(local.getItem(STAR_PROMPT_SHOWN_KEY)).toBeNull();
    expect(recordExportAndShouldAsk(local)).toBe(true);

    const conversions = storage();
    recordConversionAndShouldAsk(conversions);
    expect(recordConversionAndShouldAsk(conversions, { eligible: false })).toBe(false);
    expect(recordConversionAndShouldAsk(conversions)).toBe(true);
  });
});

describe("resolved star prompt", () => {
  test("never asks again once resolved", () => {
    const local = storage();
    resolveStarPrompt(local);
    expect(local.getItem(STAR_PROMPT_RESOLVED_KEY)).toBe("1");

    for (let index = 0; index < 5; index += 1) {
      expect(recordConversionAndShouldAsk(local)).toBe(false);
      expect(recordExportAndShouldAsk(local)).toBe(false);
    }
  });

  test("tolerates storage that throws", () => {
    const throwing = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("SecurityError");
      },
    };

    expect(recordConversionAndShouldAsk(throwing)).toBe(false);
    expect(recordExportAndShouldAsk(throwing)).toBe(false);
    expect(() => resolveStarPrompt(throwing)).not.toThrow();
  });
});
