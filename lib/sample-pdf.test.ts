import { describe, expect, test } from "vitest";
import { createSamplePdfFile, samplePdfLines } from "@/lib/sample-pdf";

type PdfTextItem = { str?: string };

type LoadedPdf = {
  getPage: (pageNumber: number) => Promise<{
    getTextContent: () => Promise<{ items: PdfTextItem[] }>;
  }>;
  getMetadata: () => Promise<{ info?: { Title?: string } }>;
};

describe("sample PDF", () => {
  test("embeds a title and extractable text for the local converter", async () => {
    const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as {
      getDocument: (params: { data: Uint8Array; disableWorker: boolean }) => { promise: Promise<LoadedPdf> };
    };
    const file = createSamplePdfFile();
    const document = await pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      disableWorker: true,
    }).promise;

    const page = await document.getPage(1);
    const text = await page.getTextContent();
    const extracted = text.items.map((item) => item.str ?? "").join("\n");
    for (const line of samplePdfLines) expect(extracted).toContain(line);
    const metadata = await document.getMetadata();
    expect(metadata.info?.Title).toBe("Sample handbook");
  });
});
