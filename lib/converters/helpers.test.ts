import { File as NodeFile } from "node:buffer";
import { describe, expect, test } from "vitest";
import { ConverterError } from "@/lib/converters/error";
import {
  assertFileAllowed,
  escapeTableCell,
  extensionOf,
  matchesFile,
  matrixToMarkdown,
  titleFromFile,
} from "@/lib/converters/helpers";
import { DEFAULT_CONVERSION_LIMITS } from "@/lib/converters/types";

function file(parts: string[], name: string, type = "") {
  return new NodeFile(parts, name, { type }) as unknown as File;
}

describe("converter input helpers", () => {
  test("normalizes filenames and matches extensions or MIME types", () => {
    const markdown = file(["# Guide"], "Release.NOTES.MD", "application/octet-stream");
    expect(extensionOf(markdown.name)).toBe("md");
    expect(titleFromFile(markdown)).toBe("Release.NOTES");
    expect(matchesFile(markdown, ["md"], ["text/markdown"])).toBe(true);
    expect(matchesFile(file(["x"], "blob", "application/json"), ["json"], ["application/json"])).toBe(true);
    expect(matchesFile(file(["x"], "unknown.bin"), ["md"], ["text/markdown"])).toBe(false);
  });

  test("rejects oversized and cancelled conversion inputs with stable diagnostics", () => {
    const oversized = file(["12345"], "large.md", "text/markdown");
    const limits = { ...DEFAULT_CONVERSION_LIMITS, maxFileBytes: 4 };
    expect(() =>
      assertFileAllowed(oversized, {
        signal: new AbortController().signal,
        onProgress: () => undefined,
        limits,
      }),
    ).toThrowError(ConverterError);
    expect(() =>
      assertFileAllowed(oversized, {
        signal: AbortSignal.abort(),
        onProgress: () => undefined,
        limits: DEFAULT_CONVERSION_LIMITS,
      }),
    ).toThrow("cancelled");
  });

  test("escapes cells and pads ragged rows into deterministic GFM tables", () => {
    expect(escapeTableCell("one | two\nthree")).toBe("one \\| two<br>three");
    expect(
      matrixToMarkdown([
        ["Name", "Note"],
        ["Ada", "one | two"],
        ["Lin"],
      ]),
    ).toBe(
      [
        "| Name | Note |",
        "| --- | --- |",
        "| Ada | one \\| two |",
        "| Lin |  |",
      ].join("\n"),
    );
  });
});
