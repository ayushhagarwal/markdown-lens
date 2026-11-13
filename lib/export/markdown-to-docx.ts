import GithubSlugger from "github-slugger";
import { toString } from "mdast-util-to-string";
import type {
  Definition,
  FootnoteDefinition,
  List,
  ListItem,
  Nodes,
  PhrasingContent,
  Root,
  RootContent,
  Table,
} from "mdast";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";

export type DocxImage = {
  data: Uint8Array;
  mimeType: string;
  /** Intrinsic size in CSS pixels. Read from the image header when omitted. */
  width?: number;
  height?: number;
};

export type DocxPageSize = "letter" | "a4";

export type MarkdownToDocxOptions = {
  title: string;
  /** Image bytes keyed by the URL used in the Markdown, e.g. `assets/photo.png`. */
  images?: Record<string, DocxImage>;
  author?: string;
  pageSize?: DocxPageSize;
  /** Timestamp for the core properties; defaults to now. */
  now?: Date;
};

export const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function markdownToDocx(markdown: string, options: MarkdownToDocxOptions): Promise<Blob> {
  const parts = buildDocxParts(markdown, options);
  const { zipSync } = await import("fflate");
  const entries: Record<string, [Uint8Array, { level: 0 | 6 }]> = {};
  for (const [path, data] of Object.entries(parts)) {
    entries[path] = [data, { level: path.startsWith("word/media/") ? 0 : 6 }];
  }
  const zipped = zipSync(entries);
  return new Blob([zipped as Uint8Array<ArrayBuffer>], { type: DOCX_MIME_TYPE });
}

/** Builds every OOXML part as bytes, keyed by zip path. Exposed for tests. */
export function buildDocxParts(markdown: string, options: MarkdownToDocxOptions): Record<string, Uint8Array> {
  const tree = unified().use(remarkParse).use(remarkGfm).use(remarkMath).parse(markdown) as Root;
  const page = PAGE_SIZES[options.pageSize ?? "letter"];
  const writer = new DocxWriter(tree, options.images ?? {}, page);
  const body = writer.render();
  const encoder = new TextEncoder();
  const text = (value: string) => encoder.encode(value);

  const parts: Record<string, Uint8Array> = {
    "[Content_Types].xml": text(contentTypesXml(writer.media)),
    "_rels/.rels": text(ROOT_RELS),
    "docProps/core.xml": text(coreXml(options)),
    "docProps/app.xml": text(APP_XML),
    "word/document.xml": text(documentXml(body, page)),
    "word/styles.xml": text(STYLES_XML),
    "word/numbering.xml": text(writer.numberingXml()),
    "word/settings.xml": text(SETTINGS_XML),
    "word/_rels/document.xml.rels": text(writer.relationshipsXml()),
  };
  for (const media of writer.media) parts[`word/media/${media.fileName}`] = media.data;
  return parts;
}

// ---------------------------------------------------------------------------
// XML helpers

const INVALID_XML_CHARACTERS = /[^\u0009\u000A\u000D -퟿-�\u{10000}-\u{10FFFF}]/gu;

/** Escapes text for XML 1.0 and removes characters XML cannot represent. */
export function escapeXml(value: string) {
  return value.replace(INVALID_XML_CHARACTERS, "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] ?? character,
  );
}

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

const NS = {
  w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
  r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
  a: "http://schemas.openxmlformats.org/drawingml/2006/main",
  pic: "http://schemas.openxmlformats.org/drawingml/2006/picture",
  rels: "http://schemas.openxmlformats.org/package/2006/relationships",
  officeRel: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
};

// ---------------------------------------------------------------------------
// Page geometry (twips; 1 inch = 1440 twips, 1 twip = 635 EMU)

type PageGeometry = { width: number; height: number; margin: number };

const PAGE_SIZES: Record<DocxPageSize, PageGeometry> = {
  letter: { width: 12240, height: 15840, margin: 1440 },
  a4: { width: 11906, height: 16838, margin: 1440 },
};

const EMU_PER_TWIP = 635;
const EMU_PER_PIXEL = 9525;
const LIST_INDENT = 720;
const LIST_HANGING = 360;
const QUOTE_INDENT = 360;

// ---------------------------------------------------------------------------
// Writer

type InlineFormat = {
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  code?: boolean;
  superscript?: boolean;
  link?: boolean;
};

