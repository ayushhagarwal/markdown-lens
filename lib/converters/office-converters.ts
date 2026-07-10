import { XMLParser } from "fast-xml-parser";
import { strFromU8, unzipSync } from "fflate";
import type { LocalConverter } from "@/lib/converters/types";
import { ConverterError, throwIfAborted } from "@/lib/converters/error";
import {
  assertFileAllowed,
  assertNonEmpty,
  baseResult,
  matchesFile,
  matrixToMarkdown,
  titleFromFile,
} from "@/lib/converters/helpers";
import { htmlToMarkdown } from "@/lib/converters/text-converters";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  trimValues: false,
});

export const spreadsheetConverter: LocalConverter = {
  id: "spreadsheet",
  label: "Excel workbook",
  extensions: ["xlsx"],
  mimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  canConvert(file, hints) {
    return matchesFile(file, this.extensions, this.mimeTypes, hints);
  },
  async convert(file, options, context) {
    assertFileAllowed(file, context);
    context.onProgress({ stage: "opening", message: `Opening workbook “${file.name}”…` });
    const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const workbook = parseXml(archive, "xl/workbook.xml")?.workbook;
    const relationships = asArray(parseXml(archive, "xl/_rels/workbook.xml.rels")?.Relationships?.Relationship);
    const relationTargets = new Map(relationships.map((relation) => [relation.Id, relation.Target]));
    const sharedStrings = readSharedStrings(archive);
    const sheets = asArray(workbook?.sheets?.sheet).filter(
      (sheet) => options.includeHiddenSheets || !sheet.state || sheet.state === "visible",
    );
    const sections: string[] = [];
    let totalRows = 0;

    for (let index = 0; index < sheets.length; index += 1) {
      throwIfAborted(context.signal);
      const sheet = sheets[index];
      context.onProgress({
        stage: "sheets",
        current: index + 1,
        total: sheets.length,
        message: `Converting sheet ${index + 1} of ${sheets.length}: ${sheet.name}`,
      });
      const relationshipTarget = relationTargets.get(sheet["r:id"]);
      if (!relationshipTarget) continue;
      const normalizedTarget = relationshipTarget.startsWith("/")
        ? relationshipTarget.slice(1)
        : `xl/${relationshipTarget.replace(/^\.\//, "")}`;
      const worksheet = parseXml(archive, normalizedTarget)?.worksheet;
      const rows = asArray(worksheet?.sheetData?.row).map((row) => rowToValues(row, sharedStrings));
      totalRows += rows.length;
      sections.push(`## ${sheet.name}\n\n${matrixToMarkdown(rows)}`);
    }

    const title = titleFromFile(file);
    const markdown = `# ${title}\n\n${sections.join("\n\n")}\n`;
    assertNonEmpty(sections.join(""), "Excel workbook");
    return baseResult(file, {
      converterId: this.id,
      detectedFormat: "xlsx",
      title,
      markdown,
      warnings: options.includeHiddenSheets ? [] : ["Hidden worksheets were excluded."],
      statistics: { sheets: sheets.length, rows: totalRows },
    });
  },
};

export const presentationConverter: LocalConverter = {
  id: "presentation",
  label: "PowerPoint presentation",
  extensions: ["pptx"],
  mimeTypes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  canConvert(file, hints) {
    return matchesFile(file, this.extensions, this.mimeTypes, hints);
  },
  async convert(file, _options, context) {
    assertFileAllowed(file, context);
    const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const slidePaths = Object.keys(archive)
      .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
      .sort(numericPathSort);
    const sections: string[] = [];
    for (let index = 0; index < slidePaths.length; index += 1) {
      throwIfAborted(context.signal);
      context.onProgress({
        stage: "slides",
        current: index + 1,
        total: slidePaths.length,
        message: `Converting slide ${index + 1} of ${slidePaths.length}…`,
      });
      const texts = xmlTextRuns(strFromU8(archive[slidePaths[index]]));
      const notesPath = `ppt/notesSlides/notesSlide${index + 1}.xml`;
      const notes = archive[notesPath] ? xmlTextRuns(strFromU8(archive[notesPath])) : [];
      const heading = texts[0] || `Slide ${index + 1}`;
      const body = texts.slice(1).filter((text) => text !== heading);
      sections.push(
        [`## ${heading}`, body.map((text) => `- ${text}`).join("\n"), notes.length ? `### Speaker notes\n\n${notes.join(" ")}` : ""]
          .filter(Boolean)
          .join("\n\n"),
      );
    }
    const assets = Object.entries(archive)
      .filter(([path]) => path.startsWith("ppt/media/") && !path.endsWith("/"))
      .map(([path, bytes]) => ({
        name: path.split("/").pop() ?? "slide-image",
        mimeType: mediaType(path),
        blob: new Blob([copyBytes(bytes)], { type: mediaType(path) }),
        sourceLocation: path,
        altText: "Image extracted from presentation",
      }));
    const title = titleFromFile(file);
    const markdown = `# ${title}\n\n${sections.join("\n\n---\n\n")}\n`;
    assertNonEmpty(sections.join(""), "PowerPoint presentation");
    return baseResult(file, {
      converterId: this.id,
      detectedFormat: "pptx",
      title,
      markdown,
      assets,
      warnings: assets.length ? [`${assets.length} slide image${assets.length === 1 ? " was" : "s were"} extracted as document assets.`] : [],
      statistics: { slides: slidePaths.length, images: assets.length },
    });
  },
};

