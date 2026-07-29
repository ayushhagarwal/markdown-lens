import { escapeMarkdownText, fencedCodeBlock } from "@/lib/converters/helpers";

export type PdfTextSpan = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName?: string;
};

export type PdfPageInput = {
  pageNumber: number;
  width: number;
  height: number;
  spans: PdfTextSpan[];
  links?: string[];
};

export type PdfConversionInput = {
  title: string;
  pages: PdfPageInput[];
};

type PdfLine = {
  text: string;
  y: number;
  x: number;
  fontSize: number;
  monospaced: boolean;
  gapAfter: number;
};

type PreparedPage = {
  pageNumber: number;
  height: number;
  lines: PdfLine[];
  links: string[];
};

const BULLET_PATTERN = /^[\u2022\u2023\u25e6\u2043\u2219\u25aa\u25cf\u00b7\-*]\s+/;
const NUMBERED_LIST_PATTERN = /^(\d+)[.)]\s+/;
const URL_PATTERN = /\bhttps?:\/\/[^\s<>()]+/gi;
const MONOSPACE_PATTERN = /(mono|courier|consolas|menlo|code)/i;

export class NoExtractablePdfTextError extends Error {
  constructor() {
    super("This PDF does not contain extractable text. Scanned PDFs need OCR.");
    this.name = "NoExtractablePdfTextError";
  }
}

export function convertPdfPagesToMarkdown({ title, pages }: PdfConversionInput) {
  const preparedPages = pages.map(preparePage);
  const safeTitle = normalizeText(title) || "Imported PDF";
  const firstLine = preparedPages[0]?.lines[0];
  if (
    firstLine &&
    preparedPages[0].lines.length > 1 &&
    normalizeText(firstLine.text).toLowerCase() === safeTitle.toLowerCase()
  ) {
    preparedPages[0].lines.shift();
  }
  const totalCharacters = preparedPages.reduce(
    (total, page) => total + page.lines.reduce((pageTotal, line) => pageTotal + line.text.length, 0),
    0,
  );

  if (totalCharacters === 0) {
    throw new NoExtractablePdfTextError();
  }

  removeRepeatedMargins(preparedPages);
  const bodyFontSize = inferBodyFontSize(preparedPages);
  const sections = preparedPages.map((page) => pageToMarkdown(page, bodyFontSize));

  return `# ${escapeMarkdownText(safeTitle)}\n\n${sections.join("\n\n---\n\n")}`.trim() + "\n";
}

export function groupPdfTextIntoLines(page: PdfPageInput): PdfLine[] {
  const spans = page.spans
    .filter((span) => normalizeText(span.text).length > 0)
    .sort((left, right) => {
      const verticalDifference = right.y - left.y;
      if (Math.abs(verticalDifference) > Math.max(left.fontSize, right.fontSize) * 0.35) {
        return verticalDifference;
      }
      return left.x - right.x;
    });

  const groups: PdfTextSpan[][] = [];

  for (const span of spans) {
    const existing = groups.find((group) => {
      const averageY = group.reduce((sum, item) => sum + item.y, 0) / group.length;
      const averageSize = group.reduce((sum, item) => sum + item.fontSize, 0) / group.length;
      return Math.abs(averageY - span.y) <= Math.max(2, averageSize * 0.4);
    });

    if (existing) {
      existing.push(span);
    } else {
      groups.push([span]);
    }
  }

  const lines = groups
    .map((group) => {
      const ordered = [...group].sort((left, right) => left.x - right.x);
      const fontSize = median(ordered.map((span) => span.fontSize));
      const y = ordered.reduce((sum, span) => sum + span.y, 0) / ordered.length;
      const text = joinSpans(ordered);

      return {
        text,
        y,
        x: ordered[0]?.x ?? 0,
        fontSize,
        monospaced: ordered.some((span) => MONOSPACE_PATTERN.test(span.fontName ?? "")),
        gapAfter: 0,
      };
    })
    .filter((line) => line.text.length > 0)
    .sort((left, right) => right.y - left.y || left.x - right.x);

  return lines.map((line, index) => ({
    ...line,
    gapAfter: index < lines.length - 1 ? Math.max(0, line.y - lines[index + 1].y) : 0,
  }));
}

