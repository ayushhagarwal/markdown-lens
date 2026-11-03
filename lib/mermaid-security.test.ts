import { describe, expect, test } from "vitest";
import { assertMermaidDiagramSafe, sanitizeMermaidSvg, stripMermaidRemoteResources } from "@/lib/mermaid-security";

const diagram = "flowchart LR\nA-->B";

describe("mermaid preview security", () => {
  test("rejects theme and font settings that reference url()", () => {
    expect(() =>
      assertMermaidDiagramSafe(
        `%%{init: {"themeCSS": "svg{background:url(https://attacker.invalid/a.png)}"}}%%\n${diagram}`,
      ),
    ).toThrow(/remote URLs/);
    expect(() =>
      assertMermaidDiagramSafe(
        `%%{init: {"themeVariables": {"fontFamily": "url(https://attacker.invalid/a.woff)"}}}%%\n${diagram}`,
      ),
    ).toThrow(/remote URLs/);
    expect(() =>
      assertMermaidDiagramSafe(
        `---\nconfig:\n  themeCSS: |-\n    .node { background: url(https://attacker.invalid/a.png); }\n---\n${diagram}`,
      ),
    ).toThrow(/remote URLs/);
    expect(() =>
      assertMermaidDiagramSafe(`%%{init: {"fontFamily": "arial", "theme": "dark"}}%%\n${diagram}`),
    ).not.toThrow();
    expect(() => assertMermaidDiagramSafe(diagram)).not.toThrow();
  });

  test("rewrites remote https images and themeCSS url() before render", () => {
    const source = [
      '%%{init: {"themeCSS": "svg{background:url(https://attacker.invalid/theme.png)}"}}%%',
      "flowchart LR",
      'A["![opened](https://attacker.invalid/pixel.png)"] --> B',
      "C[\"<img src='https://attacker.invalid/label.png' alt='x'>\"]",
      "D[h t t p s : / / attacker.invalid/spaced.png]",
    ].join("\n");

    const rewritten = stripMermaidRemoteResources(source);

    expect(rewritten).not.toMatch(/url\s*\(/i);
    expect(rewritten).not.toMatch(/https?:\/\//i);
    expect(rewritten).not.toContain("attacker.invalid");
    expect(rewritten).toContain("flowchart LR");
    expect(rewritten).toContain("--> B");
    expect(() => assertMermaidDiagramSafe(rewritten)).not.toThrow();
  });

  test("rejects font style statements that reference url()", () => {
    expect(() =>
      assertMermaidDiagramSafe(`${diagram}\nstyle A font-family:url(https://attacker.invalid/a.woff)`),
    ).toThrow(/remote URLs/);
  });

  test("removes images, foreign markup, and every url() from rendered SVG", () => {
    const svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">',
      '<style>rect { fill: #fff; background: url(https://attacker.invalid/a.png); }</style>',
      '<image href="https://attacker.invalid/pixel.png" />',
      '<img src="https://attacker.invalid/pixel.png" />',
      '<use href="#icon" />',
      '<foreignObject><img src="https://attacker.invalid/pixel.png" /></foreignObject>',
      '<rect fill="url(#gradient)" style="stroke:url(https://attacker.invalid/b.png)" />',
      '<a href="javascript:alert(1)"><text>Label</text></a>',
      "<script>alert(1)</script>",
      "</svg>",
    ].join("");

    const sanitized = sanitizeMermaidSvg(svg);
    expect(sanitized).not.toMatch(/<(?:img|image|use|foreignObject|script)\b/i);
    expect(sanitized).not.toMatch(/url\s*\(/i);
    expect(sanitized).not.toMatch(/javascript:/i);
    expect(sanitized).toContain("<text>Label</text>");
    expect(sanitized).toContain("fill: #fff");
  });
});
