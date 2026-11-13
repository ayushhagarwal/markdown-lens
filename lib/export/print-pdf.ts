import { prepareStandaloneBodyHtml } from "@/lib/editor-utils";
import { prepareExportClone } from "@/lib/export/preview-clone";

export type PdfPaperSize = "a4" | "letter" | "legal";
export type PdfOrientation = "portrait" | "landscape";
export type PdfMarginPreset = "narrow" | "normal" | "wide";
export type PdfFontFamily = "sans" | "serif";

export type PdfSettings = {
  paperSize: PdfPaperSize;
  orientation: PdfOrientation;
  margin: PdfMarginPreset;
  /** Base font size in points. */
  fontSize: number;
  fontFamily: PdfFontFamily;
  pageNumbers: boolean;
  /** Start every level-1 heading (except the first block) on a new page. */
  h1NewPage: boolean;
};

export const PDF_PAPER_SIZES: readonly { value: PdfPaperSize; label: string; css: string; detail: string }[] = [
  { value: "a4", label: "A4", css: "A4", detail: "210 × 297 mm" },
  { value: "letter", label: "Letter", css: "letter", detail: "8.5 × 11 in" },
  { value: "legal", label: "Legal", css: "legal", detail: "8.5 × 14 in" },
];

export const PDF_MARGINS: readonly { value: PdfMarginPreset; label: string; css: string }[] = [
  { value: "narrow", label: "Narrow", css: "12.7mm" },
  { value: "normal", label: "Normal", css: "20mm" },
  { value: "wide", label: "Wide", css: "25.4mm 31.75mm" },
];

export const PDF_FONT_SIZES = [9, 10, 11, 12, 13, 14] as const;

export const DEFAULT_PDF_SETTINGS: PdfSettings = {
  paperSize: "a4",
  orientation: "portrait",
  margin: "normal",
  fontSize: 11,
  fontFamily: "sans",
  pageNumbers: true,
  h1NewPage: false,
};

/** Coerces persisted or partial input into valid settings, falling back to defaults per field. */
export function normalizePdfSettings(value: unknown): PdfSettings {
  const input = (value && typeof value === "object" ? value : {}) as Partial<Record<keyof PdfSettings, unknown>>;
  const pick = <T>(candidate: unknown, allowed: readonly T[], fallback: T) =>
    allowed.includes(candidate as T) ? (candidate as T) : fallback;
  return {
    paperSize: pick(input.paperSize, PDF_PAPER_SIZES.map((size) => size.value), DEFAULT_PDF_SETTINGS.paperSize),
    orientation: pick(input.orientation, ["portrait", "landscape"] as const, DEFAULT_PDF_SETTINGS.orientation),
    margin: pick(input.margin, PDF_MARGINS.map((margin) => margin.value), DEFAULT_PDF_SETTINGS.margin),
    fontSize:
      typeof input.fontSize === "number" && Number.isFinite(input.fontSize)
        ? Math.min(18, Math.max(8, Math.round(input.fontSize)))
        : DEFAULT_PDF_SETTINGS.fontSize,
    fontFamily: pick(input.fontFamily, ["sans", "serif"] as const, DEFAULT_PDF_SETTINGS.fontFamily),
    pageNumbers: typeof input.pageNumbers === "boolean" ? input.pageNumbers : DEFAULT_PDF_SETTINGS.pageNumbers,
    h1NewPage: typeof input.h1NewPage === "boolean" ? input.h1NewPage : DEFAULT_PDF_SETTINGS.h1NewPage,
  };
}

const FONT_STACKS: Record<PdfFontFamily, string> = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  serif: 'Charter, "Iowan Old Style", Georgia, Cambria, "Times New Roman", serif',
};

export function buildPageCss(settings: PdfSettings) {
  const paper = PDF_PAPER_SIZES.find((size) => size.value === settings.paperSize) ?? PDF_PAPER_SIZES[0];
  const margin = PDF_MARGINS.find((preset) => preset.value === settings.margin) ?? PDF_MARGINS[1];
  const footer = settings.pageNumbers
    ? `
    @bottom-center {
      content: counter(page) " / " counter(pages);
      font-family: ${FONT_STACKS.sans};
      font-size: 9pt;
      color: #57606a;
    }`
    : "";
  return `@page {
    size: ${paper.css} ${settings.orientation};
    margin: ${margin.css};${footer}
  }`;
}

