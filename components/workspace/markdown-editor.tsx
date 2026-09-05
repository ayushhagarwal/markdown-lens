"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown as markdownLanguage } from "@codemirror/lang-markdown";
import { getSearchQuery, openSearchPanel, searchPanelOpen } from "@codemirror/search";
import { EditorView, type ViewUpdate } from "@codemirror/view";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const searchStatusRef = useRef<HTMLOutputElement>(null);
  const handleUpdate = useCallback(
    (update: ViewUpdate) => {
      if (!update.selectionSet && !update.docChanged && !update.transactions.length) return;
      const head = update.state.selection.main.head;
      const line = update.state.doc.lineAt(head);
      if (!searchPanelOpen(update.startState) && !searchPanelOpen(update.state)) {
        onCursorChange({ line: line.number, column: head - line.from + 1 });
      }
    },
    [onCursorChange],
  );
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const refreshSearchStatus = () => {
      const view = viewRef.current;
      const output = searchStatusRef.current;
      if (!view || !output) return;
      const open = container.querySelector(".cm-search") !== null;
      if (output.hidden === open) output.hidden = !open;
      if (open) {
        const nextStatus = describeSearchMatches(view);
        if (output.textContent !== nextStatus) output.textContent = nextStatus;
      }
    };
    const observer = new MutationObserver(refreshSearchStatus);
    observer.observe(container, { childList: true, subtree: true });
    container.addEventListener("input", refreshSearchStatus, true);
    container.addEventListener("click", refreshSearchStatus, true);
    refreshSearchStatus();
    return () => {
      observer.disconnect();
      container.removeEventListener("input", refreshSearchStatus, true);
      container.removeEventListener("click", refreshSearchStatus, true);
    };
  }, []);
  const extensions = useMemo(
    () => [
      markdownLanguage(),
      EditorView.lineWrapping,
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
          padding: "8px",
          gap: "6px",
          alignItems: "center",
          flexWrap: "wrap",
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
    <div ref={containerRef} className="relative h-full overflow-hidden">
      <CodeMirror
        value={value}
        height="100%"
        theme={theme === "dark" ? "dark" : "light"}
        extensions={extensions}
        basicSetup={BASIC_SETUP}
        onChange={onChange}
        onCreateEditor={(view) => {
          viewRef.current = view;
          onReady({
            focus: () => view.focus(),
            openSearch: () => {
              void openSearchPanel(view);
            },
          });
        }}
        onUpdate={handleUpdate}
        aria-label="Markdown editor"
        className="h-full overflow-hidden"
      />
      <output ref={searchStatusRef} hidden className="pointer-events-none absolute bottom-2 right-3 z-10 rounded border border-border bg-panel/95 px-2 py-1 text-[11px] text-muted-foreground" aria-live="polite" aria-atomic="true" />
    </div>
  );
}
