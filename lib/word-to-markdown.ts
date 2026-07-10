export class NoExtractableWordTextError extends Error {
  constructor() {
    super("This Word document does not contain extractable text.");
    this.name = "NoExtractableWordTextError";
  }
}

const DATA_URI_PATTERN = /!\[[^\]]*]\(data:[^)]+\)/gi;
const TOC_ANCHOR_PATTERN = /\]\(#_(?:Toc|heading)[^)]+\)/gi;
const EXCESSIVE_BLANK_LINES_PATTERN = /\n{3,}/g;
const BARE_URL_PATTERN = /(^|[\s(])((?:https?:\/\/)[^\s<>()]+)(?=$|[\s).,;:!?])/gi;

export type HtmlToMarkdownDependencies = {
  TurndownService: typeof import("turndown");
  gfm: import("turndown").Plugin;
};

export function convertWordHtmlToMarkdown({
  html,
  title,
  dependencies,
  imageCount = 0,
}: {
  html: string;
  title: string;
  dependencies: HtmlToMarkdownDependencies;
  imageCount?: number;
}) {
  const normalizedHtml = preprocessWordHtml(html, imageCount);
  const turndown = new dependencies.TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    strongDelimiter: "**",
    linkStyle: "inlined",
  });

  turndown.use(dependencies.gfm);
  addWordMarkdownRules(turndown);

  const markdown = cleanupWordMarkdown(turndown.turndown(normalizedHtml));
  if (markdown.replace(/<!--[\s\S]*?-->/g, "").trim().length === 0) {
    throw new NoExtractableWordTextError();
  }

  return ensureMarkdownTitle(markdown, title);
}

export function cleanupWordMarkdown(markdown: string) {
  return markdown
    .replace(/\r\n?/g, "\n")
    .replace(TOC_ANCHOR_PATTERN, "](#)")
    .replace(DATA_URI_PATTERN, "> [Image omitted: embedded image]")
    .replace(BARE_URL_PATTERN, (match, prefix: string, url: string) => {
      if (prefix.endsWith("(")) return match;
      const trailing = url.match(/[.,;:!?]+$/)?.[0] ?? "";
      const cleanUrl = trailing ? url.slice(0, -trailing.length) : url;
      return `${prefix}<${cleanUrl}>${trailing}`;
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/^([ \t]*[-*+])\s{2,}/gm, "$1 ")
    .replace(/^([ \t]*\d+\.)\s{2,}/gm, "$1 ")
    .replace(/\n{2,}(\s*[-*+]\s+)/g, "\n$1")
    .replace(/\n{2,}(\s*\d+\.\s+)/g, "\n$1")
    .replace(EXCESSIVE_BLANK_LINES_PATTERN, "\n\n")
    .trim();
}

function preprocessWordHtml(html: string, imageCount: number) {
  let output = html
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<\/?(?:w|o|v|m):[^>]*>/gi, "")
    .replace(/\sclass=(["'])?Mso[^"'\s>]*/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?<\/embed>/gi, "");

  output = output.replace(/<body[^>]*>([\s\S]*?)<\/body>/i, "$1");

  let imageIndex = 0;
  output = output.replace(/<img\b([^>]*)>/gi, (match, attributes: string) => {
    imageIndex += 1;
    const src = extractAttribute(attributes, "src");
    if (src.startsWith("assets/")) return match;
    const alt = extractAttribute(attributes, "alt");
    const label = alt ? `: ${escapeHtml(alt)}` : "";
    return `<p data-markdown-lens-image="true">Image omitted${label}</p>`;
  });

  if (imageIndex === 0 && imageCount > 0) {
    output += `\n<p data-markdown-lens-image="true">${imageCount} embedded image${
      imageCount === 1 ? " was" : "s were"
    } omitted</p>`;
  }

  return output;
}

function addWordMarkdownRules(turndown: import("turndown")) {
  turndown.addRule("wordImagePlaceholders", {
    filter(node) {
      return node.nodeName === "P" && node.getAttribute("data-markdown-lens-image") === "true";
    },
    replacement(content) {
      const cleanContent = content.trim() || "Image omitted";
      return `\n\n> [${cleanContent}]\n\n`;
    },
  });

  turndown.addRule("wordTables", {
    filter: ["table"],
    replacement(_content, node) {
      const rows = tableRowsToMarkdown(node);
      return rows ? `\n\n${rows}\n\n` : "";
    },
  });

  turndown.addRule("superscript", {
    filter: ["sup"],
    replacement(content) {
      const cleanContent = content.trim();
      if (/^\d+$/.test(cleanContent)) {
        return `[^${cleanContent}]`;
      }
      return cleanContent ? `^${cleanContent}^` : "";
    },
  });

  turndown.addRule("subscript", {
    filter: ["sub"],
    replacement(content) {
      const cleanContent = content.trim();
      return cleanContent ? `~${cleanContent}~` : "";
    },
  });

  turndown.addRule("underline", {
    filter: ["u"],
    replacement(content) {
      return content;
    },
  });

  turndown.addRule("strikethrough", {
    filter(node) {
      return ["DEL", "S", "STRIKE"].includes(node.nodeName);
    },
    replacement(content) {
      const cleanContent = content.trim();
      return cleanContent ? `~~${cleanContent}~~` : "";
    },
  });

  turndown.addRule("preCode", {
    filter(node) {
      return (
        node.nodeName === "PRE" ||
        (node.nodeName === "P" && /(?:code|source|preformatted)/i.test(node.className))
      );
    },
    replacement(content) {
      const cleanContent = content.replace(/\n{3,}/g, "\n\n").trim();
      return cleanContent ? `\n\n\`\`\`text\n${cleanContent}\n\`\`\`\n\n` : "";
    },
  });
}

function tableRowsToMarkdown(table: HTMLElement) {
  const rows = Array.from(table.getElementsByTagName("tr"))
    .map((row) =>
      Array.from(row.childNodes)
        .filter((cell) => ["TD", "TH"].includes(cell.nodeName))
        .map((cell) => cleanTableCell(cell.textContent ?? "")),
    )
    .filter((row) => row.some((cell) => cell.length > 0));

  if (rows.length === 0) return "";

  const columnCount = Math.max(...rows.map((row) => row.length), 1);
  const normalizedRows = rows.map((row) => [
    ...row,
    ...Array.from({ length: columnCount - row.length }, () => ""),
  ]);
  const [header, ...body] = normalizedRows;
  const delimiter = Array.from({ length: columnCount }, () => "---");
  const markdownRows = [header, delimiter, ...body].map(
    (row) => `| ${row.map(escapeTableCell).join(" | ")} |`,
  );

  return markdownRows.join("\n");
}

function cleanTableCell(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function escapeTableCell(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

function ensureMarkdownTitle(markdown: string, title: string) {
  const safeTitle = title.trim() || "Imported Word Document";
  if (/^#\s+.+$/m.test(markdown)) {
    return `${markdown}\n`;
  }
  return `# ${escapeMarkdownHeading(safeTitle)}\n\n${markdown}`.trim() + "\n";
}

function extractAttribute(attributes: string, name: string) {
  const match = attributes.match(new RegExp(`\\b${name}=(["'])(.*?)\\1`, "i"));
  return match?.[2]?.trim() ?? "";
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeMarkdownHeading(text: string) {
  return text.replace(/^#+\s*/, "").trim();
}
