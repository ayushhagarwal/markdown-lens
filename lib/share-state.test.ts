import { describe, expect, test } from "vitest";
import {
  createShareFragment,
  readShareFragment,
  SHARE_FRAGMENT_LIMIT,
  SHARE_MARKDOWN_LIMIT,
} from "@/lib/share-state";

describe("share fragments", () => {
  test("round-trips Unicode Markdown", () => {
    const markdown = "# नमस्ते 🌍\n\nA private fragment.";
    expect(readShareFragment(createShareFragment(markdown))).toBe(markdown);
  });

  test("rejects malformed and excessively large fragments", () => {
    expect(() => readShareFragment("#v1:not-valid-compressed-data")).toThrow();
    expect(() => readShareFragment(`#v1:${"a".repeat(SHARE_FRAGMENT_LIMIT)}`)).toThrow();
    expect(() => createShareFragment("a".repeat(SHARE_MARKDOWN_LIMIT + 1))).toThrow();
  });

  test("rejects unsupported share-link versions without treating ordinary anchors as errors", () => {
    expect(() => readShareFragment("#v2:payload")).toThrow("version is not supported");
    expect(readShareFragment("#document-heading")).toBeNull();
  });
});
