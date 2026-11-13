import { prepareStandaloneBodyHtml, sanitizePreviewHtml } from "@/lib/editor-utils";
import { replaceUnportableParts } from "@/lib/export/preview-clone";

const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Courier New',monospace";
const BORDER = "1px solid #d0d7de";

/** Inline styles per element; paste targets ignore stylesheets and classes. */
const ELEMENT_STYLES: Record<string, string> = {
  h1: "font-size:2em;font-weight:700;line-height:1.25;margin:0.67em 0 0.5em;",
  h2: "font-size:1.5em;font-weight:700;line-height:1.25;margin:1em 0 0.5em;",
  h3: "font-size:1.25em;font-weight:700;line-height:1.3;margin:1em 0 0.5em;",
  h4: "font-size:1.05em;font-weight:700;margin:1em 0 0.5em;",
  h5: "font-size:1em;font-weight:700;margin:1em 0 0.5em;",
  h6: "font-size:0.95em;font-weight:700;color:#57606a;margin:1em 0 0.5em;",
  p: "margin:0 0 1em;",
  a: "color:#0969da;text-decoration:underline;",
  blockquote: "margin:0 0 1em;padding:0.5em 1em;border-left:4px solid #1a7f67;background:#eef8f4;color:#3d4752;",
  ul: "margin:0 0 1em;padding-left:1.6em;",
  ol: "margin:0 0 1em;padding-left:1.6em;",
  li: "margin:0.2em 0;",
  table: `border-collapse:collapse;border:${BORDER};margin:0 0 1em;`,
  th: `border:${BORDER};padding:6px 12px;background:#f6f8fa;font-weight:700;text-align:left;vertical-align:top;`,
  td: `border:${BORDER};padding:6px 12px;text-align:left;vertical-align:top;`,
  pre: `margin:0 0 1em;padding:12px 16px;background:#f6f8fa;border:${BORDER};border-radius:6px;font-family:${MONO};font-size:13px;line-height:1.45;white-space:pre-wrap;color:#1f2328;`,
  code: `font-family:${MONO};font-size:0.9em;background:#eff1f3;padding:0.1em 0.3em;border-radius:4px;`,
  hr: "border:0;border-top:1px solid #d0d7de;margin:1.5em 0;",
  img: "max-width:100%;height:auto;",
  del: "text-decoration:line-through;",
};

const PRE_CODE_STYLE = `font-family:${MONO};font-size:inherit;background:transparent;padding:0;`;

const HIGHLIGHT_COLORS: [RegExp, string][] = [
  [/\bhljs-(keyword|selector-tag|literal|built_in|type)\b/, "#cf222e"],
  [/\bhljs-(string|regexp|attr)\b/, "#0a3069"],
  [/\bhljs-(title|function|section)\b/, "#8250df"],
  [/\bhljs-(number|variable|attribute|symbol)\b/, "#0550ae"],
  [/\bhljs-(comment|quote|meta)\b/, "#6e7781"],
];

const WRAPPER_STYLE =
  "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#1f2328;";

/**
 * Converts rendered preview HTML into clipboard-friendly HTML: sanitised with the export
 * rules, KaTeX replaced by TeX source, task boxes as ☐/☑, and every element styled inline.
 * Pure apart from using an inert document for parsing (no scripts run, no images load).
 */
export function buildRichTextHtml(html: string) {
  const inert = document.implementation.createHTMLDocument("");
  const container = inert.createElement("div");
  container.innerHTML = html;
  replaceUnportableParts(container, { replaceMath: true });
  container.innerHTML = sanitizePreviewHtml(container);

  // Code blocks are wrapped in layout divs in the preview; unwrap anything that is not content.
  container.querySelectorAll("div").forEach((div) => {
    if (div.attributes.length && !div.getAttribute("style")) div.replaceWith(...Array.from(div.childNodes));
  });

  for (const element of Array.from(container.querySelectorAll<HTMLElement>("*"))) {
    const tag = element.tagName.toLowerCase();
    const inPre = Boolean(element.closest("pre")) && tag !== "pre";
    const classes = element.getAttribute("class") ?? "";
    let style = "";
    if (tag === "code" && inPre) style = PRE_CODE_STYLE;
    else if (ELEMENT_STYLES[tag]) style = ELEMENT_STYLES[tag];
    if (inPre && tag === "span") {
      const color = HIGHLIGHT_COLORS.find(([pattern]) => pattern.test(classes))?.[1];
      if (color) style += `color:${color};`;
    }
    if (classes.includes("task-list-item")) style += "list-style:none;";
    if (classes.includes("contains-task-list")) style += "padding-left:0.4em;";
    // Keep author-supplied alignment (GFM table columns) after our defaults so it wins.
    const existing = element.getAttribute("style")?.trim();
    const align = element.getAttribute("align");
    if (align && /^(left|center|right)$/i.test(align)) style += `text-align:${align.toLowerCase()};`;
    const merged = `${style}${existing ? (existing.endsWith(";") ? existing : `${existing};`) : ""}`;
    if (merged) element.setAttribute("style", merged);
    element.removeAttribute("class");
    if (tag !== "a") element.removeAttribute("id");
    if (tag === "a") element.removeAttribute("target");
  }

  return `<div style="${WRAPPER_STYLE}">${container.innerHTML}</div>`;
}

/**
 * Copies the rendered preview as rich text (`text/html`) plus `plainText` (`text/plain`).
 * Uses `ClipboardItem` with promised blobs so Safari keeps the user gesture; falls back to a
 * `copy` event with `document.execCommand("copy")` where `ClipboardItem` is unavailable.
 */
export async function copyRichText(previewElement: HTMLElement, plainText: string): Promise<void> {
  const htmlPromise = prepareRichTextFromPreview(previewElement);

  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": htmlPromise.then((html) => new Blob([html], { type: "text/html" })),
          "text/plain": new Blob([plainText], { type: "text/plain" }),
        }),
      ]);
      return;
    } catch {
      // Permission denied or unsupported promise values: try the legacy path below.
    }
  }

  copyWithExecCommand(await htmlPromise, plainText);
}

async function prepareRichTextFromPreview(previewElement: HTMLElement) {
  const clone = previewElement.cloneNode(true) as HTMLElement;
  // Must run before sanitising, which strips the task-list inputs.
  replaceUnportableParts(clone, { replaceMath: true });
  return buildRichTextHtml(await prepareStandaloneBodyHtml(clone));
}

/** Legacy fallback: sets both flavours from a copy event, with a selection as a last resort. */
export function copyWithExecCommand(html: string, plainText: string) {
  const holder = document.createElement("div");
  holder.setAttribute("contenteditable", "true");
  holder.setAttribute("aria-hidden", "true");
  holder.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none;white-space:pre-wrap;";
  holder.innerHTML = html;
  document.body.appendChild(holder);

  const onCopy = (event: ClipboardEvent) => {
    if (!event.clipboardData) return;
    event.clipboardData.setData("text/html", html);
    event.clipboardData.setData("text/plain", plainText);
    event.preventDefault();
  };
  document.addEventListener("copy", onCopy, true);

  const selection = window.getSelection();
  const previousRanges = selection ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index)) : [];
  try {
    const range = document.createRange();
    range.selectNodeContents(holder);
    selection?.removeAllRanges();
    selection?.addRange(range);
    if (!document.execCommand("copy")) throw new Error("The browser blocked copying rich text.");
  } finally {
    document.removeEventListener("copy", onCopy, true);
    selection?.removeAllRanges();
    previousRanges.forEach((range) => selection?.addRange(range));
    holder.remove();
  }
}
