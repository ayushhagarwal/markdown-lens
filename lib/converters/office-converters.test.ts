import { File as NodeFile } from "node:buffer";
import { strToU8, zipSync } from "fflate";
import { describe, expect, test } from "vitest";
import { spreadsheetConverter } from "@/lib/converters/office-converters";
import { DEFAULT_CONVERSION_LIMITS } from "@/lib/converters/types";

const context = {
  signal: new AbortController().signal,
  onProgress: () => undefined,
  limits: DEFAULT_CONVERSION_LIMITS,
};

describe("Office converters", () => {
  test("converts a minimal XLSX worksheet without a vulnerable spreadsheet runtime", async () => {
    const bytes = zipSync({
      "xl/workbook.xml": strToU8(`
        <workbook xmlns:r="relationships"><sheets>
          <sheet name="Roadmap" sheetId="1" r:id="rId1" />
          <sheet name="Hidden" sheetId="2" state="hidden" r:id="rId2" />
        </sheets></workbook>`),
      "xl/_rels/workbook.xml.rels": strToU8(`
        <Relationships>
          <Relationship Id="rId1" Target="worksheets/sheet1.xml" />
          <Relationship Id="rId2" Target="worksheets/sheet2.xml" />
        </Relationships>`),
      "xl/sharedStrings.xml": strToU8(`<sst><si><t>Feature</t></si><si><t>Status</t></si><si><t>Workspace</t></si><si><t>Ready</t></si></sst>`),
      "xl/worksheets/sheet1.xml": strToU8(`<worksheet><sheetData>
        <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
        <row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="s"><v>3</v></c></row>
      </sheetData></worksheet>`),
      "xl/worksheets/sheet2.xml": strToU8(`<worksheet><sheetData><row><c r="A1"><v>secret</v></c></row></sheetData></worksheet>`),
    });
    const file = new NodeFile([bytes], "roadmap.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }) as unknown as File;

    const result = await spreadsheetConverter.convert(file, {}, context);
    expect(result.markdown).toContain("## Roadmap");
    expect(result.markdown).toContain("| Feature | Status |");
    expect(result.markdown).toContain("| Workspace | Ready |");
    expect(result.markdown).not.toContain("Hidden");
    expect(result.warnings).toContain("Hidden worksheets were excluded.");
  });
});
