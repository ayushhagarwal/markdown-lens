export const MAX_INTERACTIVE_MARKDOWN_CHARACTERS = 1_000_000;
export const MAX_MARKDOWN_LINES = 50_000;
export const MAX_MARKDOWN_HEADINGS = 2_000;
export const MAX_MARKDOWN_CODE_BLOCK_CHARACTERS = 200_000;
export const MAX_MARKDOWN_MATH_DELIMITERS = 5_000;
export const MAX_MARKDOWN_NESTING = 32;
export const MAX_MARKDOWN_LINE_CHARACTERS = 100_000;
export const MAX_MERMAID_DIAGRAMS = 8;
export const MAX_MERMAID_SOURCE_CHARACTERS = 12_000;
export const MAX_MERMAID_GRAPH_STATEMENTS = 500;
export const MAX_MERMAID_SVG_CHARACTERS = 500_000;
export const MARKDOWN_DEGRADED_PREVIEW_CHARACTERS = 20_000;

export type MarkdownBudget = {
  allowed: boolean;
  reason?: string;
  headings: number;
  lines: number;
  mermaidDiagrams: number;
};

export function analyzeMarkdownBudget(markdown: string): MarkdownBudget {
  const budget: MarkdownBudget = {
    allowed: true,
    headings: 0,
    lines: 0,
    mermaidDiagrams: 0,
  };
  if (markdown.length > MAX_INTERACTIVE_MARKDOWN_CHARACTERS) {
    return reject(budget, "The document is too large for the interactive Markdown preview.");
  }

  let offset = 0;
  let fence: { marker: string; characters: number; mermaid: boolean } | null = null;
  let mathDelimiters = 0;
  while (offset <= markdown.length) {
    const newline = markdown.indexOf("\n", offset);
    const end = newline < 0 ? markdown.length : newline;
    const line = markdown.slice(offset, end);
    budget.lines += 1;
    if (budget.lines > MAX_MARKDOWN_LINES) {
      return reject(budget, "The document contains too many lines to preview safely.");
    }
    if (line.length > MAX_MARKDOWN_LINE_CHARACTERS) {
      return reject(budget, "The document contains an excessively long line.");
    }

    const trimmed = line.trimStart();
    const fenceMatch = /^(`{3,}|~{3,})([^`]*)$/.exec(trimmed);
    if (fence) {
      if (trimmed.startsWith(fence.marker)) {
        fence = null;
      } else {
        fence.characters += line.length + 1;
        if (
          fence.characters >
          (fence.mermaid
            ? MAX_MERMAID_SOURCE_CHARACTERS
            : MAX_MARKDOWN_CODE_BLOCK_CHARACTERS)
        ) {
          return reject(
            budget,
            fence.mermaid
              ? "A Mermaid diagram exceeds the source limit."
              : "A code block exceeds the preview limit.",
          );
        }
      }
    } else if (fenceMatch) {
      const language = fenceMatch[2].trim().split(/\s+/, 1)[0]?.toLowerCase();
      const mermaid = language === "mermaid";
      if (mermaid) {
        budget.mermaidDiagrams += 1;
        if (budget.mermaidDiagrams > MAX_MERMAID_DIAGRAMS) {
          return reject(budget, "The document contains too many Mermaid diagrams.");
        }
      }
      fence = { marker: fenceMatch[1], characters: 0, mermaid };
    } else {
      if (/^#{1,6}\s/.test(trimmed)) {
        budget.headings += 1;
        if (budget.headings > MAX_MARKDOWN_HEADINGS) {
          return reject(budget, "The document contains too many headings.");
        }
      }
      const nesting = leadingNesting(line);
      if (nesting > MAX_MARKDOWN_NESTING) {
        return reject(budget, "The document nesting depth exceeds the preview limit.");
      }
      mathDelimiters += countCharacter(line, "$");
      if (mathDelimiters > MAX_MARKDOWN_MATH_DELIMITERS) {
        return reject(budget, "The document contains too many math delimiters.");
      }
    }

    if (newline < 0) break;
    offset = newline + 1;
  }
  return budget;
}

export function assertMermaidSourceBudget(code: string) {
  if (code.length > MAX_MERMAID_SOURCE_CHARACTERS) {
    throw new Error("This Mermaid diagram exceeds the source limit.");
  }
  const statements = code.split(/\n|;/).filter((line) => line.trim().length > 0).length;
  if (statements > MAX_MERMAID_GRAPH_STATEMENTS) {
    throw new Error("This Mermaid diagram contains too many graph statements.");
  }
}

export function countWordsBounded(markdown: string) {
  const limit = Math.min(markdown.length, MAX_INTERACTIVE_MARKDOWN_CHARACTERS);
  let words = 0;
  let insideWord = false;
  for (let index = 0; index < limit; index += 1) {
    const whitespace = /\s/.test(markdown[index]);
    if (!whitespace && !insideWord) words += 1;
    insideWord = !whitespace;
  }
  return words;
}

function leadingNesting(line: string) {
  const trimmed = line.trimStart();
  let nesting = Math.floor((line.length - trimmed.length) / 2);
  let offset = 0;
  while (offset < trimmed.length) {
    const match = /^(?:>\s*|[-+*]\s+|\d+[.)]\s+)/.exec(trimmed.slice(offset));
    if (!match) break;
    nesting += 1;
    offset += match[0].length;
  }
  return nesting;
}

function countCharacter(value: string, character: string) {
  let count = 0;
  for (const current of value) if (current === character) count += 1;
  return count;
}

function reject(budget: MarkdownBudget, reason: string): MarkdownBudget {
  return { ...budget, allowed: false, reason };
}
