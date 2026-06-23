import assert from "node:assert/strict";
import test from "node:test";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import {
  cleanupWordMarkdown,
  convertWordHtmlToMarkdown,
  NoExtractableWordTextError,
} from "./word-to-markdown.ts";

const dependencies = { TurndownService, gfm };

test("converts Word-style HTML into GitHub-flavored Markdown", () => {
  const markdown = convertWordHtmlToMarkdown({
    title: "Team Handbook",
    dependencies,
    html: `
      <h1>Team Handbook</h1>
      <h2>Principles</h2>
      <p><strong>Bold</strong> and <em>italic</em> with <a href="https://example.com">a link</a> and https://docs.example.com.</p>
      <ul><li>First item</li><li>Second item</li></ul>
      <ol><li>Step one</li><li>Step two</li></ol>
      <table>
        <tbody><tr><td><p>Name</p></td><td><p>Status</p></td></tr><tr><td><p>Import</p></td><td><p>Ready</p></td></tr></tbody>
      </table>
    `,
  });

  assert.match(markdown, /^# Team Handbook/m);
  assert.match(markdown, /^## Principles/m);
  assert.match(
    markdown,
    /\*\*Bold\*\* and \*italic\* with \[a link]\(https:\/\/example\.com\) and <https:\/\/docs\.example\.com>\./,
  );
  assert.match(markdown, /- First item/);
  assert.match(markdown, /1\. Step one/);
  assert.match(markdown, /\| Name\s+\| Status\s+\|/);
  assert.match(markdown, /\| Import\s+\| Ready\s+\|/);
});

test("adds a filename title when the Word document has no top-level heading", () => {
  const markdown = convertWordHtmlToMarkdown({
    title: "Imported Notes",
    dependencies,
    html: "<p>Plain imported body.</p>",
  });

  assert.equal(markdown, "# Imported Notes\n\nPlain imported body.\n");
});

test("keeps code, footnotes, superscript, subscript, strikethrough, and image placeholders", () => {
  const markdown = convertWordHtmlToMarkdown({
    title: "Rich Document",
    dependencies,
    html: `
      <h1>Rich Document</h1>
      <pre>const answer = 42;</pre>
      <p>Footnote<sup>1</sup>, exponent<sup>n</sup>, water H<sub>2</sub>O, and <del>removed</del>.</p>
      <p data-markdown-lens-image="true">Image omitted: embedded image 1 (image/png)</p>
    `,
  });

  assert.match(markdown, /```text\nconst answer = 42;\n```/);
  assert.match(markdown, /Footnote\[\^1], exponent\^n\^, water H~2~O, and ~~removed~~\./);
  assert.match(markdown, /> \[Image omitted: embedded image 1 \(image\/png\)]/);
});

test("cleans Word generated anchors, data URI images, and excessive whitespace", () => {
  const markdown = cleanupWordMarkdown(
    "Read [section](#_Toc123)\n\n\n![large](data:image/png;base64,abc)\n\n\nDone.",
  );

  assert.equal(markdown, "Read [section](#)\n\n> [Image omitted: embedded image]\n\nDone.");
});

test("rejects empty Word HTML", () => {
  assert.throws(
    () =>
      convertWordHtmlToMarkdown({
        title: "Empty",
        dependencies,
        html: "<p>   </p>",
      }),
    NoExtractableWordTextError,
  );
});
