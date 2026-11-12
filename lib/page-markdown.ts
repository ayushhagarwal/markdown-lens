import type { ConversionLandingPageConfig } from "@/components/conversion-landing-page";
import type { FormatLandingConfig } from "@/components/format-landing-page";
import { cheatsheetFaq, cheatsheetQuickReference, cheatsheetSections } from "@/lib/cheatsheet";
import { pdfPageConfig, wordPageConfig } from "@/lib/conversion-pages";
import { formatPages } from "@/lib/format-pages";
import { privacySections, privacySummary } from "@/lib/privacy";
import { converterLinks, modifiedFor, siteConfig, sitemapPaths } from "@/lib/site";
import { supportedFormats } from "@/lib/supported-formats";

/**
 * Plain Markdown versions of the public pages, for AI agents and other
 * text-first clients. Served at /<page>.md and to requests that send
 * `Accept: text/markdown` (see the rewrites in next.config.ts).
 */

const url = (path: string) => `${siteConfig.url}${path === "/" ? "" : path}`;

/** Fence a code sample with a run of backticks longer than any inside it. */
function fence(language: string, content: string) {
  const longest = Math.max(0, ...[...content.matchAll(/`+/g)].map((match) => match[0].length));
  const ticks = "`".repeat(Math.max(3, longest + 1));
  return `${ticks}${language}\n${content}\n${ticks}`;
}

function cell(value: string) {
  return value.replace(/\|/g, "\\|");
}

function table(head: readonly string[], rows: readonly (readonly string[])[]) {
  return [
    `| ${head.map(cell).join(" | ")} |`,
    `| ${head.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ].join("\n");
}

function header(path: string, title: string, summary: string) {
  return [
    `# ${title}`,
    `> ${summary}`,
    `Source: ${url(path)} · Updated ${modifiedFor(path)} · ${siteConfig.name}, free and open source: ${siteConfig.githubUrl}`,
  ].join("\n\n");
}

function faqBlock(faq: readonly { question: string; answer: string }[]) {
  return ["## Frequently asked questions", ...faq.map((item) => `### ${item.question}\n\n${item.answer}`)].join("\n\n");
}

function relatedBlock(related: readonly { href: string; title: string; description: string }[]) {
  return ["## Related", related.map((item) => `- [${item.title}](${url(item.href)}): ${item.description}`).join("\n")].join("\n\n");
}

function formatPageMarkdown(config: FormatLandingConfig) {
  const parts = [
    header(config.path, config.title, config.summary),
    config.description,
    `Open the converter: ${url(config.path)} (drop a ${config.extensions} file on the page; it is processed in your browser and not uploaded).`,
    `## Steps\n\n${config.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}`,
  ];
  if (config.sample) {
    parts.push(
      [
        `## ${config.sample.heading}`,
        `Input: \`${config.sample.fileName}\` (${config.sample.sourceLabel})`,
        config.sample.sourceLines.map((line) => `- \`${line.replace(/`/g, "'")}\``).join("\n"),
        "Markdown output:",
        fence("markdown", config.sample.markdown),
        config.sample.note ?? "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
  }
  parts.push(`## What the converter preserves\n\n${config.preserves.map((item) => `- ${item}`).join("\n")}`);
  parts.push(`## Limitations\n\n${config.limitations.map((item) => `- ${item}`).join("\n")}`);
  for (const section of config.sections ?? []) {
    const body = [`## ${section.heading}`, ...(section.paragraphs ?? [])];
    if (section.list) body.push(section.list.map((item, index) => (section.ordered ? `${index + 1}. ${item}` : `- ${item}`)).join("\n"));
    if (section.table) body.push(table(section.table.head, section.table.rows));
    if (section.code) body.push(fence("", section.code));
    if (section.links?.length) body.push(section.links.map((link) => `- [${link.label}](${url(link.href)})`).join("\n"));
    parts.push(body.join("\n\n"));
  }
  parts.push(faqBlock(config.faq), relatedBlock(config.related));
  return parts.join("\n\n");
}

function conversionPageMarkdown(config: ConversionLandingPageConfig) {
  return [
    header(config.path, config.title, config.summary),
    config.supportingSummary,
    `Open the converter: ${url(config.path)} (choose a file; it is processed in your browser and not uploaded).`,
    `## Example\n\nInput: \`${config.sourceFileName}\` (${config.sourceLabel})\n\n${fence("markdown", config.markdownLines.join("\n"))}`,
    `## Highlights\n\n${config.highlights.map((item) => `- ${item}`).join("\n")}`,
    `## Steps\n\n${config.steps.map((step, index) => `${index + 1}. **${step.title}.** ${step.description}`).join("\n")}`,
    `## ${config.outputHeading}\n\n${config.outputIntro}\n\n${config.outputItems.map((item) => `- **${item.title}:** ${item.description}`).join("\n")}`,
    `## ${config.limitsHeading}\n\n${config.limitsIntro}\n\n${config.limitations.map((item) => `- ${item}`).join("\n")}`,
    `## Use cases\n\n${config.useCases.map((item) => `- **${item.title}:** ${item.description}`).join("\n")}`,
    faqBlock(config.faq),
    relatedBlock(config.related),
  ].join("\n\n");
}

function cheatsheetMarkdown() {
  return [
    header(
      "/markdown-cheatsheet",
      "Markdown cheat sheet",
      "Markdown formats plain text with a few symbols: # for headings, ** for bold, - for lists, [text](url) for links, and backticks for code. This reference uses GitHub-flavored Markdown; math and Mermaid render in Markdown Lens and on GitHub.",
    ),
    `## Quick reference\n\n${table(["Element", "Markdown syntax"], cheatsheetQuickReference.map(([element, syntax]) => [element, `\`${syntax}\``]))}`,
    ...cheatsheetSections.map((section) =>
      [`## ${section.title}`, section.description, ...section.examples.map((example) => `### ${example.title}\n\n${fence("markdown", example.syntax)}`)].join("\n\n"),
    ),
    faqBlock(cheatsheetFaq),
  ].join("\n\n");
}