type BlockContext = {
  /** Extra left indent in twips (blockquotes, list continuation). */
  indent: number;
  quoteDepth: number;
  listDepth: number;
  /** Paragraph style for plain paragraphs in this context. */
  paragraphStyle?: string;
};

type MediaPart = { fileName: string; contentType: string; extension: string; data: Uint8Array };

type Relationship = { id: string; type: string; target: string; external?: boolean };

type NumberingInstance = { numId: number; abstractNumId: number; level: number; start: number };

const BULLET_ABSTRACT_ID = 0;
const DECIMAL_ABSTRACT_ID = 1;
const ROOT_CONTEXT: BlockContext = { indent: 0, quoteDepth: 0, listDepth: 0 };

class DocxWriter {
  readonly media: MediaPart[] = [];
  private readonly relationships: Relationship[] = [
    { id: "rId1", type: `${NS.officeRel}/styles`, target: "styles.xml" },
    { id: "rId2", type: `${NS.officeRel}/numbering`, target: "numbering.xml" },
    { id: "rId3", type: `${NS.officeRel}/settings`, target: "settings.xml" },
  ];
  private readonly hyperlinkIds = new Map<string, string>();
  private readonly imageIds = new Map<string, { relId: string; size: { width: number; height: number } } | null>();
  private readonly numbering: NumberingInstance[] = [];
  private readonly definitions = new Map<string, Definition>();
  private readonly footnoteDefinitions = new Map<string, FootnoteDefinition>();
  private readonly footnoteOrder: string[] = [];
  private readonly headingBookmarks = new Map<string, string>();
  private bookmarkId = 0;
  private drawingId = 0;

  constructor(
    private readonly tree: Root,
    private readonly images: Record<string, DocxImage>,
    private readonly page: PageGeometry,
  ) {
    collectDefinitions(tree, this.definitions, this.footnoteDefinitions);
    this.planHeadingBookmarks();
  }

  render() {
    const blocks = this.tree.children.filter((node) => node.type !== "definition" && node.type !== "footnoteDefinition");
    let xml = this.blocks(blocks, ROOT_CONTEXT);
    xml += this.footnotesSection();
    // Word needs a paragraph between adjacent tables and before the section properties.
    if (!xml || xml.endsWith("</w:tbl>")) xml += "<w:p/>";
    return xml;
  }

  // -- Relationships -------------------------------------------------------

  private addRelationship(type: string, target: string, external = false) {
    const id = `rId${this.relationships.length + 1}`;
    this.relationships.push({ id, type, target, external });
    return id;
  }

  relationshipsXml() {
    const items = this.relationships
      .map(
        (rel) =>
          `<Relationship Id="${rel.id}" Type="${rel.type}" Target="${escapeXml(rel.target)}"${rel.external ? ' TargetMode="External"' : ""}/>`,
      )
      .join("");
    return `${XML_HEADER}<Relationships xmlns="${NS.rels}">${items}</Relationships>`;
  }

  private hyperlinkRelationship(url: string) {
    let id = this.hyperlinkIds.get(url);
    if (!id) {
      id = this.addRelationship(`${NS.officeRel}/hyperlink`, url, true);
      this.hyperlinkIds.set(url, id);
    }
    return id;
  }

  // -- Numbering -----------------------------------------------------------

  private createNumbering(ordered: boolean, level: number, start: number) {
    const numId = this.numbering.length + 1;
    this.numbering.push({ numId, abstractNumId: ordered ? DECIMAL_ABSTRACT_ID : BULLET_ABSTRACT_ID, level, start });
    return numId;
  }

  numberingXml() {
    const bullets = ["•", "◦", "▪"];
    const decimalFormats = ["decimal", "lowerLetter", "lowerRoman"];
    const level = (index: number, format: string, text: string) =>
      `<w:lvl w:ilvl="${index}"><w:start w:val="1"/><w:numFmt w:val="${format}"/><w:lvlText w:val="${escapeXml(text)}"/><w:lvlJc w:val="left"/>` +
      `<w:pPr><w:ind w:left="${LIST_INDENT * (index + 1)}" w:hanging="${LIST_HANGING}"/></w:pPr></w:lvl>`;
    const bulletLevels = Array.from({ length: 9 }, (_, index) => level(index, "bullet", bullets[index % bullets.length]));
    const decimalLevels = Array.from({ length: 9 }, (_, index) =>
      level(index, decimalFormats[index % decimalFormats.length], `%${index + 1}.`),
    );
    const abstracts =
      `<w:abstractNum w:abstractNumId="${BULLET_ABSTRACT_ID}"><w:multiLevelType w:val="hybridMultilevel"/>${bulletLevels.join("")}</w:abstractNum>` +
      `<w:abstractNum w:abstractNumId="${DECIMAL_ABSTRACT_ID}"><w:multiLevelType w:val="hybridMultilevel"/>${decimalLevels.join("")}</w:abstractNum>`;
    const instances = this.numbering
      .map(
        (num) =>
          `<w:num w:numId="${num.numId}"><w:abstractNumId w:val="${num.abstractNumId}"/>` +
          `<w:lvlOverride w:ilvl="${num.level}"><w:startOverride w:val="${num.start}"/></w:lvlOverride></w:num>`,
      )
      .join("");
    return `${XML_HEADER}<w:numbering xmlns:w="${NS.w}">${abstracts}${instances}</w:numbering>`;
  }

