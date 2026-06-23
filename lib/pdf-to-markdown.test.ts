import assert from "node:assert/strict";
import test from "node:test";
import {
  convertPdfPagesToMarkdown,
  groupPdfTextIntoLines,
  NoExtractablePdfTextError,
  type PdfPageInput,
  type PdfTextSpan,
} from "./pdf-to-markdown.ts";

function span(
  text: string,
  x: number,
  y: number,
  fontSize = 12,
  fontName = "Helvetica",
): PdfTextSpan {
  return {
    text,
    x,
    y,
    width: Math.max(text.length * fontSize * 0.5, 1),
    height: fontSize,
    fontSize,
    fontName,
  };
}

function page(pageNumber: number, spans: PdfTextSpan[], links: string[] = []): PdfPageInput {
  return { pageNumber, width: 600, height: 800, spans, links };
}

test("groups positioned spans into reading-order lines", () => {
  const lines = groupPdfTextIntoLines(
    page(1, [span("world", 70, 700), span("Hello", 10, 700), span("Next", 10, 680)]),
  );

  assert.deepEqual(
    lines.map((line) => line.text),
    ["Hello world", "Next"],
  );
});

test("infers headings, paragraphs, lists, code, links, and page separators", () => {
  const markdown = convertPdfPagesToMarkdown({
    title: "Team Guide",
    pages: [
      page(
        1,
        [
          span("Team Guide", 20, 750, 24),
          span("Introduction", 20, 710, 18),
          span("A wrapped para-", 20, 680),
          span("graph with https://example.com.", 20, 662),
          span("• First item", 20, 625),
          span("const answer = 42;", 20, 590, 11, "Courier"),
        ],
        ["https://linked.example"],
      ),
      page(2, [span("Second page text.", 20, 700)]),
    ],
  });

  assert.match(markdown, /^# Team Guide/m);
  assert.match(markdown, /### Introduction/m);
  assert.match(markdown, /A wrapped paragraph with <https:\/\/example\.com>\./);
  assert.match(markdown, /- First item/);
  assert.match(markdown, /```text\nconst answer = 42;\n```/);
  assert.match(markdown, /- <https:\/\/linked\.example>/);
  assert.match(markdown, /<!-- Page 1 -->[\s\S]*\n---\n[\s\S]*<!-- Page 2 -->/);
});

test("removes repeated margin text and standalone page numbers", () => {
  const repeated = "Internal documentation";
  const markdown = convertPdfPagesToMarkdown({
    title: "Export",
    pages: [
      page(1, [span(repeated, 20, 780), span("First page body has enough text.", 20, 700), span("1", 300, 20)]),
      page(2, [span(repeated, 20, 780), span("Second page body has enough text.", 20, 700), span("2", 300, 20)]),
    ],
  });

  assert.equal(markdown.includes(repeated), false);
  assert.equal(markdown.includes("\n1\n"), false);
  assert.equal(markdown.includes("\n2\n"), false);
});

test("keeps a placeholder for an image-only page when other pages contain text", () => {
  const markdown = convertPdfPagesToMarkdown({
    title: "Mixed PDF",
    pages: [page(1, [span("Readable text.", 20, 700)]), page(2, [])],
  });

  assert.match(markdown, /<!-- Page 2: no extractable text -->/);
});

test("rejects a fully scanned or empty PDF", () => {
  assert.throws(
    () => convertPdfPagesToMarkdown({ title: "Scan", pages: [page(1, []), page(2, [])] }),
    NoExtractablePdfTextError,
  );
});