function homeMarkdown() {
  return [
    header("/", siteConfig.name, siteConfig.description),
    "## What it is\n\nMarkdown Lens is a free, open-source Markdown editor that also converts documents to Markdown. Write with a live GitHub-style preview, or open a document and get editable Markdown back. Everything runs in the browser: files are not uploaded and no account is needed. It can be installed to work offline.",
    `## Converters\n\n${converterLinks.map((link) => `- [${link.label} to Markdown](${url(link.href)}): ${link.description}`).join("\n")}`,
    `## Features\n\n${siteConfig.features.map((feature) => `- ${feature}`).join("\n")}`,
    `## More\n\n- [Markdown editor](${url("/editor")})\n- [Supported formats](${url("/supported-formats")})\n- [Markdown cheat sheet](${url("/markdown-cheatsheet")})\n- [About and contact](${url("/about")})\n- [Privacy policy](${url("/privacy")})\n- [Source code](${siteConfig.githubUrl})`,
  ].join("\n\n");
}

function supportedFormatsMarkdown() {
  return [
    header(
      "/supported-formats",
      "Supported Markdown and document formats",
      "Markdown Lens opens, converts, edits, and exports these formats entirely in the browser.",
    ),
    table(
      ["Format", "Extensions", "Workflow", "Important limitation"],
      supportedFormats.map(([format, extensions, workflow, limitation, href]) => [`[${format}](${url(href)})`, extensions, workflow, limitation]),
    ),
    "Legacy binary DOC, PPT, and XLS files must be exported to DOCX, PPTX, or XLSX first.",
  ].join("\n\n");
}

function aboutMarkdown() {
  return [
    header(
      "/about",
      "About Markdown Lens",
      `Markdown Lens is a free, open-source Markdown editor and document-to-Markdown converter that runs entirely in the browser, built and maintained by ${siteConfig.author.name} (${siteConfig.author.url}).`,
    ),
    "## Why it exists\n\nMost online converters upload your document to a server. Markdown Lens converts it on your device instead, then opens the result next to an editor and a GitHub-style preview so you can check it before you use it.",
    `## Contact\n\n- Report a bug: ${siteConfig.githubUrl}/issues/new?template=bug_report.yml\n- Request a feature: ${siteConfig.githubUrl}/issues/new?template=feature_request.yml\n- Report a security issue: ${siteConfig.githubUrl}/blob/main/SECURITY.md\n- Contribute: ${siteConfig.githubUrl}/blob/main/CONTRIBUTING.md`,
  ].join("\n\n");
}

function privacyMarkdown() {
  return [
    header("/privacy", "Markdown Lens privacy policy", privacySummary),
    ...privacySections.map((section) => [`## ${section.heading}`, ...section.body].join("\n\n")),
  ].join("\n\n");
}

const builders: Record<string, () => string> = {
  "/": homeMarkdown,
  "/pdf-to-markdown": () => conversionPageMarkdown(pdfPageConfig),
  "/word-to-markdown": () => conversionPageMarkdown(wordPageConfig),
  "/supported-formats": supportedFormatsMarkdown,
  "/markdown-cheatsheet": cheatsheetMarkdown,
  "/about": aboutMarkdown,
  "/privacy": privacyMarkdown,
  ...Object.fromEntries(Object.values(formatPages).map((config) => [config.path, () => formatPageMarkdown(config)])),
};

/** Public paths that have a Markdown version: every sitemap page. */
export const markdownPagePaths = sitemapPaths.map((entry) => entry.path || "/").filter((path) => path in builders);

export function pageMarkdown(path: string) {
  const build = builders[path];
  return build ? `${build().trim()}\n` : null;
}
