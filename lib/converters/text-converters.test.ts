import { describe, expect, test } from "vitest";
import { File as NodeFile } from "node:buffer";
import {
  csvConverter,
  htmlConverter,
  jsonConverter,
  xmlConverter,
} from "@/lib/converters/text-converters";
import { DEFAULT_CONVERSION_LIMITS } from "@/lib/converters/types";

const context = {
  signal: new AbortController().signal,
  onProgress: () => undefined,
  limits: DEFAULT_CONVERSION_LIMITS,
};

function file(parts: string[], name: string, type: string) {
  return new NodeFile(parts, name, { type }) as unknown as File;
}

describe("structured text converters", () => {
  test("converts quoted CSV into a GFM table", async () => {
    const result = await csvConverter.convert(
      file(['Name,Note\nAda,"Uses, commas"'], "people.csv", "text/csv"),
      {},
      context,
    );
    expect(result.markdown).toContain("| Name | Note |");
    expect(result.markdown).toContain("| Ada | Uses, commas |");
  });

  test("formats JSON without flattening its structure", async () => {
    const result = await jsonConverter.convert(
      file(['{"ready":true,"items":[1,2]}'], "state.json", "application/json"),
      {},
      context,
    );
    expect(result.markdown).toContain("```json");
    expect(result.markdown).toContain('"ready": true');
  });

  test("removes executable HTML while preserving document content", async () => {
    const result = await htmlConverter.convert(
      file(["<title>Guide</title><h1>Guide</h1><script>alert(1)</script><p>Safe.</p>"], "guide.html", "text/html"),
      {},
      context,
    );
    expect(result.markdown).toContain("# Guide");
    expect(result.markdown).toContain("Safe.");
    expect(result.markdown).not.toContain("alert(1)");
  });

  test("escapes an HTML title before using it as a generated heading", async () => {
    const result = await htmlConverter.convert(
      file(
        ["<title>![opened](https://attacker.invalid/pixel)</title><p>Safe.</p>"],
        "guide.html",
        "text/html",
      ),
      {},
      context,
    );
    expect(result.markdown).toContain(
      "# \\!\\[opened\\]\\(https://attacker.invalid/pixel\\)",
    );
    expect(result.markdown).not.toContain("# ![opened](");
  });

  test("uses a fence longer than backtick runs preserved from XML", async () => {
    const result = await xmlConverter.convert(
      file(
        ["<root><![CDATA[\n```\n![opened](https://attacker.invalid/pixel)\n]]></root>"],
        "payload.xml",
        "application/xml",
      ),
      {},
      context,
    );
    expect(result.markdown).toContain("````xml\n");
    expect(result.markdown.trim().endsWith("````")).toBe(true);
  });
});
