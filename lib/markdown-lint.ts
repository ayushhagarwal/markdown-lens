import GithubSlugger from "github-slugger";
import {
  continuesParagraph,
  isAsciiPunctuation,
  leadingWhitespace,
  looksLikeDelimiterRow,
  maskInline,
  parseDelimiterRow,
  scanMarkdown,
  splitTableCells,
  type ListItemInfo,
  type ScannedLine,
} from "@/lib/markdown-scan";

export type MarkdownIssueSeverity = "error" | "warning" | "info";

export type MarkdownRuleId =
  | "unclosed-code-fence"
  | "broken-anchor"
  | "undefined-reference"
  | "unused-definition"
  | "empty-link"
  | "image-alt"
  | "heading-increment"
  | "multiple-h1"
  | "heading-space"
  | "heading-punctuation"
  | "duplicate-heading"
  | "table-columns"
  | "table-delimiter"
  | "list-marker"
  | "ordered-list-numbering"
  | "trailing-whitespace"
  | "hard-tabs"
  | "blank-lines"
  | "unbalanced-emphasis";

export type MarkdownFix = { from: number; to: number; insert: string; label: string };

export type MarkdownIssue = {
  ruleId: MarkdownRuleId;
  severity: MarkdownIssueSeverity;
  message: string;
  /** 1-based line of `from`. */
  line: number;
  /** 1-based column of `from`. */
  column: number;
  /** Character offsets into the linted document. */
  from: number;
  to: number;
  fix?: MarkdownFix;
};

export type MarkdownLintRule = {
  id: MarkdownRuleId;
  severity: MarkdownIssueSeverity;
  description: string;
  /** Whether issues from this rule can carry a quick fix. */
  fixable: boolean;
};

export type MarkdownLintOptions = {
  /** Set a rule to `false` to disable it. Every rule is on by default. */
  rules?: Partial<Record<MarkdownRuleId, boolean>>;
  /** Maximum number of issues returned, earliest in the document first. */
  maxIssues?: number;
};

export const DEFAULT_MAX_LINT_ISSUES = 500;

export const MARKDOWN_LINT_RULES: readonly MarkdownLintRule[] = [
  { id: "unclosed-code-fence", severity: "error", fixable: true, description: "A fenced code block is never closed, so the rest of the document renders as code." },
  { id: "broken-anchor", severity: "error", fixable: true, description: "An in-document link (#anchor) points to a heading that does not exist." },
  { id: "undefined-reference", severity: "warning", fixable: false, description: "A reference link or image uses a label that is never defined." },
  { id: "unused-definition", severity: "warning", fixable: false, description: "A reference definition is never used by any link or image." },
  { id: "empty-link", severity: "warning", fixable: false, description: "A link has no text, or a link or image has no URL." },
  { id: "image-alt", severity: "warning", fixable: false, description: "An image has no alt text for screen readers." },
  { id: "heading-increment", severity: "warning", fixable: false, description: "A heading skips a level, such as h2 followed by h4." },
  { id: "multiple-h1", severity: "info", fixable: false, description: "The document has more than one top-level (h1) heading." },
  { id: "heading-space", severity: "warning", fixable: true, description: "A heading has no space after its # marks, so it renders as plain text." },
  { id: "heading-punctuation", severity: "info", fixable: true, description: "A heading ends with punctuation such as a period or colon." },
  { id: "duplicate-heading", severity: "info", fixable: false, description: "Two sibling headings under the same parent have the same text." },
  { id: "table-columns", severity: "warning", fixable: false, description: "A table row has a different number of cells than the header." },
  { id: "table-delimiter", severity: "warning", fixable: true, description: "A table is missing its delimiter row or the delimiter row is malformed." },
  { id: "list-marker", severity: "info", fixable: true, description: "An unordered list mixes -, * and + markers." },
  { id: "ordered-list-numbering", severity: "info", fixable: true, description: "An ordered list neither counts up by one nor uses the same number throughout." },
  { id: "trailing-whitespace", severity: "info", fixable: true, description: "A line ends with spaces or tabs that are not a two-space hard break." },
  { id: "hard-tabs", severity: "info", fixable: false, description: "A tab character appears outside code; use spaces instead." },
  { id: "blank-lines", severity: "info", fixable: true, description: "More than two consecutive blank lines." },
  { id: "unbalanced-emphasis", severity: "warning", fixable: false, description: "Bold or emphasis markers such as ** or __ are opened but never closed." },
];