  // -- Headings and bookmarks ----------------------------------------------

  private planHeadingBookmarks() {
    const slugger = new GithubSlugger();
    const used = new Set<string>();
    for (const node of this.tree.children) {
      if (node.type !== "heading") continue;
      const slug = slugger.slug(toString(node).trim());
      const base = `_md_${slug.replace(/[^A-Za-z0-9]/g, "_")}`.slice(0, 36);
      let name = base;
      let suffix = 2;
      while (used.has(name.toLowerCase())) name = `${base}_${suffix++}`;
      used.add(name.toLowerCase());
      if (!this.headingBookmarks.has(slug)) this.headingBookmarks.set(slug, name);
      bookmarkFor.set(node, name);
    }
  }

  // -- Blocks --------------------------------------------------------------

  private blocks(nodes: readonly RootContent[], context: BlockContext): string {
    let xml = "";
    for (const node of nodes) {
      const next = this.block(node, context);
      if (!next) continue;
      if (xml.endsWith("</w:tbl>") && next.startsWith("<w:tbl>")) xml += "<w:p/>";
      xml += next;
    }
    return xml;
  }

  private block(node: RootContent, context: BlockContext): string {
    switch (node.type) {
      case "heading": {
        const name = bookmarkFor.get(node);
        const id = this.bookmarkId++;
        const runs = this.inlines(node.children, {});
        const bookmark = name ? `<w:bookmarkStart w:id="${id}" w:name="${name}"/>${runs}<w:bookmarkEnd w:id="${id}"/>` : runs;
        return paragraph(bookmark, { style: `Heading${node.depth}`, ...this.containerProps(context) });
      }
      case "paragraph": {
        const standaloneImage = this.standaloneImage(node.children);
        return paragraph(standaloneImage ?? this.inlines(node.children, {}), {
          style: context.paragraphStyle,
          ...this.containerProps(context),
        });
      }
      case "blockquote":
        return this.blocks(node.children, {
          ...context,
          indent: context.indent + QUOTE_INDENT,
          quoteDepth: context.quoteDepth + 1,
          paragraphStyle: "Quote",
        });
      case "list":
        return this.list(node, context);
      case "code":
        return this.codeBlock(node.value, context);
      case "math":
        return this.codeBlock(`$$\n${node.value}\n$$`, context);
      case "table":
        return this.table(node, context);
      case "thematicBreak":
        return paragraph("", { border: "bottom", ...this.containerProps(context) });
      case "html": {
        const text = htmlToText(node.value);
        return text ? paragraph(textRun(text, {}), { style: context.paragraphStyle, ...this.containerProps(context) }) : "";
      }
      case "definition":
      case "footnoteDefinition":
        return "";
      default:
        if ("children" in node) return this.blocks(node.children as RootContent[], context);
        return "value" in node && typeof node.value === "string"
          ? paragraph(textRun(node.value, {}), this.containerProps(context))
          : "";
    }
  }

  private containerProps(context: BlockContext): ParagraphProps {
    return {
      indent: context.indent ? { left: context.indent } : undefined,
      border: context.quoteDepth ? "left" : undefined,
    };
  }

  private codeBlock(value: string, context: BlockContext) {
    const runs = value
      .split(/\r?\n/)
      .map((line, index) => `${index ? "<w:r><w:br/></w:r>" : ""}${textRun(line, {})}`)
      .join("");
    return paragraph(runs, { style: "CodeBlock", ...this.containerProps(context) });
  }