export const epubConverter: LocalConverter = {
  id: "epub",
  label: "EPUB book",
  extensions: ["epub"],
  mimeTypes: ["application/epub+zip"],
  canConvert(file, hints) {
    return matchesFile(file, this.extensions, this.mimeTypes, hints);
  },
  async convert(file, _options, context) {
    assertFileAllowed(file, context);
    const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const container = parseXml(archive, "META-INF/container.xml");
    const opfPath = container?.container?.rootfiles?.rootfile?.["full-path"];
    if (!opfPath || !archive[opfPath]) throw new ConverterError("invalid", "This EPUB has no readable package manifest.");
    const packageDocument = parser.parse(strFromU8(archive[opfPath]))?.package;
    const title = collectText(packageDocument?.metadata?.["dc:title"]).join(" ").trim() || titleFromFile(file);
    const manifest = new Map(asArray(packageDocument?.manifest?.item).map((item) => [item.id, item.href]));
    const spine = asArray(packageDocument?.spine?.itemref);
    const sections: string[] = [];
    for (let index = 0; index < spine.length; index += 1) {
      throwIfAborted(context.signal);
      const href = manifest.get(spine[index].idref);
      if (!href) continue;
      const contentPath = resolveArchivePath(opfPath, href);
      if (!archive[contentPath]) continue;
      context.onProgress({
        stage: "chapters",
        current: index + 1,
        total: spine.length,
        message: `Converting chapter ${index + 1} of ${spine.length}…`,
      });
      const markdown = await htmlToMarkdown(strFromU8(archive[contentPath]));
      if (markdown) sections.push(markdown);
    }
    assertNonEmpty(sections.join(""), "EPUB");
    return baseResult(file, {
      converterId: this.id,
      detectedFormat: "epub",
      title,
      markdown: `# ${title}\n\n${sections.join("\n\n---\n\n")}\n`,
      statistics: { chapters: sections.length },
    });
  },
};

export const officeConverters = [spreadsheetConverter, presentationConverter, epubConverter];

function parseXml(archive: Record<string, Uint8Array>, path: string) {
  const bytes = archive[path];
  return bytes ? parser.parse(strFromU8(bytes)) : null;
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function readSharedStrings(archive: Record<string, Uint8Array>) {
  const strings = parseXml(archive, "xl/sharedStrings.xml")?.sst?.si;
  return asArray(strings).map((value) => collectText(value).join(""));
}

function collectText(value: unknown): string[] {
  if (typeof value === "string" || typeof value === "number") return [String(value)];
  if (Array.isArray(value)) return value.flatMap(collectText);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
    key === "t" || key.endsWith(":t") ? collectText(nested) : collectText(nested),
  );
}

function rowToValues(row: Record<string, unknown>, sharedStrings: string[]) {
  const cells = asArray(row?.c as Record<string, unknown> | Record<string, unknown>[]);
  const values: string[] = [];
  for (const cell of cells) {
    const reference = String(cell.r ?? "A1");
    const column = columnIndex(reference.replace(/\d+/g, ""));
    while (values.length < column) values.push("");
    const raw = cell.t === "inlineStr" ? collectText(cell.is).join("") : collectText(cell.v).join("");
    values[column] = cell.t === "s" ? sharedStrings[Number(raw)] ?? "" : raw;
  }
  return values;
}

function columnIndex(letters: string) {
  let result = 0;
  for (const character of letters) result = result * 26 + character.toUpperCase().charCodeAt(0) - 64;
  return Math.max(0, result - 1);
}

function xmlTextRuns(xml: string) {
  return [...xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)]
    .map((match) => decodeXml(match[1]).trim())
    .filter(Boolean);
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function numericPathSort(left: string, right: string) {
  return Number(left.match(/\d+/)?.[0]) - Number(right.match(/\d+/)?.[0]);
}

function resolveArchivePath(base: string, relative: string) {
  const segments = base.split("/").slice(0, -1).concat(relative.split("/"));
  const result: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") result.pop();
    else result.push(segment);
  }
  return result.join("/");
}

function mediaType(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  return extension === "png" ? "image/png" : extension === "svg" ? "image/svg+xml" : "image/jpeg";
}

function copyBytes(bytes: Uint8Array) {
  return bytes.slice().buffer;
}
