import { describe, expect, test } from "vitest";
import {
  STAR_CONVERSION_COUNT_KEY,
  STAR_PROMPT_SHOWN_KEY,
  recordConversionAndShouldAsk,
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
