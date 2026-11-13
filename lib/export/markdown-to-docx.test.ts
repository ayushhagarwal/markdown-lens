import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { DOCX_MIME_TYPE, buildDocxParts, escapeXml, markdownToDocx, readImageSize } from "@/lib/export/markdown-to-docx";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

// 2x1 transparent PNG.
const PNG = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAC0lEQVR4nGNgQAcAAA4AAWHVO+4AAAAASUVORK5CYII="),
  (character) => character.charCodeAt(0),
);

const SAMPLE = `# Project &lt;Notes&gt; & "Plans" <span>raw</span>

Intro with **bold**, *italic*, ~~gone~~, \`code\` and a [link](https://example.com/a?b=1&c=2).
Second line\\
after a hard break. See [the setup](#setup-guide) section.

## Setup guide

> Quoted **text**
> > nested quote

- one
- two
  1. nested ordered
  2. again
- [x] done task
- [ ] open task

3. three
4. four

\`\`\`ts
const a = 1;
	indented();
\`\`\`

| Left | Center | Right |
| :--- | :----: | ----: |
| a | b | c |
| **d** | e | f |

---

![Diagram](assets/diagram.png)

![Missing](assets/missing.png)

Footnote here[^1].

$$
x^2
$$

\`\`\`mermaid
graph TD; A-->B;
\`\`\`

[^1]: The note text.
`;

function parts(markdown = SAMPLE) {
  return buildDocxParts(markdown, {
    title: "Sample & <Title>",
    now: new Date("2026-01-02T03:04:05.678Z"),
    images: { "assets/diagram.png": { data: PNG, mimeType: "image/png" } },
  });
}

function xml(partsMap: Record<string, Uint8Array>, path: string) {
  const text = strFromU8(partsMap[path]);
  const doc = new DOMParser().parseFromString(text, "application/xml");
  expect(doc.getElementsByTagName("parsererror"), `${path} is well-formed`).toHaveLength(0);
  return doc;
}

const textOf = (doc: Document) => Array.from(doc.getElementsByTagNameNS(W, "t"), (node) => node.textContent).join("");

