"use client";

import { memo, useCallback, useMemo, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown as markdownLanguage } from "@codemirror/lang-markdown";
import { getSearchQuery, openSearchPanel, searchPanelOpen } from "@codemirror/search";
import { EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { clipboardImageFiles } from "@/lib/clipboard-images";

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

export type MarkdownEditorActions = {
  focus: () => void;
  openSearch: () => void;
  revealLine: (line: number) => void;
  moveCursorToLine: (line: number) => void;
  insertText: (text: string) => void;
  scrollElement: () => HTMLElement;
};

export const MarkdownEditor = memo(function MarkdownEditor({
  value,
  theme,
  fontSize,
  lineWrap,
  onChange,
  onCursorChange,
  onPasteImages,
  onReady,
}: {
  value: string;
  theme: "light" | "dark";
  fontSize: number;
  lineWrap: boolean;
  onChange: (value: string) => void;
  onCursorChange: (position: { line: number; column: number }) => void;
  onPasteImages: (files: File[]) => Promise<string[]>;
  onReady: (actions: MarkdownEditorActions) => void;
}) {
  const onPasteImagesRef = useRef(onPasteImages);
  onPasteImagesRef.current = onPasteImages;
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
      ...(lineWrap ? [EditorView.lineWrapping] : []),
      searchMatchStatus,
      EditorView.domEventHandlers({
        paste(event, view) {
          const files = clipboardImageFiles(event.clipboardData);
          if (!files.length) return false;
          event.preventDefault();
          const insertAt = view.state.selection.main;
          void onPasteImagesRef.current(files).then((snippets) => {
            if (!snippets.length) return;
            const needsBreak = insertAt.from > 0 && view.state.sliceDoc(insertAt.from - 1, insertAt.from) !== "\n";
            const text = `${needsBreak ? "\n" : ""}${snippets.join("\n")}\n`;
            view.dispatch({
              changes: { from: insertAt.from, to: insertAt.to, insert: text },
              selection: { anchor: insertAt.from + text.length },
            });
          });
          return true;
        },
      }),
      EditorView.theme({
        "&": { height: "100%", backgroundColor: "transparent", fontSize: `${fontSize}px` },
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
        ".cm-search": { padding: "8px", gap: "6px" },
        ".cm-search [data-search-match-status]": {
          minWidth: "92px",
          color: "hsl(var(--muted-foreground))",
          fontSize: "11px",
          textAlign: "center",
        },
        ".cm-search input": {
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
    [fontSize, lineWrap],
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
        const lineAt = (lineNumber: number) => view.state.doc.line(Math.min(Math.max(1, lineNumber), view.state.doc.lines));
        const actions: MarkdownEditorActions = {
          focus: () => view.focus(),
          openSearch: () => void openSearchPanel(view),
          revealLine(lineNumber) {
            const line = lineAt(lineNumber);
            view.dispatch({ effects: EditorView.scrollIntoView(line.from, { y: "start" }) });
          },
          moveCursorToLine(lineNumber) {
            const line = lineAt(lineNumber);
            view.dispatch({
              selection: { anchor: line.from },
              effects: EditorView.scrollIntoView(line.from, { y: "center" }),
            });
            onCursorChange({ line: line.number, column: 1 });
            view.focus();
          },
          insertText(text) {
            const range = view.state.selection.main;
            view.dispatch({
              changes: { from: range.from, to: range.to, insert: text },
              selection: { anchor: range.from + text.length },
            });
            view.focus();
          },
          scrollElement: () => view.scrollDOM,
        };
        const publish = () => {
          if (!view.scrollDOM.isConnected) return;
          if (view.scrollDOM.clientHeight === 0) return;
          onReady(actions);
        };
        publish();
        const observer = new ResizeObserver(publish);
        observer.observe(view.scrollDOM);
      }}
      onUpdate={handleUpdate}
      aria-label="Markdown editor"
      className="h-full overflow-hidden"
    />
  );
}, (previous, next) => previous.value === next.value && previous.theme === next.theme && previous.fontSize === next.fontSize && previous.lineWrap === next.lineWrap);
