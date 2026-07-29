import { File as NodeFile } from "node:buffer";
import { strToU8, zipSync } from "fflate";
import { expect, test } from "vitest";
import { importWordAsMarkdown } from "@/lib/word-import";
import { DEFAULT_CONVERSION_LIMITS } from "@/lib/converters/types";

test("rejects DOCX package expansion before Mammoth parses the document", async () => {
  const bytes = zipSync(
    {
      "[Content_Types].xml": strToU8("<Types />"),
      "word/document.xml": strToU8(`<document>${"A".repeat(2_000)}</document>`),
    },
    { level: 9 },
  );
  const file = new NodeFile([bytes], "dense.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  }) as unknown as File;

  await expect(
    importWordAsMarkdown(file, () => undefined, {
      ...DEFAULT_CONVERSION_LIMITS,
      maxArchiveEntryBytes: 100,
      maxExpandedBytes: 100,
    }),
  ).rejects.toThrow("per-entry expansion limit");
});