  private list(node: List, context: BlockContext): string {
    const level = Math.min(context.listDepth, 8);
    const ordered = Boolean(node.ordered);
    const numId = this.createNumbering(ordered, level, ordered ? (node.start ?? 1) : 1);
    const textIndent = context.indent + LIST_INDENT;
    return node.children.map((item) => this.listItem(item, context, { numId, level, textIndent })).join("");
  }

  private listItem(
    item: ListItem,
    context: BlockContext,
    { numId, level, textIndent }: { numId: number; level: number; textIndent: number },
  ) {
    const isTask = typeof item.checked === "boolean";
    const prefix = isTask ? textRun(item.checked ? "☑ " : "☐ ", {}) : "";
    const [first, ...rest] = item.children;
    const childContext: BlockContext = {
      indent: textIndent,
      quoteDepth: context.quoteDepth,
      listDepth: context.listDepth + 1,
      paragraphStyle: context.quoteDepth ? "Quote" : "ListParagraph",
    };
    const firstProps: ParagraphProps = {
      style: "ListParagraph",
      border: context.quoteDepth ? "left" : undefined,
      // Task items keep the indentation but drop the bullet glyph.
      numbering: isTask ? undefined : { numId, level },
      indent: isTask ? { left: textIndent } : { left: textIndent, hanging: LIST_HANGING },
    };
    let xml: string;
    let remaining = rest;
    if (first?.type === "paragraph") {
      xml = paragraph(prefix + this.inlines(first.children, {}), firstProps);
    } else {
      xml = paragraph(prefix, firstProps);
      remaining = item.children;
    }
    return xml + this.blocks(remaining, childContext);
  }

  private table(node: Table, context: BlockContext) {
    const columnCount = Math.max(1, ...node.children.map((row) => row.children.length));
    const available = this.page.width - this.page.margin * 2 - context.indent;
    const columnWidth = Math.floor(available / columnCount);
    const border = '<w:top w:val="single" w:sz="4" w:space="0" w:color="D0D7DE"/><w:left w:val="single" w:sz="4" w:space="0" w:color="D0D7DE"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="D0D7DE"/><w:right w:val="single" w:sz="4" w:space="0" w:color="D0D7DE"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="D0D7DE"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="D0D7DE"/>';
    const tblPr =
      `<w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="${columnWidth * columnCount}" w:type="dxa"/>` +
      (context.indent ? `<w:tblInd w:w="${context.indent}" w:type="dxa"/>` : "") +
      `<w:tblBorders>${border}</w:tblBorders><w:tblLayout w:type="fixed"/>` +
      `<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>`;
    const grid = `<w:tblGrid>${`<w:gridCol w:w="${columnWidth}"/>`.repeat(columnCount)}</w:tblGrid>`;
    const rows = node.children
      .map((row, rowIndex) => {
        const header = rowIndex === 0;
        const cells = Array.from({ length: columnCount }, (_, columnIndex) => {
          const cell = row.children[columnIndex];
          const align = node.align?.[columnIndex];
          const shading = header ? '<w:shd w:val="clear" w:color="auto" w:fill="F2F4F7"/>' : "";
          const runs = cell ? this.inlines(cell.children, header ? { bold: true } : {}) : "";
          const jc = align === "center" ? "center" : align === "right" ? "right" : undefined;
          return `<w:tc><w:tcPr><w:tcW w:w="${columnWidth}" w:type="dxa"/>${shading}</w:tcPr>${paragraph(runs, { style: "TableText", align: jc })}</w:tc>`;
        }).join("");
        const trPr = header ? "<w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>" : "<w:trPr><w:cantSplit/></w:trPr>";
        return `<w:tr>${trPr}${cells}</w:tr>`;
      })
      .join("");
    return `<w:tbl>${tblPr}${grid}${rows}</w:tbl>`;
  }

  private footnotesSection() {
    if (!this.footnoteOrder.length) return "";
    let xml = paragraph("", { border: "bottom" });
    // New footnote references may be discovered while rendering notes.
    for (let index = 0; index < this.footnoteOrder.length; index += 1) {
      const definition = this.footnoteDefinitions.get(this.footnoteOrder[index]);
      if (!definition) continue;
      const marker = textRun(String(index + 1), { superscript: true }) + textRun(" ", {});
      const [first, ...rest] = definition.children;
      const noteContext: BlockContext = { ...ROOT_CONTEXT, indent: LIST_HANGING, paragraphStyle: "FootnoteText" };
      if (first?.type === "paragraph") {
        xml += paragraph(marker + this.inlines(first.children, {}), { style: "FootnoteText" });
        xml += this.blocks(rest, noteContext);
      } else {
        xml += paragraph(marker, { style: "FootnoteText" }) + this.blocks(definition.children, noteContext);
      }
    }
    return xml;
  }