describe("markdownToDocx", () => {
  it("produces a zip with every required part, all well-formed", async () => {
    const blob = await markdownToDocx(SAMPLE, {
      title: "Sample",
      images: { "assets/diagram.png": { data: PNG, mimeType: "image/png" } },
    });
    expect(blob.type).toBe(DOCX_MIME_TYPE);
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const names = Object.keys(files);
    expect(names[0]).toBe("[Content_Types].xml");
    for (const required of [
      "[Content_Types].xml",
      "_rels/.rels",
      "word/document.xml",
      "word/styles.xml",
      "word/numbering.xml",
      "word/settings.xml",
      "word/_rels/document.xml.rels",
      "docProps/core.xml",
      "docProps/app.xml",
      "word/media/image1.png",
    ]) {
      expect(names).toContain(required);
    }
    for (const name of names.filter((entry) => entry.endsWith(".xml") || entry.endsWith(".rels"))) xml(files, name);
  });

  it("writes headings with Word heading styles and bookmarks for internal links", () => {
    const doc = xml(parts(), "word/document.xml");
    const styles = Array.from(doc.getElementsByTagNameNS(W, "pStyle"), (node) => node.getAttributeNS(W, "val"));
    expect(styles).toContain("Heading1");
    expect(styles).toContain("Heading2");
    expect(textOf(doc)).toContain('Project <Notes> & "Plans"');

    const bookmarks = Array.from(doc.getElementsByTagNameNS(W, "bookmarkStart"), (node) => node.getAttributeNS(W, "name"));
    const internal = Array.from(doc.getElementsByTagNameNS(W, "hyperlink")).find((link) => link.getAttributeNS(W, "anchor"));
    expect(internal?.getAttributeNS(W, "anchor")).toBe("_md_setup_guide");
    expect(bookmarks).toContain("_md_setup_guide");

    const styleDoc = xml(parts(), "word/styles.xml");
    const heading1 = Array.from(styleDoc.getElementsByTagNameNS(W, "style")).find((style) => style.getAttributeNS(W, "styleId") === "Heading1");
    expect(heading1?.getElementsByTagNameNS(W, "name")[0].getAttributeNS(W, "val")).toBe("heading 1");
    expect(heading1?.getElementsByTagNameNS(W, "outlineLvl")[0].getAttributeNS(W, "val")).toBe("0");
  });

  it("formats inline runs", () => {
    const doc = xml(parts(), "word/document.xml");
    const runs = Array.from(doc.getElementsByTagNameNS(W, "r"));
    const runFor = (text: string) => runs.find((run) => run.textContent === text);
    expect(runFor("bold")?.getElementsByTagNameNS(W, "b")).toHaveLength(1);
    expect(runFor("italic")?.getElementsByTagNameNS(W, "i")).toHaveLength(1);
    expect(runFor("gone")?.getElementsByTagNameNS(W, "strike")).toHaveLength(1);
    expect(runFor("code")?.getElementsByTagNameNS(W, "rStyle")[0].getAttributeNS(W, "val")).toBe("InlineCode");
    expect(runFor("1")?.getElementsByTagNameNS(W, "vertAlign")[0].getAttributeNS(W, "val")).toBe("superscript");
    // Hard break inside the paragraph.
    const breakParagraph = Array.from(doc.getElementsByTagNameNS(W, "p")).find((p) => p.textContent?.includes("Second line"));
    expect(breakParagraph?.getElementsByTagNameNS(W, "br").length).toBeGreaterThan(0);
  });

  it("creates external hyperlinks with relationships", () => {
    const all = parts();
    const doc = xml(all, "word/document.xml");
    const rels = xml(all, "word/_rels/document.xml.rels");
    const link = Array.from(doc.getElementsByTagNameNS(W, "hyperlink")).find((node) => node.getAttributeNS(R, "id"));
    expect(link?.textContent).toBe("link");
    const relId = link?.getAttributeNS(R, "id");
    const rel = Array.from(rels.getElementsByTagName("Relationship")).find((node) => node.getAttribute("Id") === relId);
    expect(rel?.getAttribute("Target")).toBe("https://example.com/a?b=1&c=2");
    expect(rel?.getAttribute("TargetMode")).toBe("External");
    expect(rel?.getAttribute("Type")).toMatch(/\/hyperlink$/);
    expect(link?.getElementsByTagNameNS(W, "rStyle")[0].getAttributeNS(W, "val")).toBe("Hyperlink");
  });

  it("writes real numbering definitions with restarts and nesting", () => {
    const all = parts();
    const doc = xml(all, "word/document.xml");
    const numbering = xml(all, "word/numbering.xml");
    const abstractFormats = Array.from(numbering.getElementsByTagNameNS(W, "abstractNum"), (node) =>
      node.getElementsByTagNameNS(W, "numFmt")[0].getAttributeNS(W, "val"),
    );
    expect(abstractFormats).toEqual(["bullet", "decimal"]);

    const numbered = Array.from(doc.getElementsByTagNameNS(W, "numPr"), (node) => ({
      text: node.parentElement?.parentElement?.textContent,
      level: node.getElementsByTagNameNS(W, "ilvl")[0].getAttributeNS(W, "val"),
      numId: node.getElementsByTagNameNS(W, "numId")[0].getAttributeNS(W, "val"),
    }));
    expect(numbered.find((item) => item.text === "nested ordered")?.level).toBe("1");
    expect(numbered.find((item) => item.text === "one")?.level).toBe("0");
    const indentOf = (text: string) =>
      Array.from(doc.getElementsByTagNameNS(W, "p"))
        .find((p) => p.textContent === text)
        ?.getElementsByTagNameNS(W, "ind")[0]
        .getAttributeNS(W, "left");
    expect(indentOf("one")).toBe("720");
    expect(indentOf("nested ordered")).toBe("1440");
    const threeNumId = numbered.find((item) => item.text === "three")?.numId;
    const num = Array.from(numbering.getElementsByTagNameNS(W, "num")).find((node) => node.getAttributeNS(W, "numId") === threeNumId);
    expect(num?.getElementsByTagNameNS(W, "abstractNumId")[0].getAttributeNS(W, "val")).toBe("1");
    expect(num?.getElementsByTagNameNS(W, "startOverride")[0].getAttributeNS(W, "val")).toBe("3");

    // Task items show a ballot box instead of a bullet.
    expect(textOf(doc)).toContain("☑ done task");
    expect(textOf(doc)).toContain("☐ open task");
    expect(numbered.find((item) => item.text?.includes("done task"))).toBeUndefined();
  });

  it("keeps code block lines, tabs and fallbacks for math and mermaid", () => {
    const doc = xml(parts(), "word/document.xml");
    const codeParagraphs = Array.from(doc.getElementsByTagNameNS(W, "p")).filter(
      (p) => p.getElementsByTagNameNS(W, "pStyle")[0]?.getAttributeNS(W, "val") === "CodeBlock",
    );
    expect(codeParagraphs).toHaveLength(3);
    expect(codeParagraphs[0].getElementsByTagNameNS(W, "br")).toHaveLength(1);
    expect(codeParagraphs[0].getElementsByTagNameNS(W, "tab")).toHaveLength(1);
    expect(codeParagraphs[1].textContent).toContain("x^2");
    expect(codeParagraphs[2].textContent).toBe("graph TD; A-->B;");
  });

  it("builds tables with a repeating header row and column alignment", () => {
    const doc = xml(parts(), "word/document.xml");
    const table = doc.getElementsByTagNameNS(W, "tbl")[0];
    expect(table.getElementsByTagNameNS(W, "gridCol")).toHaveLength(3);
    const rows = Array.from(table.getElementsByTagNameNS(W, "tr"));
    expect(rows).toHaveLength(3);
    expect(rows[0].getElementsByTagNameNS(W, "tblHeader")).toHaveLength(1);
    expect(rows[1].getElementsByTagNameNS(W, "tblHeader")).toHaveLength(0);
    const headerCells = Array.from(rows[0].getElementsByTagNameNS(W, "tc"));
    expect(headerCells[0].getElementsByTagNameNS(W, "b")).toHaveLength(1);
    expect(headerCells[0].getElementsByTagNameNS(W, "shd")).toHaveLength(1);
    const alignments = Array.from(rows[1].getElementsByTagNameNS(W, "tc"), (cell) =>
      cell.getElementsByTagNameNS(W, "jc")[0]?.getAttributeNS(W, "val") ?? "left",
    );
    expect(alignments).toEqual(["left", "center", "right"]);
    // A paragraph must follow the table before the next block or the section properties.
    expect(table.nextElementSibling?.localName).toBe("p");
  });

  it("embeds supplied images and falls back to alt text plus URL", () => {
    const all = parts();
    const doc = xml(all, "word/document.xml");
    const types = strFromU8(all["[Content_Types].xml"]);
    expect(types).toContain('<Default Extension="png" ContentType="image/png"/>');
    const blip = doc.getElementsByTagName("a:blip")[0];
    const rels = xml(all, "word/_rels/document.xml.rels");
    const rel = Array.from(rels.getElementsByTagName("Relationship")).find((node) => node.getAttribute("Id") === blip.getAttributeNS(R, "embed"));
    expect(rel?.getAttribute("Target")).toBe("media/image1.png");
    expect(doc.getElementsByTagName("wp:extent")[0].getAttribute("cx")).toBe(String(2 * 9525));
    expect(doc.getElementsByTagName("wp:docPr")[0].getAttribute("descr")).toBe("Diagram");
    expect(textOf(doc)).toContain("Missing (assets/missing.png)");
    expect(all["word/media/image1.png"]).toEqual(PNG);
  });

  it("scales large images to the text width", () => {
    const big = new Uint8Array(PNG);
    new DataView(big.buffer).setUint32(16, 4000);
    new DataView(big.buffer).setUint32(20, 2000);
    const all = buildDocxParts("![Big](big.png)", { title: "t", images: { "big.png": { data: big, mimeType: "image/png" } } });
    const extent = xml(all, "word/document.xml").getElementsByTagName("wp:extent")[0];
    expect(Number(extent.getAttribute("cx"))).toBe(9360 * 635);
    expect(Number(extent.getAttribute("cy"))).toBe(Math.round(2000 * 9525 * ((9360 * 635) / (4000 * 9525))));
  });

  it("puts footnotes in a notes section", () => {
    const doc = xml(parts(), "word/document.xml");
    const notes = Array.from(doc.getElementsByTagNameNS(W, "p")).filter(
      (p) => p.getElementsByTagNameNS(W, "pStyle")[0]?.getAttributeNS(W, "val") === "FootnoteText",
    );
    expect(notes).toHaveLength(1);
    expect(notes[0].textContent).toBe("1 The note text.");
  });

  it("stores the title in core properties", () => {
    const core = xml(parts(), "docProps/core.xml");
    expect(core.getElementsByTagName("dc:title")[0].textContent).toBe("Sample & <Title>");
    expect(core.getElementsByTagName("dcterms:created")[0].textContent).toBe("2026-01-02T03:04:05Z");
  });

  it("escapes XML and strips invalid characters", () => {
    expect(escapeXml("a<b>&\"c'\u0001\u0008￾\uD800")).toBe("a&lt;b&gt;&amp;&quot;c&apos;");
    const doc = xml(buildDocxParts("bad \u0001 char \u{1F600} <script>", { title: "\u0002t" }), "word/document.xml");
    expect(textOf(doc)).toBe("bad  char \u{1F600} ");
  });

  it("handles an empty document and a trailing table", () => {
    const empty = xml(buildDocxParts("", { title: "Empty" }), "word/document.xml");
    expect(empty.getElementsByTagNameNS(W, "p")).toHaveLength(1);
    const tables = xml(buildDocxParts("| a |\n| - |\n| b |\n\n| c |\n| - |\n| d |", { title: "T" }), "word/document.xml");
    const body = tables.getElementsByTagNameNS(W, "body")[0];
    expect(Array.from(body.children, (child) => child.localName)).toEqual(["tbl", "p", "tbl", "p", "sectPr"]);
  });

  it("uses A4 page geometry when asked", () => {
    const doc = xml(buildDocxParts("x", { title: "t", pageSize: "a4" }), "word/document.xml");
    expect(doc.getElementsByTagNameNS(W, "pgSz")[0].getAttributeNS(W, "w")).toBe("11906");
  });
});

describe("readImageSize", () => {
  it("reads GIF and JPEG headers", () => {
    const gif = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x0a, 0x00, 0x05, 0x00]);
    expect(readImageSize(gif, "gif")).toEqual({ width: 10, height: 5 });
    const jpeg = Uint8Array.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x20, 0x00, 0x40, 0x03, 0, 0, 0, 0,
    ]);
    expect(readImageSize(jpeg, "jpeg")).toEqual({ width: 64, height: 32 });
  });
});
