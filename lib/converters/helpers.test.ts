import { File as NodeFile } from "node:buffer";
import { describe, expect, test } from "vitest";
import { ConverterError } from "@/lib/converters/error";
import {
  assertFileAllowed,
  escapeMarkdownText,
  escapeTableCell,
  extensionOf,
  fencedCodeBlock,
  markdownHeading,
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

  test("escapes untrusted inline Markdown and chooses a non-conflicting code fence", () => {
    expect(escapeMarkdownText("![opened](https://attacker.invalid/pixel)")).toBe(
      "\\!\\[opened\\]\\(https://attacker.invalid/pixel\\)",
    );
    expect(markdownHeading(2, "[Account](https://attacker.invalid)")).toBe(
      "## \\[Account\\]\\(https://attacker.invalid\\)",
    );

    const fenced = fencedCodeBlock(
      "xml",
      "<value><![CDATA[\n```\n![opened](https://attacker.invalid)\n]]></value>",
    );
    expect(fenced.startsWith("````xml\n")).toBe(true);
    expect(fenced.endsWith("\n````")).toBe(true);
  });
});