  // -- Inlines -------------------------------------------------------------

  private inlines(nodes: readonly PhrasingContent[], format: InlineFormat): string {
    return nodes.map((node) => this.inline(node, format)).join("");
  }

  private inline(node: PhrasingContent | Nodes, format: InlineFormat): string {
    switch (node.type) {
      case "text":
        return textRun(node.value.replace(/\r?\n/g, " "), format);
      case "strong":
        return this.inlines(node.children, { ...format, bold: true });
      case "emphasis":
        return this.inlines(node.children, { ...format, italic: true });
      case "delete":
        return this.inlines(node.children, { ...format, strike: true });
      case "inlineCode":
        return textRun(node.value, { ...format, code: true });
      case "inlineMath":
        return textRun(`$${node.value}$`, { ...format, code: true });
      case "break":
        return "<w:r><w:br/></w:r>";
      case "link":
        return this.link(node.url, (linkFormat) => this.inlines(node.children, linkFormat), format);
      case "linkReference": {
        const definition = this.definitions.get(normalizeIdentifier(node.identifier));
        return definition
          ? this.link(definition.url, (linkFormat) => this.inlines(node.children, linkFormat), format)
          : this.inlines(node.children, format);
      }
      case "image":
        return this.image(node.url, node.alt ?? "", format);
      case "imageReference": {
        const definition = this.definitions.get(normalizeIdentifier(node.identifier));
        return definition ? this.image(definition.url, node.alt ?? "", format) : textRun(node.alt ?? "", format);
      }
      case "footnoteReference": {
        const identifier = normalizeIdentifier(node.identifier);
        if (!this.footnoteDefinitions.has(identifier)) return textRun(`[^${node.label ?? node.identifier}]`, format);
        let index = this.footnoteOrder.indexOf(identifier);
        if (index < 0) index = this.footnoteOrder.push(identifier) - 1;
        return textRun(String(index + 1), { ...format, superscript: true });
      }
      case "html": {
        if (/^<br\s*\/?>$/i.test(node.value.trim())) return "<w:r><w:br/></w:r>";
        const text = htmlToText(node.value);
        return text ? textRun(text, format) : "";
      }
      default:
        if ("children" in node) return this.inlines(node.children as PhrasingContent[], format);
        return "value" in node && typeof node.value === "string" ? textRun(node.value, format) : "";
    }
  }

  /** Wraps runs in a real hyperlink: external URLs get a relationship, `#slug` links target heading bookmarks. */
  private link(url: string, render: (format: InlineFormat) => string, format: InlineFormat) {
    const trimmed = url.trim();
    if (trimmed.startsWith("#")) {
      const anchor = this.headingBookmarks.get(safeDecode(trimmed.slice(1)));
      if (!anchor) return render(format);
      const runs = render({ ...format, link: true });
      return runs ? `<w:hyperlink w:anchor="${anchor}" w:history="1">${runs}</w:hyperlink>` : "";
    }
    if (!isExternalLink(trimmed)) return render(format);
    const runs = render({ ...format, link: true });
    return runs ? `<w:hyperlink r:id="${this.hyperlinkRelationship(trimmed)}" w:history="1">${runs}</w:hyperlink>` : "";
  }

  /** Renders a paragraph that only contains one image (plus whitespace) as that image. */
  private standaloneImage(children: readonly PhrasingContent[]) {
    const meaningful = children.filter((child) => !(child.type === "text" && !child.value.trim()));
    if (meaningful.length !== 1 || meaningful[0].type !== "image") return null;
    return this.image(meaningful[0].url, meaningful[0].alt ?? "", {});
  }

