import { describe, expect, test } from "vitest";
import {
  assertImageBudget,
  parseImageHeader,
} from "@/lib/converters/image-converter";
import { DEFAULT_CONVERSION_LIMITS } from "@/lib/converters/types";

describe("image header budgets", () => {
  test("reads PNG dimensions without decoding pixels", () => {
    const bytes = pngHeader(800, 600);
    expect(parseImageHeader(bytes)).toEqual({
      width: 800,
      height: 600,
      animated: false,
    });
    expect(() =>
      assertImageBudget(parseImageHeader(bytes), DEFAULT_CONVERSION_LIMITS),
    ).not.toThrow();
  });

  test("rejects extreme dimensions and animation metadata", () => {
    expect(() =>
      assertImageBudget(
        { width: 50_000, height: 50_000, animated: false },
        DEFAULT_CONVERSION_LIMITS,
      ),
    ).toThrow("width, height, pixel, or frame limit");
    expect(() =>
      assertImageBudget(
        { width: 100, height: 100, animated: true },
        DEFAULT_CONVERSION_LIMITS,
      ),
    ).toThrow("width, height, pixel, or frame limit");
  });

  test("fails closed on malformed headers", () => {
    expect(() => parseImageHeader(new Uint8Array([1, 2, 3, 4]))).toThrow(
      "unsupported or malformed",
    );
  });
});

function pngHeader(width: number, height: number) {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13, false);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return bytes;
}
