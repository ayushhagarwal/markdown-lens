import { lintGutter, linter, nextDiagnostic, openLintPanel, type Diagnostic } from "@codemirror/lint";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { formatMarkdown, selectLintFixes, type MarkdownFormatOptions } from "@/lib/markdown-format";
import { lintMarkdown, type MarkdownIssue, type MarkdownLintOptions } from "@/lib/markdown-lint";

export type MarkdownLintExtensionOptions = {
  /** Called with the full issue list after every lint run. */
  onIssues?: (issues: MarkdownIssue[]) => void;
  /** Milliseconds of idle time before linting (default 600). */
  delay?: number;
  lint?: MarkdownLintOptions;
};

const DEFAULT_DELAY = 600;

/** CodeMirror lint source, gutter and app-themed tooltips/panel for Markdown. */
export function markdownLintExtension(options: MarkdownLintExtensionOptions = {}): Extension {
  return [
    linter(
      (view) => {
        const issues = lintMarkdown(view.state.doc.toString(), options.lint);
        options.onIssues?.(issues);
        return issues.map(toDiagnostic);
      },
      { delay: options.delay ?? DEFAULT_DELAY },
    ),
    lintGutter(),
    markdownLintTheme,
  ];
}

export function toDiagnostic(issue: MarkdownIssue): Diagnostic {
  const fix = issue.fix;
  return {
    from: issue.from,
    to: issue.to,
    severity: issue.severity,
    message: issue.message,
    source: issue.ruleId,
    actions: fix
      ? [
          {
            name: fix.label,
            // `from` is the diagnostic's current position; shift the fix by the same amount.
            apply(view, from) {
              const delta = from - issue.from;
              const docLength = view.state.doc.length;
              const fixFrom = Math.min(docLength, fix.from + delta);
              const fixTo = Math.min(docLength, fix.to + delta);
              view.dispatch({ changes: { from: fixFrom, to: fixTo, insert: fix.insert }, userEvent: "input.lint-fix" });
            },
          },
        ]
      : undefined,
  };
}

/** Opens and focuses CodeMirror's lint panel. */
export function openMarkdownLintPanel(view: EditorView) {
  return openLintPanel(view);
}

/** Moves the selection to the next lint issue (wraps around). */
export function nextMarkdownIssue(view: EditorView) {
  return nextDiagnostic(view);
}

/**
 * Applies every non-overlapping quick fix as one undoable transaction.
 * Returns the number of fixes applied.
 */
export function fixAllMarkdownIssues(view: EditorView, options?: MarkdownLintOptions) {
  const fixes = selectLintFixes(lintMarkdown(view.state.doc.toString(), options));
  if (!fixes.length) return 0;
  view.dispatch({
    changes: fixes.map(({ from, to, insert }) => ({ from, to, insert })),
    userEvent: "input.lint-fix",
  });
  return fixes.length;
}

/**
 * Formats the document as one undoable transaction that only replaces the
 * changed middle section, so the cursor and scroll position stay put.
 * Returns whether anything changed.
 */
export function formatMarkdownDocument(view: EditorView, options?: MarkdownFormatOptions) {
  const current = view.state.doc.toString();
  const next = formatMarkdown(current, options);
  if (next === current) return false;
  let start = 0;
  const limit = Math.min(current.length, next.length);
  while (start < limit && current.charCodeAt(start) === next.charCodeAt(start)) start += 1;
  let end = 0;
  while (
    end < limit - start &&
    current.charCodeAt(current.length - 1 - end) === next.charCodeAt(next.length - 1 - end)
  ) {
    end += 1;
  }
  view.dispatch({
    changes: { from: start, to: current.length - end, insert: next.slice(start, next.length - end) },
    userEvent: "input.format",
  });
  return true;
}

const severityColors = {
  error: "hsl(var(--danger))",
  warning: "hsl(var(--highlight))",
  info: "hsl(var(--accent))",
};