function preparePage(page: PdfPageInput): PreparedPage {
  const lines = groupPdfTextIntoLines(page);
  return {
    pageNumber: page.pageNumber,
    height: page.height,
    lines: lines.filter(
      (line) => !isStandalonePageNumber(line.text) || !isMarginLine(line, page.height),
    ),
    links: [...new Set((page.links ?? []).filter(isSafeWebUrl))],
  };
}

function pageToMarkdown(page: PreparedPage, bodyFontSize: number) {
  if (page.lines.length === 0) {
    return `<!-- Page ${page.pageNumber}: no extractable text -->`;
  }

  const blocks: string[] = [`<!-- Page ${page.pageNumber} -->`];
  let paragraph: PdfLine[] = [];
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(joinParagraphLines(paragraph));
    paragraph = [];
  };

  const flushCode = () => {
    if (codeLines.length === 0) return;
    blocks.push(fencedCodeBlock("text", codeLines.join("\n")));
    codeLines = [];
  };

  for (const line of page.lines) {
    const headingLevel = inferHeadingLevel(line, bodyFontSize);
    const listItem = normalizeListItem(line.text);

    if (line.monospaced && !headingLevel && !listItem) {
      flushParagraph();
      codeLines.push(line.text);
      continue;
    }

    flushCode();

    if (headingLevel) {
      flushParagraph();
      blocks.push(`${"#".repeat(headingLevel)} ${escapeMarkdownText(line.text)}`);
      continue;
    }

    if (listItem) {
      flushParagraph();
      blocks.push(listItem);
      continue;
    }

    paragraph.push(line);
    const paragraphBreak = line.gapAfter > Math.max(bodyFontSize * 1.75, line.fontSize * 1.55);
    if (paragraphBreak || /[.!?:;]["')\]]?$/.test(line.text)) {
      flushParagraph();
    }
  }

  flushParagraph();
  flushCode();

  const pageText = page.lines.map((line) => line.text).join(" ");
  const additionalLinks = page.links.filter((link) => !pageText.includes(link));
  if (additionalLinks.length > 0) {
    blocks.push(
      ["**Links from this page**", ...additionalLinks.map((link) => `- <${link}>`)].join("\n"),
    );
  }

  return blocks.join("\n\n");
}

function inferHeadingLevel(line: PdfLine, bodyFontSize: number) {
  const text = line.text.trim();
  if (
    text.length === 0 ||
    text.length > 140 ||
    BULLET_PATTERN.test(text) ||
    NUMBERED_LIST_PATTERN.test(text)
  ) {
    return 0;
  }

  const ratio = line.fontSize / Math.max(bodyFontSize, 1);
  if (ratio >= 1.65) return 2;
  if (ratio >= 1.35) return 3;
  if (ratio >= 1.15) return 4;
  return 0;
}

function inferBodyFontSize(pages: PreparedPage[]) {
  const sizes = pages.flatMap((page) =>
    page.lines
      .filter((line) => line.text.length >= 30 && !line.monospaced)
      .map((line) => Math.round(line.fontSize * 2) / 2),
  );
  const fallback = pages.flatMap((page) => page.lines.map((line) => line.fontSize));
  return median(sizes.length > 0 ? sizes : fallback) || 12;
}

