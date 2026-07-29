import type { LocalConverter } from "@/lib/converters/types";
import { ConverterError } from "@/lib/converters/error";
import {
  assertFileAllowed,
  assertGeneratedMarkdown,
  assertNonEmpty,
  baseResult,
  fencedCodeBlock,
  markdownHeading,
  matchesFile,
  matrixToMarkdown,
  titleFromFile,
} from "@/lib/converters/helpers";

export async function htmlToMarkdown(html: string) {
  const [{ default: TurndownService }, { gfm }] = await Promise.all([
    import("turndown"),
    import("turndown-plugin-gfm"),
  ]);
  const service = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    strongDelimiter: "**",
  });
  service.use(gfm);
  service.remove(["script", "style", "noscript", "iframe", "object", "embed", "form"]);
  return service
    .turndown(html)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const markdownConverter: LocalConverter = {
  id: "markdown",
  label: "Markdown or text",
  extensions: ["md", "markdown", "txt"],
  mimeTypes: ["text/markdown", "text/plain"],
  canConvert(file, hints) {
    return matchesFile(file, this.extensions, this.mimeTypes, hints);
  },
  async convert(file, _options, context) {
    assertFileAllowed(file, context);
    assertTextFileSize(file, context.limits.maxGeneratedMarkdownChars, "Markdown");
    context.onProgress({ stage: "reading", message: `Opening “${file.name}” locally…` });
    const markdown = await file.text();
    assertNonEmpty(markdown, "text");
    assertGeneratedMarkdown(markdown, context, "Markdown document");
    return baseResult(file, {
      converterId: this.id,
      detectedFormat: file.name.endsWith(".txt") ? "plain-text" : "markdown",
      title: markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || titleFromFile(file),
      markdown,
      statistics: { characters: markdown.length },
    });
  },
};

export const htmlConverter: LocalConverter = {
  id: "html",
  label: "HTML",
  extensions: ["html", "htm"],
  mimeTypes: ["text/html", "application/xhtml+xml"],
  canConvert(file, hints) {
    return matchesFile(file, this.extensions, this.mimeTypes, hints);
  },
  async convert(file, _options, context) {
    assertFileAllowed(file, context);
    assertTextFileSize(file, context.limits.maxGeneratedHtmlChars, "HTML");
    context.onProgress({ stage: "converting", message: `Converting “${file.name}” from HTML…` });
    const html = await file.text();
    const markdown = await htmlToMarkdown(html);
    assertNonEmpty(markdown, "HTML");
    const parsedTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, "").trim();
    const title = parsedTitle || titleFromFile(file);
    const output = /^#\s+/m.test(markdown)
      ? `${markdown}\n`
      : `${markdownHeading(1, title)}\n\n${markdown}\n`;
    assertGeneratedMarkdown(output, context, "HTML document");
    return baseResult(file, {
      converterId: this.id,
      detectedFormat: "html",
      title,
      markdown: output,
      statistics: { characters: markdown.length },
    });
  },
};

export const csvConverter: LocalConverter = {
  id: "csv",
  label: "CSV or TSV",
  extensions: ["csv", "tsv"],
  mimeTypes: ["text/csv", "text/tab-separated-values"],
  canConvert(file, hints) {
    return matchesFile(file, this.extensions, this.mimeTypes, hints);
  },
  async convert(file, _options, context) {
    assertFileAllowed(file, context);
    assertTextFileSize(file, context.limits.maxGeneratedHtmlChars, "CSV");
    context.onProgress({ stage: "converting", message: `Building a Markdown table from “${file.name}”…` });
    const [{ default: Papa }, text] = await Promise.all([import("papaparse"), file.text()]);
    const result = Papa.parse<string[]>(text, {
      delimiter: file.name.toLowerCase().endsWith(".tsv") ? "\t" : "",
      skipEmptyLines: "greedy",
    });
    const rows = result.data;
    const title = titleFromFile(file);
    const warnings = result.errors.slice(0, 8).map((error) => `Row ${error.row ?? "?"}: ${error.message}`);
    const markdown = `${markdownHeading(1, title)}\n\n${matrixToMarkdown(rows, context.limits)}\n`;
    assertGeneratedMarkdown(markdown, context, "CSV document");
    return baseResult(file, {
      converterId: this.id,
      detectedFormat: file.name.toLowerCase().endsWith(".tsv") ? "tsv" : "csv",
      title,
      markdown,
      warnings,
      statistics: { rows: rows.length, columns: Math.max(0, ...rows.map((row) => row.length)) },
    });
  },
};

export const jsonConverter: LocalConverter = {
  id: "json",
  label: "JSON",
  extensions: ["json"],
  mimeTypes: ["application/json", "text/json"],
  canConvert(file, hints) {
    return matchesFile(file, this.extensions, this.mimeTypes, hints);
  },
  async convert(file, _options, context) {
    assertFileAllowed(file, context);
    assertTextFileSize(file, context.limits.maxGeneratedHtmlChars, "JSON");
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    const title = titleFromFile(file);
    const formatted = JSON.stringify(parsed, null, 2);
    const markdown = `${markdownHeading(1, title)}\n\n${fencedCodeBlock("json", formatted)}\n`;
    assertGeneratedMarkdown(markdown, context, "JSON document");
    return baseResult(file, {
      converterId: this.id,
      detectedFormat: "json",
      title,
      markdown,
      statistics: { characters: formatted.length },
    });
  },
};

export const xmlConverter: LocalConverter = {
  id: "xml",
  label: "XML",
  extensions: ["xml"],
  mimeTypes: ["application/xml", "text/xml"],
  canConvert(file, hints) {
    return matchesFile(file, this.extensions, this.mimeTypes, hints);
  },
  async convert(file, _options, context) {
    assertFileAllowed(file, context);
    assertTextFileSize(file, context.limits.maxGeneratedHtmlChars, "XML");
    const [{ XMLParser, XMLBuilder, XMLValidator }, text] = await Promise.all([
      import("fast-xml-parser"),
      file.text(),
    ]);
    const validation = XMLValidator.validate(text);
    if (validation !== true) throw new Error(`Invalid XML near line ${validation.err.line}.`);
    const parsed = new XMLParser({ ignoreAttributes: false }).parse(text);
    const formatted = new XMLBuilder({ ignoreAttributes: false, format: true }).build(parsed);
    const title = titleFromFile(file);
    const markdown = `${markdownHeading(1, title)}\n\n${fencedCodeBlock("xml", formatted)}\n`;
    assertGeneratedMarkdown(markdown, context, "XML document");
    return baseResult(file, {
      converterId: this.id,
      detectedFormat: "xml",
      title,
      markdown,
      statistics: { characters: formatted.length },
    });
  },
};

export const textConverters = [
  markdownConverter,
  htmlConverter,
  csvConverter,
  jsonConverter,
  xmlConverter,
];

function assertTextFileSize(file: File, maximumBytes: number, format: string) {
  if (file.size > maximumBytes) {
    throw new ConverterError(
      "resource-limit",
      `${format} files must be ${Math.floor(maximumBytes / 1024 / 1024)} MiB or smaller.`,
    );
  }
}
