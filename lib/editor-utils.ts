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
      const value = attribute.value.trim().toLowerCase();
      if (
        name.startsWith("on") ||
        name === "srcdoc" ||
        (["href", "src", "xlink:href"].includes(name) &&
          (value.startsWith("javascript:") || value.startsWith("data:text/html")))
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  });
  clone.querySelectorAll("a").forEach((anchor) => anchor.setAttribute("rel", "noreferrer noopener"));
  return clone.innerHTML;
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