function removeRepeatedMargins(pages: PreparedPage[]) {
  if (pages.length < 2) return;

  const occurrences = new Map<string, Set<number>>();
  pages.forEach((page, pageIndex) => {
    const candidates = page.lines.filter((line) => isMarginLine(line, page.height));
    for (const line of candidates) {
      const key = normalizeRepeatedLine(line.text);
      if (key.length < 3) continue;
      const pageNumbers = occurrences.get(key) ?? new Set<number>();
      pageNumbers.add(pageIndex);
      occurrences.set(key, pageNumbers);
    }
  });

  const threshold = Math.max(2, Math.ceil(pages.length * 0.5));
  const repeated = new Set(
    [...occurrences.entries()]
      .filter(([, pageNumbers]) => pageNumbers.size >= threshold)
      .map(([text]) => text),
  );

  for (const page of pages) {
    page.lines = page.lines.filter(
      (line) =>
        !isMarginLine(line, page.height) || !repeated.has(normalizeRepeatedLine(line.text)),
    );
  }
}

function isMarginLine(line: PdfLine, pageHeight: number) {
  return line.y >= pageHeight * 0.88 || line.y <= pageHeight * 0.12;
}

function joinSpans(spans: PdfTextSpan[]) {
  let output = "";
  let previous: PdfTextSpan | undefined;

  for (const span of spans) {
    const text = normalizeText(span.text);
    if (!text) continue;

    if (previous) {
      const previousEnd = previous.x + previous.width;
      const gap = span.x - previousEnd;
      const averageCharacterWidth =
        previous.text.length > 0 ? previous.width / previous.text.length : previous.fontSize * 0.5;
      const needsSpace =
        gap > Math.max(1, averageCharacterWidth * 0.3) &&
        !/[\s([{/"'-]$/.test(output) &&
        !/^[,.;:!?%)}\]/]/.test(text);
      if (needsSpace) output += " ";
    }

    output += text;
    previous = span;
  }

  return output.replace(/\s+/g, " ").trim();
}

function joinParagraphLines(lines: PdfLine[]) {
  return lines.reduce((output, line, index) => {
    const text = linkBareUrls(line.text);
    if (index === 0) return text;
    if (output.endsWith("-") && /^[a-z]/.test(line.text)) {
      return output.slice(0, -1) + text;
    }
    return `${output} ${text}`;
  }, "");
}

function normalizeListItem(text: string) {
  if (BULLET_PATTERN.test(text)) {
    return `- ${linkBareUrls(text.replace(BULLET_PATTERN, "").trim())}`;
  }

  const numbered = text.match(NUMBERED_LIST_PATTERN);
  if (numbered) {
    return `${numbered[1]}. ${linkBareUrls(text.replace(NUMBERED_LIST_PATTERN, "").trim())}`;
  }

  return null;
}

function linkBareUrls(text: string) {
  const matches = [...text.matchAll(URL_PATTERN)];
  if (matches.length === 0) return escapeMarkdownText(text);

  let output = "";
  let cursor = 0;
  for (const match of matches) {
    const index = match.index ?? cursor;
    const url = match[0];
    const trailing = url.match(/[.,;:!?]+$/)?.[0] ?? "";
    const cleanUrl = trailing ? url.slice(0, -trailing.length) : url;
    output += escapePdfTextSegment(text.slice(cursor, index));
    output += isSafeWebUrl(cleanUrl)
      ? `<${cleanUrl}>`
      : escapeMarkdownText(cleanUrl);
    output += escapeMarkdownText(trailing);
    cursor = index + url.length;
  }
  return output + escapePdfTextSegment(text.slice(cursor));
}

function escapePdfTextSegment(value: string) {
  const escaped = escapeMarkdownText(value);
  if (!escaped) return /\s/.test(value) ? " " : "";
  return `${/^\s/.test(value) ? " " : ""}${escaped}${/\s$/.test(value) ? " " : ""}`;
}

function isStandalonePageNumber(text: string) {
  return /^(?:page\s+)?\d+(?:\s+(?:of|\/)\s+\d+)?$/i.test(text.trim());
}

function normalizeRepeatedLine(text: string) {
  return normalizeText(text)
    .toLowerCase()
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ");
}

function normalizeText(text: string) {
  return text.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function isSafeWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}
