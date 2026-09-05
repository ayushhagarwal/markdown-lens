"use client";

import { useCallback, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown as markdownLanguage } from "@codemirror/lang-markdown";
import { getSearchQuery, openSearchPanel, searchPanelOpen } from "@codemirror/search";
import { EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";

const MAX_COUNTED_MATCHES = 10_000;
const BASIC_SETUP = {
  lineNumbers: true,
  foldGutter: false,
  highlightActiveLine: true,
  highlightActiveLineGutter: true,
  bracketMatching: true,
  autocompletion: false,
  searchKeymap: true,
};

class SearchMatchStatus {
  private timer: number | null = null;

  constructor(private view: EditorView) {
    this.schedule();
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.selectionSet || update.transactions.length) this.schedule();
  }

  destroy() {
    if (this.timer !== null) window.clearTimeout(this.timer);
  }

  private schedule() {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.render();
    }, 0);
  }

  private render() {
    const panel = this.view.dom.querySelector<HTMLElement>(".cm-search");
    if (!panel) return;

    let output = panel.querySelector<HTMLOutputElement>("[data-search-match-status]");
    if (!output) {
      output = document.createElement("output");
      output.dataset.searchMatchStatus = "";
      output.setAttribute("aria-live", "polite");
      output.setAttribute("aria-atomic", "true");
      panel.append(output);
    }

    output.textContent = describeSearchMatches(this.view);
  }
}

const searchMatchStatus = ViewPlugin.fromClass(SearchMatchStatus);

function describeSearchMatches(view: EditorView) {
  const query = getSearchQuery(view.state);
  if (!query.search) return "Enter a search term.";
  if (!query.valid) return "Invalid regular expression.";

  const selection = view.state.selection.main;
  let total = 0;
  let current = 0;
  const cursor = query.getCursor(view.state);
  for (let result = cursor.next(); !result.done; result = cursor.next()) {
    const match = result.value;
    total += 1;
    if (match.from === selection.from && match.to === selection.to) current = total;
    if (total >= MAX_COUNTED_MATCHES) break;
  }

  if (total === 0) return "No matches.";
  const totalLabel = total >= MAX_COUNTED_MATCHES ? `${MAX_COUNTED_MATCHES.toLocaleString()}+` : total.toLocaleString();
  return current ? `${current.toLocaleString()} of ${totalLabel} matches` : `${totalLabel} matches`;
}

export function MarkdownEditor({
  value,
  theme,
  onChange,
  onCursorChange,
  onReady,
}: {
  value: string;
  theme: "light" | "dark";
  onChange: (value: string) => void;
  onCursorChange: (position: { line: number; column: number }) => void;
  onReady: (actions: { focus: () => void; openSearch: () => void }) => void;
}) {
  const handleUpdate = useCallback(
    (update: ViewUpdate) => {
      if (!update.selectionSet && !update.docChanged) return;
      if (searchPanelOpen(update.startState) || searchPanelOpen(update.state)) return;
      if (getSearchQuery(update.startState).search || getSearchQuery(update.state).search) return;
      if (!update.docChanged) return;
      const head = update.state.selection.main.head;
      const line = update.state.doc.lineAt(head);
      onCursorChange({ line: line.number, column: head - line.from + 1 });
    },
    [onCursorChange],
  );
  const extensions = useMemo(
    () => [
      markdownLanguage(),
      EditorView.lineWrapping,
      searchMatchStatus,
      EditorView.theme({
        "&": { height: "100%", backgroundColor: "transparent", fontSize: "13.5px" },
        ".cm-scroller": {
          fontFamily: "var(--font-geist-mono), SFMono-Regular, Consolas, monospace",
          lineHeight: "1.72",
        },
        ".cm-content": { padding: "14px 0 80px" },
        ".cm-gutters": {
          backgroundColor: "transparent",
          borderRight: "1px solid hsl(var(--border) / 0.65)",
          color: "hsl(var(--muted-foreground) / 0.66)",
        },
        ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "hsl(var(--accent) / 0.055)" },
        ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
          backgroundColor: "hsl(var(--accent) / 0.22) !important",
        },
        ".cm-cursor": { borderLeftColor: "hsl(var(--accent))" },
        ".cm-panels": {
          backgroundColor: "hsl(var(--surface))",
          color: "hsl(var(--foreground))",
          borderColor: "hsl(var(--border))",
        },
        ".cm-search": {
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          padding: "8px",
          gap: "6px",
        },
        ".cm-search [data-search-match-status]": {
          flex: "1 1 100%",
          minWidth: "0",
          color: "hsl(var(--muted-foreground))",
          fontSize: "11px",
          textAlign: "center",
        },
        ".cm-search input": {
          minWidth: "0",
          flex: "1 1 160px",
          backgroundColor: "hsl(var(--background))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "6px",
          padding: "5px 8px",
          color: "hsl(var(--foreground))",
        },
        ".cm-search button": {
          backgroundImage: "none",
          backgroundColor: "hsl(var(--muted))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "6px",
          color: "hsl(var(--foreground))",
          padding: "4px 8px",
        },
      }),
    ],
    [],
  );

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={theme === "dark" ? "dark" : "light"}
      extensions={extensions}
      basicSetup={BASIC_SETUP}
      onChange={onChange}
      onCreateEditor={(view) => {
        onReady({ focus: () => view.focus(), openSearch: () => void openSearchPanel(view) });
      }}
      onUpdate={handleUpdate}
      aria-label="Markdown editor"
      className="h-full overflow-hidden"
    />
  );
}
