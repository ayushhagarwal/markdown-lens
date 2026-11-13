import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PDF_SETTINGS,
  buildPageCss,
  buildPrintDocument,
  normalizePdfSettings,
  printHtmlDocument,
  type PdfSettings,
} from "@/lib/export/print-pdf";

const settings = (overrides: Partial<PdfSettings> = {}): PdfSettings => ({ ...DEFAULT_PDF_SETTINGS, ...overrides });
const compact = (css: string) => css.replace(/\s+/g, " ");

describe("buildPageCss", () => {
  it.each([
    [{ paperSize: "a4", orientation: "portrait", margin: "normal" }, "size: A4 portrait; margin: 20mm;"],
    [{ paperSize: "letter", orientation: "landscape", margin: "narrow" }, "size: letter landscape; margin: 12.7mm;"],
    [{ paperSize: "legal", orientation: "portrait", margin: "wide" }, "size: legal portrait; margin: 25.4mm 31.75mm;"],
  ] as const)("writes @page for %o", (overrides, expected) => {
    expect(compact(buildPageCss(settings(overrides)))).toContain(`@page { ${expected}`);
  });

  it("adds a page counter only when page numbers are on", () => {
    expect(buildPageCss(settings({ pageNumbers: true }))).toContain('content: counter(page) " / " counter(pages)');
    expect(buildPageCss(settings({ pageNumbers: false }))).not.toContain("@bottom-center");
  });
});

describe("buildPrintDocument", () => {
  it("builds a complete document with print rules", () => {
    const html = buildPrintDocument({
      title: "A <b>title</b>",
      bodyHtml: "<h1>One</h1><p>Body</p>",
      settings: settings({ fontFamily: "serif", fontSize: 13 }),
    });
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.title).toBe("A <b>title</b>");
    expect(doc.querySelector("main h1")?.textContent).toBe("One");
    const css = compact(doc.querySelector("style")?.textContent ?? "");
    expect(css).toContain("font-size: 13pt");
    expect(css).toMatch(/font-family: Charter/);
    expect(css).toContain("thead { display: table-header-group; }");
    expect(css).toMatch(/pre \{[^}]*break-inside: avoid/);
    expect(css).toMatch(/pre \{[^}]*background: #f6f8fa/);
    expect(css).toMatch(/h1, h2, h3, h4, h5, h6 \{[^}]*break-after: avoid/);
    expect(css).not.toContain("break-before: page");
    expect(doc.querySelector("meta[http-equiv='Content-Security-Policy']")?.getAttribute("content")).toContain("default-src 'none'");
  });

  it("starts top-level headings on new pages when asked", () => {
    const html = buildPrintDocument({ title: "t", bodyHtml: "", settings: settings({ h1NewPage: true }) });
    expect(html).toContain("main > h1:not(:first-child) { break-before: page;");
  });

  it("keeps extra CSS inside the style element", () => {
    const html = buildPrintDocument({ title: "t", bodyHtml: "", settings: settings(), extraCss: ".katex{}</style><script>x</script>" });
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelectorAll("script")).toHaveLength(0);
    expect(doc.querySelectorAll("style")).toHaveLength(1);
  });

  it("normalises invalid settings", () => {
    expect(normalizePdfSettings({ paperSize: "a3", fontSize: 99, margin: "wide", pageNumbers: "yes" })).toEqual({
      ...DEFAULT_PDF_SETTINGS,
      margin: "wide",
      fontSize: 18,
    });
    expect(normalizePdfSettings(null)).toEqual(DEFAULT_PDF_SETTINGS);
  });
});

describe("printHtmlDocument", () => {
  afterEach(() => document.body.replaceChildren());

  it("prints from a sandboxed srcdoc iframe and restores the page title", async () => {
    document.title = "App";
    const pending = printHtmlDocument("<!doctype html><title>x</title><p>hi</p>", { title: "My doc" });
    const frame = document.querySelector("iframe");
    expect(frame?.getAttribute("sandbox")).toBe("allow-same-origin allow-modals");
    expect(frame?.getAttribute("srcdoc")).toContain("<p>hi</p>");
    let titleDuringPrint = "";
    const print = vi.fn(() => {
      titleDuringPrint = document.title;
    });
    Object.defineProperty(frame!.contentWindow!, "print", { value: print, configurable: true });
    Object.defineProperty(frame!.contentWindow!, "focus", { value: () => undefined, configurable: true });
    frame!.dispatchEvent(new Event("load"));
    await pending;
    expect(print).toHaveBeenCalledOnce();
    expect(titleDuringPrint).toBe("My doc");
    expect(document.title).toBe("App");
  });
});