const printStyles = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    color: #1f2328;
    line-height: 1.6;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    orphans: 3;
    widows: 3;
  }
  main { width: 100%; }
  main > :first-child { margin-top: 0; }
  h1, h2, h3, h4, h5, h6 {
    margin: 1.4em 0 0.55em;
    line-height: 1.25;
    break-after: avoid;
    page-break-after: avoid;
    break-inside: avoid;
  }
  h1, h2 { border-bottom: 1px solid #d8dee4; padding-bottom: 0.3em; }
  h1 { font-size: 1.9em; }
  h2 { font-size: 1.45em; }
  h3 { font-size: 1.2em; }
  h4 { font-size: 1.05em; }
  h5, h6 { font-size: 1em; }
  h6 { color: #57606a; }
  p, ul, ol, blockquote, table, pre, figure { margin: 0.85em 0; }
  ul, ol { padding-left: 1.5em; }
  li + li { margin-top: 0.2em; }
  .contains-task-list { padding-left: 0.5em; }
  .task-list-item { list-style: none; }
  a { color: #0969da; text-decoration: underline; text-underline-offset: 2px; }
  img, svg { max-width: 100%; height: auto; }
  img, svg, figure, .katex-display { break-inside: avoid; page-break-inside: avoid; }
  hr { border: 0; border-top: 1px solid #d0d7de; margin: 1.5em 0; }
  blockquote {
    margin-left: 0;
    border-left: 4px solid #1a7f67;
    border-radius: 0 6px 6px 0;
    background: #eef8f4;
    padding: 0.6em 1em;
  }
  blockquote > :first-child { margin-top: 0; }
  blockquote > :last-child { margin-bottom: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 0.95em; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr, th, td { break-inside: avoid; page-break-inside: avoid; }
  th, td { border: 1px solid #d0d7de; padding: 0.4em 0.65em; text-align: left; vertical-align: top; }
  th { background: #f6f8fa; font-weight: 600; }
  code {
    border-radius: 4px;
    background: #eff1f3;
    padding: 0.1em 0.3em;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.88em;
  }
  pre {
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: #f6f8fa;
    padding: 0.8em 1em;
    color: #1f2328;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  pre code { background: transparent; padding: 0; color: inherit; font-size: 0.86em; }
  .hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-built_in, .hljs-type { color: #cf222e; }
  .hljs-string, .hljs-regexp, .hljs-attr { color: #0a3069; }
  .hljs-title, .hljs-function, .hljs-section { color: #8250df; }
  .hljs-number, .hljs-variable, .hljs-attribute, .hljs-symbol { color: #0550ae; }
  .hljs-comment, .hljs-quote, .hljs-meta { color: #6e7781; font-style: italic; }
  .katex-display { overflow: visible; padding: 0.4em 0; }
  .sr-only { display: none !important; }
`;

export type PrintDocumentOptions = {
  title: string;
  bodyHtml: string;
  settings: PdfSettings;
  /** Extra CSS appended after the print styles, e.g. KaTeX rules from `collectDocumentCss`. */
  extraCss?: string;
};

/** Builds a self-contained, print-ready HTML document. Pure: no DOM access. */
export function buildPrintDocument({ title, bodyHtml, settings, extraCss = "" }: PrintDocumentOptions) {
  const normalized = normalizePdfSettings(settings);
  const h1Break = normalized.h1NewPage
    ? "\n  main > h1:not(:first-child) { break-before: page; page-break-before: always; }"
    : "";
  const bodyCss = `
  body {
    font-family: ${FONT_STACKS[normalized.fontFamily]};
    font-size: ${normalized.fontSize}pt;
  }`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:">
  <meta name="generator" content="Markdown Lens">
  <title>${escapeHtml(title)}</title>
  <style>${buildPageCss(normalized)}${printStyles}${bodyCss}${h1Break}
${sanitizeCss(extraCss)}</style>
</head>
<body>
  <main>${bodyHtml}</main>
</body>
</html>`;
}

/** Turns the live preview into print-safe body HTML (blob images inlined, controls removed). */
export function preparePrintBodyHtml(preview: HTMLElement) {
  return prepareStandaloneBodyHtml(prepareExportClone(preview));
}

/**
 * Collects same-origin CSS rules whose text matches `pattern` (KaTeX by default) so math renders
 * inside the print frame. Cross-origin sheets are skipped.
 */
export function collectDocumentCss(source: Document = document, pattern = /katex/i) {
  const rules: string[] = [];
  for (const sheet of Array.from(source.styleSheets)) {
    let cssRules: CSSRuleList;
    try {
      cssRules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(cssRules)) {
      if (pattern.test(rule.cssText)) rules.push(rule.cssText);
    }
  }
  return rules.join("\n");
}

const PRINT_FRAME_ATTRIBUTE = "data-markdown-lens-print-frame";

/**
 * Prints `html` from a hidden `srcdoc` iframe so the app chrome never prints.
 * Resolves after the browser's print dialog returns (or immediately in browsers where
 * `print()` does not block). The frame is removed on `afterprint` or before the next print.
 */
export function printHtmlDocument(html: string, { title }: { title?: string } = {}): Promise<void> {
  document.querySelectorAll(`iframe[${PRINT_FRAME_ATTRIBUTE}]`).forEach((frame) => frame.remove());

  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.setAttribute(PRINT_FRAME_ATTRIBUTE, "");
    // No allow-scripts: the frame only needs same-origin access (for blob: images and so
    // the parent can call print()) and allow-modals (browsers gate print() on it).
    frame.setAttribute("sandbox", "allow-same-origin allow-modals");
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("tabindex", "-1");
    frame.title = "Print preview";
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";

    const remove = () => frame.remove();
    frame.addEventListener(
      "load",
      async () => {
        const frameWindow = frame.contentWindow;
        const frameDocument = frame.contentDocument;
        if (!frameWindow || !frameDocument) {
          remove();
          reject(new Error("The print frame could not be opened."));
          return;
        }
        try {
          await waitForAssets(frameDocument);
          frameWindow.addEventListener("afterprint", () => window.setTimeout(remove, 0), { once: true });
          const previousTitle = document.title;
          // Chrome and Safari suggest the PDF file name from the top-level title.
          if (title) document.title = title;
          try {
            frameWindow.focus();
            frameWindow.print();
          } finally {
            if (title) document.title = previousTitle;
          }
          resolve();
        } catch (error) {
          remove();
          reject(error instanceof Error ? error : new Error("Printing failed."));
        }
      },
      { once: true },
    );
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}

async function waitForAssets(frameDocument: Document, timeoutMs = 4000) {
  const images = Array.from(frameDocument.images).filter((image) => !image.complete);
  const imagesReady = Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );
  const fontsReady = frameDocument.fonts?.ready ?? Promise.resolve();
  await Promise.race([
    Promise.all([imagesReady, fontsReady]),
    new Promise((resolve) => window.setTimeout(resolve, timeoutMs)),
  ]);
}

function sanitizeCss(css: string) {
  // The value ends up inside <style>; never let it close the element.
  return css.replace(/<\/style/gi, "<\\/style");
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}
