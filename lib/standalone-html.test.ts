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
    expect(result.querySelector("img")?.hasAttribute("src")).toBe(false);
    expect(result.querySelector("img")?.hasAttribute("onerror")).toBe(false);
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
