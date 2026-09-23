import { describe, expect, test } from "vitest";
import { conversionWarningLabel, documentFormatLabel } from "@/lib/document-format";

describe("document format labels", () => {
  test("uses the detected format, then the filename, then Markdown", () => {
    expect(documentFormatLabel({ detectedFormat: "pdf", name: "notes.docx" })).toBe("PDF");
    expect(documentFormatLabel({ name: "budget.xlsx" })).toBe("XLSX");
    expect(documentFormatLabel({ detectedFormat: "image/png" })).toBe("PNG");
    expect(documentFormatLabel({ detectedFormat: "image/gif" })).toBe("IMG");
    expect(documentFormatLabel()).toBe("MD");
  });

  test("phrases a single warning differently from several", () => {
    expect(conversionWarningLabel(1)).toBe("1 warning, review before you export");
    expect(conversionWarningLabel(3)).toBe("3 warnings, review before you export");
  });
});
