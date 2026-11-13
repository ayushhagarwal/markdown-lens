import { afterEach, describe, expect, it, vi } from "vitest";
import { buildRichTextHtml, copyRichText, copyWithExecCommand } from "@/lib/export/rich-text";

function parse(html: string) {
  const container = document.createElement("div");
  container.innerHTML = html;
  return container;
}

const PREVIEW = `
<h2 id="intro" class="x">Intro</h2>
<p>Text with <code>inline</code> and <a href="https://example.com" target="_blank">a link<span class="sr-only"> (opens in a new tab)</span></a>.</p>
<blockquote><p>Quoted</p></blockquote>
<div class="group/code relative"><pre tabindex="0"><code class="hljs language-js"><span class="hljs-keyword">const</span> a = 1;</code></pre><button type="button">Copy</button></div>
<table><thead><tr><th style="text-align:right">N</th></tr></thead><tbody><tr><td style="text-align:right">1</td></tr></tbody></table>
<ul class="contains-task-list"><li class="task-list-item"><input type="checkbox" checked disabled> done</li><li class="task-list-item"><input type="checkbox" disabled> todo</li></ul>
<p><span class="katex"><span class="katex-mathml"><math><semantics><mrow></mrow><annotation encoding="application/x-tex">x^2</annotation></semantics></math></span><span class="katex-html" aria-hidden="true">x2</span></span></p>
<img src="javascript:alert(1)" onerror="alert(1)" alt="bad">
<a href="javascript:alert(1)">js link</a>
<script>alert(1)</script>
<p onclick="alert(1)" style="color:red">styled</p>
`;

describe("buildRichTextHtml", () => {
  it("inlines styles on tables, code and blockquotes", () => {
    const root = parse(buildRichTextHtml(PREVIEW));
    expect(root.firstElementChild?.getAttribute("style")).toContain("font-family");
    expect(root.querySelector("table")?.getAttribute("style")).toContain("border-collapse:collapse");
    expect(root.querySelector("th")?.getAttribute("style")).toMatch(/background:#f6f8fa.*text-align:right/);
    expect(root.querySelector("td")?.getAttribute("style")).toMatch(/border:1px solid #d0d7de.*text-align:right/);
    expect(root.querySelector("blockquote")?.getAttribute("style")).toContain("border-left:4px solid");
    expect(root.querySelector("pre")?.getAttribute("style")).toContain("white-space:pre-wrap");
    expect(root.querySelector("pre code")?.getAttribute("style")).toContain("background:transparent");
    expect(root.querySelector("p code")?.getAttribute("style")).toContain("background:#eff1f3");
    expect(root.querySelector("pre span")?.getAttribute("style")).toBe("color:#cf222e;");
    expect(root.querySelector("h2")?.getAttribute("style")).toContain("font-size:1.5em");
    expect(root.querySelector("[class]")).toBeNull();
    expect(root.querySelector("[id]")).toBeNull();
    // The code-block wrapper div is unwrapped and its copy button removed.
    expect(root.querySelector("button")).toBeNull();
    expect(root.firstElementChild?.querySelectorAll("div")).toHaveLength(0);
  });

  it("converts task boxes, math and screen-reader text for paste targets", () => {
    const root = parse(buildRichTextHtml(PREVIEW));
    const items = Array.from(root.querySelectorAll("li"), (li) => li.textContent?.trim());
    expect(items).toEqual(["☑  done", "☐  todo"]);
    expect(root.querySelector("li")?.getAttribute("style")).toContain("list-style:none");
    expect(root.textContent).toContain("$x^2$");
    expect(root.textContent).not.toContain("x2x");
    expect(root.textContent).not.toContain("opens in a new tab");
  });

  it("sanitises scripts, handlers and unsafe URLs", () => {
    const html = buildRichTextHtml(PREVIEW);
    const root = parse(html);
    expect(root.querySelector("script")).toBeNull();
    expect(html).not.toMatch(/onerror|onclick|javascript:/i);
    expect(root.querySelector("img")?.hasAttribute("src")).toBe(false);
    expect(root.querySelector("a[target]")).toBeNull();
    expect(root.querySelector("a")?.getAttribute("href")).toBe("https://example.com");
    expect(Array.from(root.querySelectorAll("p")).find((p) => p.textContent === "styled")?.getAttribute("style")).toBe(
      "margin:0 0 1em;color:red;",
    );
  });
});

describe("copyRichText", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it("writes text/html and text/plain with ClipboardItem", async () => {
    const write = vi.fn(async () => undefined);
    class FakeClipboardItem {
      constructor(readonly items: Record<string, Blob | Promise<Blob>>) {}
    }
    vi.stubGlobal("ClipboardItem", FakeClipboardItem);
    vi.stubGlobal("navigator", { clipboard: { write } });

    await copyRichText(parse("<p>Hello <strong>world</strong></p>"), "Hello **world**");

    const [[items]] = write.mock.calls as unknown as [[FakeClipboardItem[]]];
    const html = await (await items[0].items["text/html"]).text();
    const plain = await (await items[0].items["text/plain"]).text();
    expect(html).toContain("<strong>world</strong>");
    expect(html).toContain('style="margin:0 0 1em;"');
    expect(plain).toBe("Hello **world**");
  });

  it("falls back to execCommand with a copy event", () => {
    const data: Record<string, string> = {};
    const execCommand = vi.fn(() => {
      const event = new Event("copy", { cancelable: true }) as ClipboardEvent;
      Object.defineProperty(event, "clipboardData", { value: { setData: (type: string, value: string) => (data[type] = value) } });
      document.dispatchEvent(event);
      return true;
    });
    Object.defineProperty(document, "execCommand", { value: execCommand, configurable: true });
    copyWithExecCommand("<p>Rich</p>", "Plain");
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(data).toEqual({ "text/html": "<p>Rich</p>", "text/plain": "Plain" });
    expect(document.body.children).toHaveLength(0);
  });
});
