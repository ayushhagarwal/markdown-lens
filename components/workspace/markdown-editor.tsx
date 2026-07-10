"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown as markdownLanguage } from "@codemirror/lang-markdown";
import { openSearchPanel } from "@codemirror/search";
import { EditorView } from "@codemirror/view";

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
        ".cm-search": { padding: "8px", gap: "6px" },
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
    [],
  );

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={theme === "dark" ? "dark" : "light"}
      extensions={extensions}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        bracketMatching: true,
        autocompletion: false,
        searchKeymap: true,
      }}
      onChange={onChange}
      onCreateEditor={(view) => {
        onReady({ focus: () => view.focus(), openSearch: () => void openSearchPanel(view) });
      }}
      onUpdate={(update) => {
        if (!update.selectionSet && !update.docChanged) return;
        const head = update.state.selection.main.head;
        const line = update.state.doc.lineAt(head);
        onCursorChange({ line: line.number, column: head - line.from + 1 });
      }}
      aria-label="Markdown editor"
      className="h-full overflow-hidden"
    />
  );
}
