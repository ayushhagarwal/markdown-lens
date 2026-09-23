import { describe, expect, test } from "vitest";
import { fileMatchesAccept, landingImportFor } from "@/lib/import-accept";

describe("import accept filters", () => {
  test("matches workspace documents by extension", () => {
    const accept = landingImportFor("/").accept;
    expect(fileMatchesAccept({ name: "Notes.PDF" }, accept)).toBe(true);
    expect(fileMatchesAccept({ name: "photo.JPEG" }, accept)).toBe(true);
    expect(fileMatchesAccept({ name: "archive.tar" }, accept)).toBe(false);
  });

  test("keeps converter pages limited to their format", () => {
    expect(fileMatchesAccept({ name: "handbook.pdf" }, landingImportFor("/pdf-to-markdown").accept)).toBe(true);
    expect(fileMatchesAccept({ name: "handbook.docx" }, landingImportFor("/pdf-to-markdown").accept)).toBe(false);
    expect(fileMatchesAccept({ name: "sheet.tsv" }, landingImportFor("/csv-to-markdown").accept)).toBe(true);
    expect(landingImportFor("/unknown").fileLabel).toBe("Choose a file to convert");
  });
});
