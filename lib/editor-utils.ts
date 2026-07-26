import GithubSlugger from "github-slugger";
import { toString } from "mdast-util-to-string";
import type { Heading, Nodes } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

export type DocumentHeading = { level: number; text: string; id: string; line: number };

export function getDocumentTitle(markdown: string) {
  return getDocumentHeadings(markdown).find((heading) => heading.level === 1)?.text || "Untitled document";
}

export function getDocumentStats(markdown: string) {
  const words = markdown.trim().match(/\S+/g)?.length ?? 0;
  return {
    words,
    characters: markdown.length,
    minutes: Math.max(1, Math.ceil(words / 220)),
  };
}

export function getDocumentHeadings(markdown: string): DocumentHeading[] {
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