  private image(url: string, alt: string, format: InlineFormat) {
    const embedded = this.embedImage(url);
    if (!embedded) {
      const label = alt ? `${alt} ` : "";
      return (
        textRun(label, { ...format, italic: true }) +
        this.link(url, (linkFormat) => textRun(`(${url})`, linkFormat), format)
      );
    }
    const maxWidth = (this.page.width - this.page.margin * 2) * EMU_PER_TWIP;
    const maxHeight = (this.page.height - this.page.margin * 2) * EMU_PER_TWIP * 0.9;
    let width = embedded.size.width * EMU_PER_PIXEL;
    let height = embedded.size.height * EMU_PER_PIXEL;
    const scale = Math.min(1, maxWidth / width, maxHeight / height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
    const id = ++this.drawingId;
    const description = escapeXml(alt);
    return (
      `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
      `<wp:extent cx="${width}" cy="${height}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>` +
      `<wp:docPr id="${id}" name="Picture ${id}" descr="${description}"/>` +
      `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="${NS.a}" noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
      `<a:graphic xmlns:a="${NS.a}"><a:graphicData uri="${NS.pic}"><pic:pic xmlns:pic="${NS.pic}">` +
      `<pic:nvPicPr><pic:cNvPr id="${id}" name="Picture ${id}" descr="${description}"/><pic:cNvPicPr/></pic:nvPicPr>` +
      `<pic:blipFill><a:blip r:embed="${embedded.relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
      `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
      `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`
    );
  }

  private embedImage(url: string) {
    if (this.imageIds.has(url)) return this.imageIds.get(url) ?? null;
    const image = this.images[url] ?? this.images[safeDecode(url)];
    const kind = image ? detectImageKind(image.data) : null;
    const intrinsic = image && kind ? readImageSize(image.data, kind.extension) : null;
    const size =
      image?.width && image.height ? { width: image.width, height: image.height } : intrinsic;
    if (!image || !kind || !size || size.width <= 0 || size.height <= 0) {
      this.imageIds.set(url, null);
      return null;
    }
    const fileName = `image${this.media.length + 1}.${kind.extension}`;
    this.media.push({ fileName, contentType: kind.contentType, extension: kind.extension, data: image.data });
    const relId = this.addRelationship(`${NS.officeRel}/image`, `media/${fileName}`);
    const result = { relId, size };
    this.imageIds.set(url, result);
    return result;
  }
}

const bookmarkFor = new WeakMap<object, string>();

// ---------------------------------------------------------------------------
// Paragraph and run builders (element order follows the OOXML schema)

type ParagraphProps = {
  style?: string;
  numbering?: { numId: number; level: number };
  border?: "left" | "bottom";
  indent?: { left: number; hanging?: number };
  align?: "center" | "right";
};

function paragraph(content: string, props: ParagraphProps) {
  let pPr = "";
  if (props.style) pPr += `<w:pStyle w:val="${props.style}"/>`;
  if (props.numbering) pPr += `<w:numPr><w:ilvl w:val="${props.numbering.level}"/><w:numId w:val="${props.numbering.numId}"/></w:numPr>`;
  if (props.border === "left") pPr += '<w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="1A7F67"/></w:pBdr>';
  if (props.border === "bottom") pPr += '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="D0D7DE"/></w:pBdr>';
  if (props.indent) {
    pPr += `<w:ind w:left="${props.indent.left}"${props.indent.hanging ? ` w:hanging="${props.indent.hanging}"` : ""}/>`;
  }
  if (props.align) pPr += `<w:jc w:val="${props.align}"/>`;
  return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}${content}</w:p>`;
}

function runProperties(format: InlineFormat) {
  let rPr = "";
  if (format.code) rPr += '<w:rStyle w:val="InlineCode"/>';
  else if (format.link) rPr += '<w:rStyle w:val="Hyperlink"/>';
  if (format.bold) rPr += "<w:b/><w:bCs/>";
  if (format.italic) rPr += "<w:i/><w:iCs/>";
  if (format.strike) rPr += "<w:strike/>";
  if (format.code && format.link) rPr += '<w:color w:val="0969DA"/><w:u w:val="single"/>';
  if (format.superscript) rPr += '<w:vertAlign w:val="superscript"/>';
  return rPr ? `<w:rPr>${rPr}</w:rPr>` : "";
}

function textRun(text: string, format: InlineFormat) {
  const clean = text.replace(INVALID_XML_CHARACTERS, "");
  if (!clean) return "";
  const rPr = runProperties(format);
  // Tabs must be <w:tab/> elements; everything else is literal text.
  return clean
    .split("\t")
    .map((segment, index) => `${index ? `<w:r>${rPr}<w:tab/></w:r>` : ""}${segment ? `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(segment)}</w:t></w:r>` : ""}`)
    .join("");
}

// ---------------------------------------------------------------------------
// Utilities

function collectDefinitions(
  node: Nodes,
  definitions: Map<string, Definition>,
  footnotes: Map<string, FootnoteDefinition>,
) {
  if (node.type === "definition") {
    const key = normalizeIdentifier(node.identifier);
    if (!definitions.has(key)) definitions.set(key, node);
  }
  if (node.type === "footnoteDefinition") {
    const key = normalizeIdentifier(node.identifier);
    if (!footnotes.has(key)) footnotes.set(key, node);
  }
  if ("children" in node) for (const child of node.children) collectDefinitions(child as Nodes, definitions, footnotes);
}

function normalizeIdentifier(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isExternalLink(url: string) {
  return /^(?:https?:\/\/|mailto:)/i.test(url.trim());
}

function htmlToText(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

type ImageKind = { extension: "png" | "jpeg" | "gif"; contentType: string };

/** Detects the format from magic bytes; the supplied MIME type is not trusted. */
function detectImageKind(data: Uint8Array): ImageKind | null {
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) return { extension: "png", contentType: "image/png" };
  if (data[0] === 0xff && data[1] === 0xd8) return { extension: "jpeg", contentType: "image/jpeg" };
  if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) return { extension: "gif", contentType: "image/gif" };
  return null;
}

/** Reads pixel dimensions from PNG, GIF and JPEG headers. */
export function readImageSize(data: Uint8Array, extension: string): { width: number; height: number } | null {
  if (extension === "png" && data.length >= 24) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (extension === "gif" && data.length >= 10) {
    return { width: data[6] | (data[7] << 8), height: data[8] | (data[9] << 8) };
  }
  if (extension === "jpeg") {
    let offset = 2;
    while (offset + 9 < data.length) {
      if (data[offset] !== 0xff) return null;
      const marker = data[offset + 1];
      if (marker === 0xff) {
        offset += 1;
        continue;
      }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }
      const length = (data[offset + 2] << 8) | data[offset + 3];
      const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) {
        return { height: (data[offset + 5] << 8) | data[offset + 6], width: (data[offset + 7] << 8) | data[offset + 8] };
      }
      offset += 2 + length;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Static parts

function contentTypesXml(media: readonly MediaPart[]) {
  const extensions = new Map(media.map((part) => [part.extension, part.contentType]));
  const mediaDefaults = Array.from(extensions, ([extension, type]) => `<Default Extension="${extension}" ContentType="${type}"/>`).join("");
  const main = "application/vnd.openxmlformats-officedocument.wordprocessingml";
  return (
    `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    mediaDefaults +
    `<Override PartName="/word/document.xml" ContentType="${main}.document.main+xml"/>` +
    `<Override PartName="/word/styles.xml" ContentType="${main}.styles+xml"/>` +
    `<Override PartName="/word/numbering.xml" ContentType="${main}.numbering+xml"/>` +
    `<Override PartName="/word/settings.xml" ContentType="${main}.settings+xml"/>` +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
    "</Types>"
  );
}

const ROOT_RELS =
  `${XML_HEADER}<Relationships xmlns="${NS.rels}">` +
  `<Relationship Id="rId1" Type="${NS.officeRel}/officeDocument" Target="word/document.xml"/>` +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
  `<Relationship Id="rId3" Type="${NS.officeRel}/extended-properties" Target="docProps/app.xml"/>` +
  "</Relationships>";

const APP_XML =
  `${XML_HEADER}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">` +
  "<Application>Markdown Lens</Application></Properties>";

function coreXml({ title, author, now = new Date() }: MarkdownToDocxOptions) {
  const timestamp = now.toISOString().replace(/\.\d{3}Z$/, "Z");
  return (
    `${XML_HEADER}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ` +
    'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
    'xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    `<dc:title>${escapeXml(title)}</dc:title>` +
    (author ? `<dc:creator>${escapeXml(author)}</dc:creator><cp:lastModifiedBy>${escapeXml(author)}</cp:lastModifiedBy>` : "") +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created>` +
    `<dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified>` +
    "</cp:coreProperties>"
  );
}

function documentXml(body: string, page: PageGeometry) {
  return (
    `${XML_HEADER}<w:document xmlns:w="${NS.w}" xmlns:r="${NS.r}" xmlns:wp="${NS.wp}" xmlns:a="${NS.a}" xmlns:pic="${NS.pic}">` +
    `<w:body>${body}<w:sectPr><w:pgSz w:w="${page.width}" w:h="${page.height}"/>` +
    `<w:pgMar w:top="${page.margin}" w:right="${page.margin}" w:bottom="${page.margin}" w:left="${page.margin}" w:header="720" w:footer="720" w:gutter="0"/>` +
    '<w:cols w:space="720"/></w:sectPr></w:body></w:document>'
  );
}

const SETTINGS_XML =
  `${XML_HEADER}<w:settings xmlns:w="${NS.w}"><w:zoom w:percent="100"/><w:defaultTabStop w:val="720"/>` +
  '<w:characterSpacingControl w:val="doNotCompress"/>' +
  '<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat>' +
  "</w:settings>";

const BODY_FONT = '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/>';
const CODE_FONT = '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:eastAsia="Consolas" w:cs="Consolas"/>';
const HEADING_SIZES = [36, 30, 26, 24, 22, 22];

function headingStyle(level: number) {
  const size = HEADING_SIZES[level - 1];
  const border = level <= 2 ? '<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="4" w:color="D8DEE4"/></w:pBdr>' : "";
  return (
    `<w:style w:type="paragraph" w:styleId="Heading${level}"><w:name w:val="heading ${level}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/>` +
    `<w:uiPriority w:val="9"/><w:qFormat/>` +
    `<w:pPr><w:keepNext/><w:keepLines/>${border}<w:spacing w:before="${level <= 2 ? 360 : 240}" w:after="120"/><w:outlineLvl w:val="${level - 1}"/></w:pPr>` +
    `<w:rPr><w:b/><w:bCs/>${level === 6 ? '<w:color w:val="57606A"/>' : '<w:color w:val="1F2328"/>'}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr></w:style>`
  );
}

const STYLES_XML =
  `${XML_HEADER}<w:styles xmlns:w="${NS.w}">` +
  `<w:docDefaults><w:rPrDefault><w:rPr>${BODY_FONT}<w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault>` +
  '<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
  '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:rPr><w:color w:val="1F2328"/></w:rPr></w:style>' +
  [1, 2, 3, 4, 5, 6].map(headingStyle).join("") +
  '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="10"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="48"/><w:szCs w:val="48"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="29"/><w:qFormat/>' +
  '<w:pPr><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="1A7F67"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="EEF8F4"/><w:ind w:left="360"/></w:pPr><w:rPr><w:color w:val="3D4752"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="34"/><w:qFormat/>' +
  '<w:pPr><w:spacing w:after="60"/><w:ind w:left="720"/><w:contextualSpacing/></w:pPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="CodeBlock"><w:name w:val="Code Block"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>' +
  '<w:pPr><w:keepLines/><w:pBdr><w:top w:val="single" w:sz="4" w:space="6" w:color="D0D7DE"/><w:left w:val="single" w:sz="4" w:space="6" w:color="D0D7DE"/><w:bottom w:val="single" w:sz="4" w:space="6" w:color="D0D7DE"/><w:right w:val="single" w:sz="4" w:space="6" w:color="D0D7DE"/></w:pBdr>' +
  '<w:shd w:val="clear" w:color="auto" w:fill="F6F8FA"/><w:spacing w:before="120" w:after="200" w:line="240" w:lineRule="auto"/><w:ind w:left="120" w:right="120"/></w:pPr>' +
  `<w:rPr>${CODE_FONT}<w:noProof/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:style>` +
  '<w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/></w:pPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="FootnoteText"><w:name w:val="footnote text"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:pPr><w:spacing w:after="60"/></w:pPr><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style>' +
  '<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/><w:unhideWhenUsed/></w:style>' +
  '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:basedOn w:val="DefaultParagraphFont"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:color w:val="0969DA"/><w:u w:val="single"/></w:rPr></w:style>' +
  `<w:style w:type="character" w:styleId="InlineCode"><w:name w:val="Inline Code"/><w:basedOn w:val="DefaultParagraphFont"/><w:qFormat/><w:rPr>${CODE_FONT}<w:noProof/><w:sz w:val="20"/><w:szCs w:val="20"/><w:shd w:val="clear" w:color="auto" w:fill="EFF1F3"/></w:rPr></w:style>` +
  '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/>' +
  '<w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>' +
  '<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/><w:uiPriority w:val="39"/>' +
  '<w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>' +
  '<w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="D0D7DE"/><w:left w:val="single" w:sz="4" w:space="0" w:color="D0D7DE"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="D0D7DE"/><w:right w:val="single" w:sz="4" w:space="0" w:color="D0D7DE"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="D0D7DE"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="D0D7DE"/></w:tblBorders>' +
  '<w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>' +
  "</w:styles>";