const RULE_SEVERITY = new Map(MARKDOWN_LINT_RULES.map((rule) => [rule.id, rule.severity]));
const SEVERITY_ORDER: Record<MarkdownIssueSeverity, number> = { error: 0, warning: 1, info: 2 };
const DEFINITION = /^ {0,3}\[((?:[^[\]\\]|\\.)+)\]:/;
const HTML_ID = /\b(?:id|name)\s*=\s*["']?([^"'\s>]+)/g;
const TRAILING_PUNCTUATION = /[.,;:!。，；：！]$/;
const URL_TOKEN = /(?:https?:\/\/|www\.)\S+/g;

type AnchorUse = { fragment: string; line: ScannedLine; from: number; to: number };
type ReferenceUse = { label: string; line: ScannedLine; from: number; to: number };
type Definition = { label: string; line: ScannedLine; from: number; to: number; used: boolean };
type EmphasisOpen = { char: string; run: string; line: ScannedLine; from: number };

export function lintMarkdown(markdown: string, options: MarkdownLintOptions = {}): MarkdownIssue[] {
  const maxIssues = Math.max(0, options.maxIssues ?? DEFAULT_MAX_LINT_ISSUES);
  if (!markdown || maxIssues === 0) return [];
  const enabled = (id: MarkdownRuleId) => options.rules?.[id] !== false;
  const hardLimit = Math.max(maxIssues * 4, 1000);
  const issues: MarkdownIssue[] = [];

  const report = (ruleId: MarkdownRuleId, line: ScannedLine, from: number, to: number, message: string, fix?: MarkdownFix) => {
    if (!enabled(ruleId) || issues.length >= hardLimit) return;
    const issue: MarkdownIssue = {
      ruleId,
      severity: RULE_SEVERITY.get(ruleId) ?? "warning",
      message,
      line: line.number,
      column: from - line.from + 1,
      from,
      to: Math.max(from, to),
    };
    if (fix) issue.fix = fix;
    issues.push(issue);
  };

  const { lines, unclosedFences } = scanMarkdown(markdown);
  const lastIndex = lines.length > 1 && lines[lines.length - 1].text === "" ? lines.length - 2 : lines.length - 1;

  for (const fence of unclosedFences) {
    const marker = /[`~]{3,}/.exec(fence.content)?.[0] ?? "```";
    const lead = fence.text.slice(0, fence.prefix) + leadingWhitespace(fence.content);
    report(
      "unclosed-code-fence",
      fence,
      fence.from + lead.length,
      fence.from + fence.text.length,
      `Code fence ${marker} is never closed, so everything after it renders as code.`,
      { from: markdown.length, to: markdown.length, insert: `${markdown.endsWith("\n") ? "" : "\n"}${lead}${marker}\n`, label: "Close the code fence" },
    );
  }

  const slugger = new GithubSlugger();
  const slugs = new Set<string>();
  const htmlIds = new Set<string>();
  const anchors: AnchorUse[] = [];
  const references: ReferenceUse[] = [];
  const shortcutLabels = new Set<string>();
  const definitions = new Map<string, Definition>();
  const lists = new Map<number, { line: ScannedLine; item: ListItemInfo }[]>();
  const headingParents: { level: number; id: number }[] = [];
  const headingKeys = new Set<string>();
  let headingCounter = 0;
  let previousLevel = 0;
  let h1Count = 0;
  let emphasis: EmphasisOpen[] = [];
  let blankStart = -1;
  let previousParagraph = false;
  let previousDefinition = false;

  const flushEmphasis = () => {
    for (const open of emphasis) {
      report("unbalanced-emphasis", open.line, open.from, open.from + open.run.length, `"${open.run}" is opened but never closed.`);
    }
    emphasis = [];
  };

  const flushBlankRun = (end: number) => {
    if (blankStart === -1) return;
    const count = end - blankStart;
    if (count > 2) {
      const first = lines[blankStart];
      const extra = lines[blankStart + 1];
      const last = lines[end - 1];
      report(
        "blank-lines",
        extra,
        extra.from,
        last.from + last.text.length,
        `${count} consecutive blank lines; one is enough.`,
        { from: first.from + first.text.length, to: last.from + last.text.length, insert: "", label: "Remove extra blank lines" },
      );
    }
    blankStart = -1;
  };

  for (let index = 0; index <= lastIndex; index++) {
    const line = lines[index];

    if (line.kind === "blank" && line.prefix === 0) {
      if (blankStart === -1) blankStart = index;
    } else {
      flushBlankRun(index);
    }

    if ((line.kind === "html" || line.kind === "text") && /\b(?:id|name)\s*=/.test(line.text)) {
      HTML_ID.lastIndex = 0;
      for (let match = HTML_ID.exec(line.text); match; match = HTML_ID.exec(line.text)) htmlIds.add(match[1]);
    }

    if (line.kind !== "text" && line.kind !== "blank") {
      flushEmphasis();
      previousParagraph = false;
      previousDefinition = false;
      continue;
    }

    checkWhitespace(line, index);

    if (line.kind === "blank") {
      flushEmphasis();
      previousParagraph = false;
      previousDefinition = false;
      continue;
    }

    const wasParagraph = previousParagraph;
    const wasDefinition = previousDefinition;
    previousParagraph = line.role === "paragraph";
    previousDefinition = false;

    if (line.heading) {
      flushEmphasis();
      checkHeading(line);
      scanInline(line);
      flushEmphasis();
      continue;
    }

    if (line.role === "setext-underline" || line.role === "hr") {
      flushEmphasis();
      continue;
    }

    if (line.role === "table") {
      flushEmphasis();
      if (line.table?.row === "body") {
        const cells = splitTableCells(line.content).length;
        if (cells !== line.table.columns) {
          const start = line.from + line.prefix + leadingWhitespace(line.content).length;
          report("table-columns", line, start, line.from + line.text.trimEnd().length, `Table row has ${cells} ${cells === 1 ? "cell" : "cells"} but the header has ${line.table.columns}.`);
        }
      }
      if (line.table?.row !== "delimiter") scanInline(line);
      flushEmphasis();
      continue;
    }

    if (line.item) {
      flushEmphasis();
      const group = lists.get(line.item.listId);
      if (group) group.push({ line, item: line.item });
      else lists.set(line.item.listId, [{ line, item: line.item }]);
    } else {
      const definition = DEFINITION.exec(line.content);
      if (definition && !definition[1].startsWith("^") && (!wasParagraph || wasDefinition)) {
        previousDefinition = true;
        const label = normalizeLabel(definition[1]);
        const start = line.from + line.prefix + leadingWhitespace(line.content).length;
        const destination = line.content.slice(definition[0].length).trim().split(/\s+/)[0].replace(/^<|>$/g, "");
        if (!definitions.has(label)) definitions.set(label, { label: definition[1], line, from: start, to: line.from + line.prefix + definition[0].length, used: false });
        if (destination.startsWith("#")) {
          const destinationFrom = line.from + line.text.indexOf(destination, line.prefix + definition[0].length);
          anchors.push({ fragment: destination.slice(1), line, from: destinationFrom, to: destinationFrom + destination.length });
        }
        continue;
      }
      checkTableShape(line, index);
    }

    scanInline(line);
  }
  flushBlankRun(lastIndex + 1);
  flushEmphasis();

  for (const anchor of anchors) {
    let fragment = anchor.fragment;
    try {
      fragment = decodeURIComponent(fragment);
    } catch {
      // keep the raw fragment
    }
    if (!fragment || /^(?:user-content-)?fn(?:ref)?-/.test(fragment)) continue;
    const bare = fragment.startsWith("user-content-") ? fragment.slice("user-content-".length) : fragment;
    if (slugs.has(fragment) || slugs.has(bare) || htmlIds.has(fragment)) continue;
    const lower = bare.toLowerCase();
    const slugged = new GithubSlugger().slug(bare);
    const suggestion = slugs.has(lower) ? lower : slugs.has(slugged) ? slugged : null;
    report(
      "broken-anchor",
      anchor.line,
      anchor.from,
      anchor.to,
      suggestion ? `No heading has the id "${fragment}". Did you mean "#${suggestion}"?` : `No heading or element in this document has the id "${fragment}".`,
      suggestion ? { from: anchor.from + 1, to: anchor.to, insert: suggestion, label: `Change to #${suggestion}` } : undefined,
    );
  }

  for (const reference of references) {
    const definition = definitions.get(reference.label);
    if (definition) definition.used = true;
    else report("undefined-reference", reference.line, reference.from, reference.to, `Reference "${reference.label}" is not defined.`);
  }
  for (const label of shortcutLabels) {
    const definition = definitions.get(label);
    if (definition) definition.used = true;
  }
  for (const definition of definitions.values()) {
    if (!definition.used) report("unused-definition", definition.line, definition.from, definition.to, `Reference definition "${definition.label}" is never used.`);
  }

  for (const items of lists.values()) checkList(items);

  issues.sort((a, b) => a.from - b.from || SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.to - b.to);
  return issues.length > maxIssues ? issues.slice(0, maxIssues) : issues;

  function checkWhitespace(line: ScannedLine, index: number) {
    const trailing = /[ \t]+$/.exec(line.text);
    if (trailing) {
      const from = line.from + trailing.index;
      const to = line.from + line.text.length;
      const hardBreak = continuesParagraph(lines, index);
      if (trailing[0] === "  " && hardBreak) {
        // deliberate hard line break
      } else if (hardBreak && /^ {3,}$/.test(trailing[0])) {
        report("trailing-whitespace", line, from, to, `Hard line break uses ${trailing[0].length} spaces; use exactly two.`, { from, to, insert: "  ", label: "Use two spaces" });
      } else {
        const message = trailing.index === 0 ? "Line contains only whitespace." : "Trailing whitespace.";
        report("trailing-whitespace", line, from, to, message, { from, to, insert: "", label: "Remove trailing whitespace" });
      }
    }
    const tab = line.text.indexOf("\t");
    if (tab !== -1 && line.kind === "text") {
      report("hard-tabs", line, line.from + tab, line.from + tab + 1, "Hard tab character; use spaces instead.");
    }
  }

  function checkHeading(line: ScannedLine) {
    const heading = line.heading;
    if (!heading) return;
    const lineStart = line.from + line.prefix + leadingWhitespace(line.content).length;
    if (heading.noSpace) {
      const hashes = "#".repeat(heading.level);
      report("heading-space", line, lineStart, line.from + line.text.trimEnd().length, `Add a space after "${hashes}" so this line renders as a heading.`, {
        from: heading.hashesEnd,
        to: heading.hashesEnd,
        insert: " ",
        label: "Insert space",
      });
      return;
    }

    const plain = headingPlainText(heading.raw);
    slugs.add(slugger.slug(plain));
    const from = heading.textTo > heading.textFrom ? heading.textFrom : lineStart;
    const to = heading.textTo > heading.textFrom ? heading.textTo : line.from + line.text.length;

    if (previousLevel && heading.level > previousLevel + 1) {
      report("heading-increment", line, from, to, `Heading jumps from h${previousLevel} to h${heading.level}; expected h${previousLevel + 1} or higher.`);
    }
    previousLevel = heading.level;

    if (heading.level === 1) {
      h1Count += 1;
      if (h1Count > 1) report("multiple-h1", line, from, to, "Document already has an h1 heading; consider making this h2.");
    }

    const punctuation = TRAILING_PUNCTUATION.exec(plain);
    if (punctuation && !plain.endsWith("...")) {
      const fixable = markdown[heading.textTo - 1] === punctuation[0];
      report(
        "heading-punctuation",
        line,
        from,
        to,
        `Heading ends with "${punctuation[0]}".`,
        fixable ? { from: heading.textTo - 1, to: heading.textTo, insert: "", label: "Remove trailing punctuation" } : undefined,
      );
    }

    while (headingParents.length && headingParents[headingParents.length - 1].level >= heading.level) headingParents.pop();
    const parent = headingParents[headingParents.length - 1]?.id ?? 0;
    const key = `${parent}|${heading.level}|${plain.toLowerCase()}`;
    if (plain && headingKeys.has(key)) {
      report("duplicate-heading", line, from, to, `Another h${heading.level} under the same parent is also titled "${plain}".`);
    } else {
      headingKeys.add(key);
    }
    headingCounter += 1;
    headingParents.push({ level: heading.level, id: headingCounter });
  }

  function checkTableShape(line: ScannedLine, index: number) {
    if (!line.content.includes("|")) return;
    const next = lines[index + 1];
    if (!next || next.kind !== "text" || next.role !== "paragraph" || next.item) return;
    const header = splitTableCells(line.content);
    const lead = next.text.slice(0, next.prefix) + leadingWhitespace(next.content);

    if (looksLikeDelimiterRow(next.content)) {
      const delimiter = parseDelimiterRow(next.content);
      if (delimiter && delimiter.length === header.length) return;
      const cells = splitTableCells(next.content);
      const rebuilt = header.map((_, column) => {
        const cell = (cells[column] ?? "").replace(/=/g, "-");
        const left = cell.startsWith(":");
        const right = cell.length > 1 && cell.endsWith(":");
        return `${left ? ":" : ""}---${right ? ":" : ""}`;
      });
      report(
        "table-delimiter",
        next,
        next.from + lead.length,
        next.from + next.text.trimEnd().length,
        delimiter
          ? `Delimiter row has ${delimiter.length} cells but the header has ${header.length}, so the table will not render.`
          : "Malformed table delimiter row; cells must look like ---, :---, ---: or :---:.",
        { from: next.from + lead.length, to: next.from + next.text.length, insert: `| ${rebuilt.join(" | ")} |`, label: "Rebuild delimiter row" },
      );
      return;
    }

    const previous = lines[index - 1];
    const previousIsRow = previous && previous.kind === "text" && previous.role === "paragraph" && isPipeRow(previous.content);
    if (!previousIsRow && isPipeRow(line.content) && isPipeRow(next.content)) {
      const headerLead = line.text.slice(0, line.prefix) + leadingWhitespace(line.content);
      const end = line.from + line.text.length;
      report("table-delimiter", line, line.from + headerLead.length, line.from + line.text.trimEnd().length, "Table is missing its delimiter row (| --- |), so it renders as plain text.", {
        from: end,
        to: end,
        insert: `\n${headerLead}| ${header.map(() => "---").join(" | ")} |`,
        label: "Insert delimiter row",
      });
    }
  }

  function scanInline(line: ScannedLine) {
    const text = line.text;
    const hasBracket = text.includes("[");
    const hasEmphasis = text.includes("**") || text.includes("__");
    if (!hasBracket && !hasEmphasis) return;
    let masked = maskInline(text);
    if (line.prefix) masked = " ".repeat(line.prefix) + masked.slice(line.prefix);
    if (line.item) {
      const start = line.prefix + line.item.markerStart;
      masked = masked.slice(0, start) + " ".repeat(line.item.markerEnd - line.item.markerStart) + masked.slice(line.prefix + line.item.markerEnd);
    }
    const destinations: [number, number][] = [];
    if (hasBracket) scanLinks(line, text, masked, destinations);
    if (hasEmphasis && (masked.includes("**") || masked.includes("__"))) {
      let emphasisText = masked;
      for (const [start, end] of destinations) emphasisText = emphasisText.slice(0, start) + " ".repeat(end - start) + emphasisText.slice(end);
      emphasisText = emphasisText.replace(URL_TOKEN, (match) => " ".repeat(match.length));
      scanEmphasis(line, emphasisText);
    }
  }

  function scanLinks(line: ScannedLine, text: string, masked: string, destinations: [number, number][]) {
    for (let index = masked.indexOf("["); index !== -1; index = masked.indexOf("[", index + 1)) {
      const close = matchBracket(masked, index);
      if (close === -1) continue;
      const label = text.slice(index + 1, close);
      if (label.startsWith("^")) continue;
      const isImage = index > 0 && masked[index - 1] === "!";
      const start = line.from + (isImage ? index - 1 : index);
      const after = masked[close + 1];

      if (after === "(") {
        const end = matchParen(masked, close + 1);
        if (end === -1) continue;
        destinations.push([close + 1, end + 1]);
        const destination = parseDestination(text.slice(close + 2, end));
        const linkTo = line.from + end + 1;
        if (isImage && !label.trim()) report("image-alt", line, start, linkTo, "Image has no alt text; describe it for screen readers.");
        if (!isImage && !label.trim()) report("empty-link", line, start, linkTo, "Link has no text.");
        if (!destination.url) report("empty-link", line, start, linkTo, isImage ? "Image has no source URL." : "Link has no URL.");
        if (destination.url.startsWith("#")) {
          const urlFrom = line.from + close + 2 + destination.offset;
          anchors.push({ fragment: destination.url.slice(1), line, from: urlFrom, to: urlFrom + destination.url.length });
        }
        continue;
      }

      if (after === "[") {
        const end = masked.indexOf("]", close + 2);
        if (end === -1) continue;
        const reference = text.slice(close + 2, end);
        const linkTo = line.from + end + 1;
        if (isImage && !label.trim()) report("image-alt", line, start, linkTo, "Image has no alt text; describe it for screen readers.");
        if (!isImage && !label.trim()) report("empty-link", line, start, linkTo, "Link has no text.");
        const target = normalizeLabel(reference.trim() ? reference : label);
        if (target) references.push({ label: target, line, from: start, to: linkTo });
        index = end;
        continue;
      }

      const shortcut = normalizeLabel(label);
      if (shortcut) shortcutLabels.add(shortcut);
    }
  }

  function scanEmphasis(line: ScannedLine, masked: string) {
    const runs = /\*{2,}|_{2,}/g;
    for (let match = runs.exec(masked); match; match = runs.exec(masked)) {
      const run = match[0];
      const char = run[0];
      const before = masked[match.index - 1] ?? " ";
      const after = masked[match.index + run.length] ?? " ";
      const beforeSpace = /\s/.test(before);
      const afterSpace = /\s/.test(after);
      const beforePunct = isAsciiPunctuation(before.charCodeAt(0));
      const afterPunct = isAsciiPunctuation(after.charCodeAt(0));
      const left = !afterSpace && (!afterPunct || beforeSpace || beforePunct);
      const right = !beforeSpace && (!beforePunct || afterSpace || afterPunct);
      const canOpen = char === "*" ? left : left && (!right || beforePunct);
      const canClose = char === "*" ? right : right && (!left || afterPunct);
      let openIndex = -1;
      if (canClose) {
        for (let index = emphasis.length - 1; index >= 0; index--) {
          if (emphasis[index].char === char) {
            openIndex = index;
            break;
          }
        }
      }
      if (openIndex !== -1) emphasis.splice(openIndex, 1);
      else if (canOpen) emphasis.push({ char, run, line, from: line.from + match.index });
    }
  }

  function checkList(items: { line: ScannedLine; item: ListItemInfo }[]) {
    const first = items[0].item;
    if (!first.ordered) {
      for (const { line, item } of items) {
        if (item.marker === first.marker) continue;
        const from = line.from + line.prefix + item.markerStart;
        report("list-marker", line, from, from + 1, `List marker "${item.marker}" differs from "${first.marker}" used earlier in this list.`, {
          from,
          to: from + 1,
          insert: first.marker,
          label: `Use "${first.marker}"`,
        });
      }
      return;
    }
    if (items.every(({ item }) => item.number === first.number)) return;
    items.forEach(({ line, item }, position) => {
      const expected = first.number + position;
      if (item.number === expected) return;
      const from = line.from + line.prefix + item.markerStart;
      const to = line.from + line.prefix + item.markerEnd - 1;
      report("ordered-list-numbering", line, from, to + 1, `List item is numbered ${item.number}; expected ${expected}.`, {
        from,
        to,
        insert: String(expected),
        label: `Renumber to ${expected}`,
      });
    });
  }
}

/** Plain text of a heading as rendered (used for GitHub-style slugs). */
export function headingPlainText(raw: string) {
  const codes: string[] = [];
  const escapes: string[] = [];
  const text = raw
    .replace(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g, (_match, _ticks: string, body: string) => {
      codes.push(/^ .* $/.test(body) && body.trim() ? body.slice(1, -1) : body);
      return `\u0000${codes.length - 1}\u0000`;
    })
    .replace(/\\([!-/:-@[-`{-~])/g, (_match, char: string) => {
      escapes.push(char);
      return `\u0001${escapes.length - 1}\u0001`;
    })
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[*~]+/g, "")
    .replace(/(^|[^A-Za-z0-9_À-￿])_+|_+(?=$|[^A-Za-z0-9_À-￿])/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\u0001(\d+)\u0001/g, (_match, index: string) => escapes[Number(index)])
    .replace(/\u0000(\d+)\u0000/g, (_match, index: string) => codes[Number(index)]);
  return text.replace(/\s+/g, " ").trim();
}

function normalizeLabel(label: string) {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

function isPipeRow(content: string) {
  const row = content.trim();
  return row.length > 2 && row.startsWith("|") && row.endsWith("|") && !row.endsWith("\\|") && splitTableCells(row).length >= 2;
}

function matchBracket(text: string, open: number) {
  let depth = 0;
  for (let index = open; index < text.length; index++) {
    const char = text[index];
    if (char === "[") depth += 1;
    else if (char === "]") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function matchParen(text: string, open: number) {
  let depth = 0;
  for (let index = open; index < text.length; index++) {
    const char = text[index];
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function parseDestination(inner: string) {
  const trimmed = inner.trimStart();
  const lead = inner.length - trimmed.length;
  if (trimmed.startsWith("<")) {
    const close = trimmed.indexOf(">");
    return { url: close === -1 ? trimmed.slice(1) : trimmed.slice(1, close), offset: lead + 1 };
  }
  return { url: /^\S*/.exec(trimmed)?.[0] ?? "", offset: lead };
}
