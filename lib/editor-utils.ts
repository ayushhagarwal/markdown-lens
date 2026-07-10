import GithubSlugger from "github-slugger";

export type DocumentHeading = { level: number; text: string; id: string; line: number };

export function getDocumentTitle(markdown: string) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || "Untitled document";
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
  return markdown.split("\n").flatMap((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (!match) return [];
    const text = match[2].trim();
    return [{ level: match[1].length, text, id: slugger.slug(text), line: index + 1 }];
  });
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
