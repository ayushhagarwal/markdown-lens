import { describe, expect, test } from "vitest";
import { createShareFragment, readShareFragment, SHARE_FRAGMENT_LIMIT } from "@/lib/share-state";

describe("share fragments", () => {
  test("round-trips Unicode Markdown", () => {
    const markdown = "# नमस्ते 🌍\n\nA private fragment.";
    expect(readShareFragment(createShareFragment(markdown))).toBe(markdown);
  });

  test("rejects malformed and excessively large fragments", () => {
    expect(() => readShareFragment("#v1:not-valid-compressed-data")).toThrow();
    expect(() => readShareFragment(`#v1:${"a".repeat(SHARE_FRAGMENT_LIMIT)}`)).toThrow();
  });
});