const markdownLintTheme = EditorView.theme({
  ".cm-lintRange": {
    backgroundImage: "none",
    paddingBottom: "0",
    textDecorationLine: "underline",
    textDecorationStyle: "wavy",
    textDecorationThickness: "1px",
    textUnderlineOffset: "3px",
  },
  ".cm-lintRange-error": { textDecorationColor: severityColors.error },
  ".cm-lintRange-warning": { textDecorationColor: severityColors.warning },
  ".cm-lintRange-info": { textDecorationColor: "hsl(var(--accent) / 0.65)" },
  ".cm-lintRange-hint": { textDecorationColor: "hsl(var(--muted-foreground) / 0.6)" },
  ".cm-lintRange-active": { backgroundColor: "hsl(var(--accent) / 0.12)" },
  ".cm-tooltip.cm-tooltip-lint": {
    backgroundColor: "hsl(var(--surface))",
    color: "hsl(var(--foreground))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    boxShadow: "0 12px 32px -18px hsl(var(--shadow-color) / 0.45)",
    padding: "4px",
    maxWidth: "min(420px, 90vw)",
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    fontSize: "12px",
  },
  ".cm-diagnostic": {
    padding: "6px 8px 6px 10px",
    marginLeft: "0",
    borderLeft: "3px solid hsl(var(--border))",
    borderRadius: "4px",
    lineHeight: "1.45",
    whiteSpace: "normal",
  },
  ".cm-diagnostic-error": { borderLeftColor: severityColors.error },
  ".cm-diagnostic-warning": { borderLeftColor: severityColors.warning },
  ".cm-diagnostic-info": { borderLeftColor: severityColors.info },
  ".cm-diagnosticSource": {
    marginTop: "2px",
    color: "hsl(var(--muted-foreground))",
    fontFamily: "var(--font-geist-mono), SFMono-Regular, Consolas, monospace",
    fontSize: "10.5px",
    opacity: "1",
  },
  ".cm-diagnosticAction": {
    backgroundColor: "hsl(var(--accent))",
    color: "hsl(var(--accent-foreground))",
    border: "none",
    borderRadius: "6px",
    padding: "2px 8px",
    margin: "6px 6px 0 0",
    fontSize: "11px",
    fontWeight: "600",
    cursor: "pointer",
  },
  ".cm-diagnosticAction:focus-visible": { outline: "2px solid hsl(var(--ring))", outlineOffset: "2px" },
  ".cm-panel.cm-panel-lint": {
    backgroundColor: "hsl(var(--surface))",
    color: "hsl(var(--foreground))",
    borderTop: "1px solid hsl(var(--border))",
  },
  ".cm-panel.cm-panel-lint ul": { maxHeight: "160px" },
  ".cm-panel.cm-panel-lint ul [aria-selected]": {
    backgroundColor: "hsl(var(--accent) / 0.1)",
    backgroundImage: "none",
  },
  ".cm-panel.cm-panel-lint ul:focus [aria-selected]": {
    backgroundColor: "hsl(var(--accent) / 0.2)",
    color: "hsl(var(--foreground))",
  },
  ".cm-panel.cm-panel-lint button[name=close]": {
    color: "hsl(var(--muted-foreground))",
    backgroundColor: "transparent",
  },
  ".cm-gutter-lint": { width: "14px" },
  ".cm-gutter-lint .cm-gutterElement": { display: "flex", alignItems: "center", justifyContent: "center", padding: "0" },
  ".cm-lint-marker": {
    content: "normal",
    width: "7px",
    height: "7px",
    borderRadius: "999px",
  },
  ".cm-lint-marker-error": { content: "normal", backgroundColor: severityColors.error },
  ".cm-lint-marker-warning": { content: "normal", backgroundColor: severityColors.warning },
  ".cm-lint-marker-info": { content: "normal", backgroundColor: severityColors.info },
});
