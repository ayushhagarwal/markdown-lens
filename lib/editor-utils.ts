import GithubSlugger from "github-slugger";
import { toString } from "mdast-util-to-string";
import type { Heading, Nodes } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import {
  analyzeMarkdownBudget,
  countWordsBounded,
} from "@/lib/markdown-limits";

export type DocumentHeading = { level: number; text: string; id: string; line: number };

export function getDocumentTitle(markdown: string) {
  return getDocumentHeadings(markdown).find((heading) => heading.level === 1)?.text || "Untitled document";
}

export function getDocumentStats(markdown: string) {
  const words = countWordsBounded(markdown);
  return {
    words,
    characters: markdown.length,
    minutes: Math.max(1, Math.ceil(words / 220)),
  };
}

export function getDocumentHeadings(markdown: string): DocumentHeading[] {
  if (!analyzeMarkdownBudget(markdown).allowed) return [];
  const slugger = new GithubSlugger();
  const headings: DocumentHeading[] = [];
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);

  visit(tree, (node) => {
    if (node.type !== "heading") return;
    const heading = node as Heading;
    const text = toString(heading).trim();
    headings.push({
      level: heading.depth,
      text,
      id: slugger.slug(text),
      line: heading.position?.start.line ?? 1,
    });
  });

  return headings;
}

function visit(node: Nodes, visitor: (node: Nodes) => void) {
  visitor(node);
  if (!("children" in node)) return;
  for (const child of node.children) visit(child as Nodes, visitor);
}

export function toFileName(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "markdown-lens-document"
  );
}

/** Returns a safe, deterministic filename that is unique within an export. */
export function getUniqueAssetFileName(name: string, usedNames: Set<string>) {
  const basename = name.replace(/\\/g, "/").split("/").pop() || "asset";
  const safeName = basename.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "asset";
  const key = safeName.toLowerCase();
  if (!usedNames.has(key)) {
    usedNames.add(key);
    return safeName;
  }

  const extensionIndex = safeName.lastIndexOf(".");
  const stem = extensionIndex > 0 ? safeName.slice(0, extensionIndex) : safeName;
  const extension = extensionIndex > 0 ? safeName.slice(extensionIndex) : "";
  let suffix = 2;
  let candidate = `${stem}-${suffix}${extension}`;
  while (usedNames.has(candidate.toLowerCase())) {
    suffix += 1;
    candidate = `${stem}-${suffix}${extension}`;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function sanitizePreviewHtml(preview: HTMLElement) {
  const clone = preview.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll("script, style, link, meta, base, iframe, object, embed, form, input, button")
    .forEach((element) => element.remove());
  clone.querySelectorAll("*").forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;
      if (
        name.startsWith("on") ||
        name === "srcdoc" ||
        (name === "style" && !isSafeExportStyle(value)) ||
        (name === "srcset" && !isSafeExportSrcSet(value)) ||
        (["href", "src", "xlink:href"].includes(name) && !isSafeExportUrl(value, name))
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  });
  clone.querySelectorAll("a").forEach((anchor) => anchor.setAttribute("rel", "noreferrer noopener"));
  return clone.innerHTML;
}

const ASCII_WHITESPACE = /[\u0009\u000A\u000B\u000C\u000D\u0020]+/g;

function isSafeExportUrl(value: string, attributeName: string) {
  const normalized = value.replace(ASCII_WHITESPACE, "").toLowerCase();
  if (!normalized || normalized.includes("\\") || normalized.startsWith("//")) return false;

  if (normalized.startsWith("#")) {
    return isLinkAttribute(attributeName);
  }

  if (/^[a-z][a-z0-9+.-]*:/.test(normalized)) {
    let url: URL;
    try {
      url = new URL(normalized);
    } catch {
      return false;
    }
    if (url.protocol === "http:" || url.protocol === "https:") return true;
    if (url.protocol === "mailto:") return isLinkAttribute(attributeName);
    if (url.protocol === "data:") return isImageAttribute(attributeName) && isImageDataUrl(normalized);
    return false;
  }

  return isLinkAttribute(attributeName);
}

function isSafeExportStyle(value: string) {
  const normalized = value.replace(ASCII_WHITESPACE, "").toLowerCase();
  if (/expression\(|javascript:|vbscript:|-moz-binding|@import|behavior:/.test(normalized)) return false;
  const bodies = cssUrlBodies(normalized);
  const references = normalized.match(/url\(/g) ?? [];
  if (bodies.length !== references.length) return false;
  return bodies.every((body) => isSafeExportUrl(unquoteCssUrl(body), "src"));
}

function isSafeExportSrcSet(value: string) {
  const candidates = value.replace(ASCII_WHITESPACE, "").split(",").filter((candidate) => candidate.length > 0);
  return candidates.length > 0 && candidates.every((candidate) => isSafeExportUrl(candidate, "src"));
}

function isLinkAttribute(attributeName: string) {
  return attributeName === "href" || attributeName === "xlink:href";
}

function isImageAttribute(attributeName: string) {
  return attributeName === "src" || attributeName === "xlink:href";
}

function isImageDataUrl(value: string) {
  if (!value.startsWith("data:image/")) return false;
  const comma = value.indexOf(",");
  if (comma < 0) return false;
  const mime = value.slice("data:".length, comma).split(";")[0] ?? "";
  return /^image\/[a-z0-9.+-]+$/.test(mime) && !/svg|xml|html|script/.test(mime);
}

function cssUrlBodies(value: string) {
  const bodies: string[] = [];
  const pattern = /url\(/gi;
  for (const match of value.matchAll(pattern)) {
    const start = (match.index ?? 0) + match[0].length;
    const end = endOfCssUrl(value, start);
    if (end === value.length && value[end - 1] !== ")") return bodies;
    bodies.push(value.slice(start, Math.max(start, end - 1)));
  }
  return bodies;
}

function endOfCssUrl(value: string, start: number) {
  let quote: string | null = null;
  let depth = 1;
  for (let index = start; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === "\\" && index + 1 < value.length) {
        index += 1;
        continue;
      }
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "(") depth += 1;
    if (character === ")") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return value.length;
}

function unquoteCssUrl(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export async function prepareStandaloneBodyHtml(preview: HTMLElement) {
  const clone = preview.cloneNode(true) as HTMLElement;
  const images = Array.from(clone.querySelectorAll<HTMLImageElement>("img[src^='blob:']"));
  await Promise.all(
    images.map(async (image) => {
      try {
        const response = await fetch(image.src);
        if (!response.ok) return;
        const blob = await response.blob();
        image.src = await blobToDataUrl(blob);
      } catch {
        image.removeAttribute("src");
      }
    }),
  );
  return sanitizePreviewHtml(clone);
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image."));
    reader.readAsDataURL(blob);
  });
}
