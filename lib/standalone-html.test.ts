import { describe, expect, test } from "vitest";
import { sanitizePreviewHtml } from "@/lib/editor-utils";
import { buildStandaloneHtmlDocument } from "@/lib/standalone-html";

describe("standalone HTML export", () => {
  test("sanitizes executable markup while preserving rendered content", () => {
    const preview = document.createElement("div");
    preview.innerHTML = [
      '<h1 onclick="alert(1)">Safe heading</h1>',
      '<a href="javascript:alert(2)" onmouseover="alert(3)">Unsafe link</a>',
      '<a href="https://example.com/docs">Safe link</a>',
      '<a href="mailto:hello@example.com">Email link</a>',
      '<a href="//example.com/unsafe">Protocol-relative link</a>',
      '<a href="vbscript:msgbox(1)">Unsafe protocol</a>',
      '<img src="https://example.com/diagram.png" alt="remote diagram">',
      '<img src="data:text/html;base64,PHNjcmlwdD4=" onerror="alert(4)" alt="diagram">',
      "<script>alert(5)</script>",
      "<iframe srcdoc=\"<script>alert(6)</script>\"></iframe>",
      "<button>Editor-only control</button>",
    ].join("");

    const sanitized = sanitizePreviewHtml(preview);
    const result = document.createElement("div");
    result.innerHTML = sanitized;

    expect(result.textContent).toContain("Safe heading");
    expect(result.querySelectorAll("script, iframe, button")).toHaveLength(0);
    expect(result.querySelector("h1")?.hasAttribute("onclick")).toBe(false);
    expect(result.querySelector("a")?.hasAttribute("href")).toBe(false);
    expect(result.querySelector('a[href="https://example.com/docs"]')?.getAttribute("rel")).toBe(
      "noreferrer noopener",
    );
    expect(result.querySelector('a[href="mailto:hello@example.com"]')).not.toBeNull();
    expect(result.querySelector('a[href="//example.com/unsafe"]')).toBeNull();
    expect(result.querySelector('a[href^="vbscript:"]')).toBeNull();
    expect(result.querySelector('img[src="https://example.com/diagram.png"]')).not.toBeNull();
    const unsafeImage = result.querySelector('img[alt="diagram"]');
    expect(unsafeImage?.hasAttribute("src")).toBe(false);
    expect(unsafeImage?.hasAttribute("onerror")).toBe(false);
  });

  test("parses export URLs and checks image sources, srcset, and style", () => {
    const preview = document.createElement("div");
    preview.innerHTML = [
      '<a href="java\nscript:alert(1)">Broken scheme</a>',
      '<a href=" java script:alert(2)">Spaced scheme</a>',
      '<a href="#section">Fragment</a>',
      '<a href="./docs/page">Relative</a>',
      '<a href="mailto:hello@example.com">Mail</a>',
      '<img src="data:image/png;base64,aaaa" alt="png">',
      '<img src="data:image/svg+xml,&lt;svg&gt;" alt="svg">',
      '<img src="blob:https://example.com/11111111-1111-1111-1111-111111111111" alt="blob">',
      '<img src="https://example.com/a.png" srcset="https://example.com/a.png 1x, javascript:alert(3) 2x" alt="srcset">',
      '<img src="https://example.com/b.png" srcset="https://example.com/b.png 1x, https://example.com/c.png 2x" alt="safe srcset">',
      '<p style="color: red">Styled</p>',
      '<p style="background:url(javascript:alert(4))">Unsafe style</p>',
      '<p style="background: url(https://example.com/bg.png)">Remote style</p>',
    ].join("");

    const result = document.createElement("div");
    result.innerHTML = sanitizePreviewHtml(preview);

    expect(result.querySelector('a[href^="java"]')).toBeNull();
    expect(result.querySelector('a[href="#section"]')).not.toBeNull();
    expect(result.querySelector('a[href="./docs/page"]')).not.toBeNull();
    expect(result.querySelector('a[href="mailto:hello@example.com"]')).not.toBeNull();
    expect(result.querySelector('img[alt="png"]')?.getAttribute("src")).toBe("data:image/png;base64,aaaa");
    expect(result.querySelector('img[alt="svg"]')?.hasAttribute("src")).toBe(false);
    expect(result.querySelector('img[alt="blob"]')?.hasAttribute("src")).toBe(false);
    expect(result.querySelector('img[alt="srcset"]')?.hasAttribute("srcset")).toBe(false);
    expect(result.querySelector('img[alt="safe srcset"]')?.hasAttribute("srcset")).toBe(true);
    expect(result.querySelector("p")?.getAttribute("style")).toBe("color: red");
    expect(result.querySelectorAll("p")[1]?.hasAttribute("style")).toBe(false);
    expect(result.querySelectorAll("p")[2]?.getAttribute("style")).toContain("https://example.com/bg.png");
  });

  test("builds a self-contained document with an escaped title and restrictive CSP", () => {
    const html = buildStandaloneHtmlDocument({
      title: 'Release <Notes> & "Plans"',
      bodyHtml: "<h1>Rendered body</h1>",
    });

    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<html lang=\"en\">");
    expect(html).toContain(
      "default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src data:",
    );
    expect(html).toContain("<title>Release &lt;Notes&gt; &amp; &quot;Plans&quot;</title>");
    expect(html).toContain("<main><h1>Rendered body</h1></main>");
    expect(html).not.toContain("<title>Release <Notes>");
  });
});
