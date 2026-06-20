"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clipboard,
  Code2,
  Download,
  Eye,
  FileCode2,
  FileDown,
  FileUp,
  Github,
  Loader2,
  Moon,
  MoreHorizontal,
  PanelLeft,
  PanelRight,
  Printer,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { buildStandaloneHtmlDocument } from "@/lib/standalone-html";
import { cn } from "@/lib/utils";

type ViewMode = "split" | "editor" | "preview";
type Theme = "light" | "dark";
type CopyState = "idle" | "markdown" | "html" | "error";
type KeyboardShortcutActions = {
  hasContent: boolean;
  download: () => void;
  copyMarkdown: () => void;
  copyHtml: () => void;
  showPreview: () => void;
  showEditor: () => void;
  loadSample: () => void;
};
type ImportNotice =
  | { tone: "success"; message: string }
  | { tone: "error"; message: string }
  | null;

const STORAGE_KEY = "markdown-lens:draft";
const THEME_KEY = "markdown-lens:theme";

const sampleMarkdown = `# Markdown Lens Sample

Beautiful Markdown previews for docs, READMEs, changelogs, and AI notes.

## What it handles

- GitHub-flavored Markdown
- Tables, task lists, and strikethrough
- Syntax highlighted code blocks
- Mermaid diagrams
- Inline math like $E = mc^2$ and block math

### Task list

- [x] Paste a messy AI note
- [x] Preview it instantly
- [ ] Export the polished version

> Privacy note: this draft stays in your browser. Markdown Lens does not upload your content.

| Feature | Status | Notes |
| --- | --- | --- |
| GFM | Ready | Tables, tasks, autolinks |
| Mermaid | Ready | Flowcharts and diagrams |
| Math | Ready | KaTeX rendering |

\`\`\`ts
type Release = {
  name: string;
  version: string;
  shipped: boolean;
};

const release: Release = {
  name: "Markdown Lens",
  version: "0.1.0",
  shipped: true,
};
\`\`\`

\`\`\`mermaid
flowchart LR
  A[Paste Markdown] --> B[Render Preview]
  B --> C{Need output?}
  C -->|Copy| D[Markdown or HTML]
  C -->|Export| E[Download or Print]
\`\`\`

Block math:

$$
\\int_0^1 x^2\\,dx = \\frac{1}{3}
$$

Strikethrough works too: ~~old draft~~ polished document.
`;

const placeholder =
  "Paste AI notes, a README, changelog, design doc, or technical Markdown here...";

export function MarkdownLensApp() {
  const [markdown, setMarkdown] = useState("");
  const [hasHydrated, setHasHydrated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [mobilePane, setMobilePane] = useState<"editor" | "preview">("editor");
  const [theme, setTheme] = useState<Theme>("light");
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [importNotice, setImportNotice] = useState<ImportNotice>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragDepthRef = useRef(0);

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolvedTheme = storedTheme ?? (prefersDark ? "dark" : "light");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(resolvedTheme);

    const savedDraft = localStorage.getItem(STORAGE_KEY);
    if (savedDraft !== null) {
      setMarkdown(savedDraft);
    }
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    if (hasHydrated) {
      localStorage.setItem(THEME_KEY, theme);
    }
  }, [hasHydrated, theme]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (markdown.trim().length > 0) {
      localStorage.setItem(STORAGE_KEY, markdown);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [hasHydrated, markdown]);

  useEffect(() => {
    if (copyState === "idle") return;
    const timeout = window.setTimeout(() => setCopyState("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  useEffect(() => {
    if (!importNotice) return;
    const timeout = window.setTimeout(() => setImportNotice(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [importNotice]);

  const stats = useMemo(() => {
    const words = markdown.trim().match(/\S+/g)?.length ?? 0;
    const characters = markdown.length;
    const minutes = Math.max(1, Math.ceil(words / 220));

    return { words, characters, minutes };
  }, [markdown]);

  const isEmpty = markdown.trim().length === 0;

  const copyText = useCallback(async (text: string, state: CopyState) => {
    try {
      if (navigator.clipboard && document.hasFocus()) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.left = "-1000px";
        textarea.style.position = "fixed";
        textarea.style.top = "-1000px";
        document.body.appendChild(textarea);
        textarea.select();
        const didCopy = document.execCommand("copy");
        document.body.removeChild(textarea);

        if (!didCopy) {
          throw new Error("Copy command was not available.");
        }
      }

      setCopyState(state);
    } catch {
      setCopyState("error");
    }
  }, []);

  const handleCopyMarkdown = useCallback(async () => {
    if (isEmpty) return;
    await copyText(markdown, "markdown");
  }, [copyText, isEmpty, markdown]);

  const handleCopyHtml = useCallback(async () => {
    if (isEmpty) return;
    const html = previewRef.current?.innerHTML ?? "";
    await copyText(html, "html");
  }, [copyText, isEmpty]);

  const handleLoadSample = useCallback(() => {
    if (!isEmpty && !window.confirm("Replace the current draft with the Markdown Lens sample?")) {
      return;
    }
    setMarkdown(sampleMarkdown);
    setMobilePane("preview");
  }, [isEmpty]);

  const handleClear = useCallback(() => {
    if (isEmpty) return;
    if (!window.confirm("Clear the editor and remove the saved local draft?")) {
      return;
    }
    setMarkdown("");
    localStorage.removeItem(STORAGE_KEY);
    setMobilePane("editor");
  }, [isEmpty]);

  const handleDownload = useCallback(() => {
    if (isEmpty) return;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "markdown-lens-document.md";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [isEmpty, markdown]);

  const handleExportHtml = useCallback(() => {
    if (isEmpty || !previewRef.current) return;

    const safePreviewHtml = sanitizePreviewHtml(previewRef.current);
    const documentTitle = getDocumentTitle(markdown);
    const html = buildStandaloneHtmlDocument({
      bodyHtml: safePreviewHtml,
      title: documentTitle,
    });
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    downloadBlob(blob, `${toFileName(documentTitle)}.html`);
  }, [isEmpty, markdown]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const handleShowPreview = useCallback(() => {
    setViewMode("preview");
    setMobilePane("preview");
  }, []);

  const handleShowEditor = useCallback(() => {
    setViewMode("editor");
    setMobilePane("editor");
  }, []);

  useKeyboardShortcuts({
    hasContent: !isEmpty,
    download: handleDownload,
    copyMarkdown: handleCopyMarkdown,
    copyHtml: handleCopyHtml,
    showPreview: handleShowPreview,
    showEditor: handleShowEditor,
    loadSample: handleLoadSample,
  });

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepthRef.current += 1;

    if (event.dataTransfer.types.includes("Files")) {
      setIsDraggingFile(true);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setIsDraggingFile(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      dragDepthRef.current = 0;
      setIsDraggingFile(false);

      const file = event.dataTransfer.files.item(0);
      if (!file) {
        setImportNotice({
          tone: "error",
          message: "No file was found. Drop a .md or .markdown file to import it.",
        });
        return;
      }

      const extension = file.name.split(".").pop()?.toLowerCase();
      const isMarkdownFile =
        extension === "md" || extension === "markdown" || file.type === "text/markdown";

      if (!isMarkdownFile) {
        setImportNotice({
          tone: "error",
          message: `"${file.name}" is not supported. Choose a .md or .markdown file.`,
        });
        return;
      }

      if (
        !isEmpty &&
        !window.confirm(`Replace the current draft with "${file.name}"?`)
      ) {
        return;
      }

      try {
        const content = await file.text();
        setMarkdown(content);
        setMobilePane("preview");
        setImportNotice({
          tone: "success",
          message: `Imported "${file.name}" locally. Nothing was uploaded.`,
        });
      } catch {
        setImportNotice({
          tone: "error",
          message: `Could not read "${file.name}". Please try another Markdown file.`,
        });
      }
    },
    [isEmpty],
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="app-shell mx-auto flex min-h-screen w-full max-w-[1800px] flex-col px-4 sm:px-6 lg:px-8">
        <header className="flex min-h-16 flex-col gap-3 border-b border-border/80 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-surface shadow-sm">
              <Eye className="h-5 w-5 text-accent" aria-hidden />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold tracking-normal">Markdown Lens</p>
                <span className="rounded-full border border-accent/25 bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                  Open Source
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">
                Private Markdown preview for notes, READMEs, changelogs, and docs.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <a
              href="https://github.com/ayushhagarwal/markdown-lens"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border/80 bg-surface px-3 text-sm font-medium text-panel-foreground shadow-sm transition hover:border-ring hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Github className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">ayushhagarwal/markdown-lens</span>
              <span className="sm:hidden">GitHub</span>
            </a>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/80 bg-surface text-panel-foreground shadow-sm transition hover:border-ring hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <section className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
              Online Markdown Editor and Viewer
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              Preview Markdown instantly with GitHub-style rendering, Mermaid diagrams, code
              highlighting, math, tables, and dark mode.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-border/80 bg-surface px-3 py-2 text-sm text-muted-foreground shadow-sm">
            <ShieldCheck className="h-4 w-4 text-accent" aria-hidden />
            <span>Drafts stay in localStorage on this device.</span>
          </div>
        </section>

        <section className="sticky top-0 z-20 -mx-4 border-y border-border/80 bg-background/92 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="grid gap-3 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center">
            <div className="hidden w-fit items-center gap-1 rounded-lg border border-border/80 bg-surface p-1 shadow-sm lg:flex">
              <ModeButton icon={PanelLeft} label="Split" active={viewMode === "split"} onClick={() => setViewMode("split")} />
              <ModeButton
                icon={Code2}
                label="Editor"
                active={viewMode === "editor"}
                onClick={handleShowEditor}
                shortcut="⌘/Ctrl ⇧ E"
                ariaShortcut="Meta+Shift+E Control+Shift+E"
              />
              <ModeButton
                icon={PanelRight}
                label="Preview"
                active={viewMode === "preview"}
                onClick={handleShowPreview}
                shortcut="⌘/Ctrl ⇧ P"
                ariaShortcut="Meta+Shift+P Control+Shift+P"
              />
            </div>

            <div className="flex w-full items-center gap-1 rounded-lg border border-border/80 bg-surface p-1 shadow-sm lg:hidden">
              <ModeButton
                icon={Code2}
                label="Editor"
                active={mobilePane === "editor"}
                onClick={handleShowEditor}
                shortcut="⌘/Ctrl ⇧ E"
                ariaShortcut="Meta+Shift+E Control+Shift+E"
              />
              <ModeButton
                icon={Eye}
                label="Preview"
                active={mobilePane === "preview"}
                onClick={handleShowPreview}
                shortcut="⌘/Ctrl ⇧ P"
                ariaShortcut="Meta+Shift+P Control+Shift+P"
              />
            </div>

            <div className="hidden flex-wrap items-center gap-2 md:flex xl:justify-center">
              <ToolbarButton
                icon={Sparkles}
                label="Load sample"
                onClick={handleLoadSample}
                shortcut="⌘/Ctrl ⇧ L"
                ariaShortcut="Meta+Shift+L Control+Shift+L"
                emphasis
              />
              <ToolbarButton
                icon={copyState === "markdown" ? Check : Clipboard}
                label={
                  copyState === "markdown"
                    ? "Copied"
                    : copyState === "error"
                      ? "Copy failed"
                      : "Copy Markdown"
                }
                onClick={handleCopyMarkdown}
                shortcut="⌘/Ctrl ⇧ C"
                ariaShortcut="Meta+Shift+C Control+Shift+C"
                disabled={isEmpty}
              />
              <ToolbarButton
                icon={copyState === "html" ? Check : FileCode2}
                label={
                  copyState === "html"
                    ? "Copied HTML"
                    : copyState === "error"
                      ? "Copy failed"
                      : "Copy HTML"
                }
                onClick={handleCopyHtml}
                shortcut="⌘/Ctrl ⇧ H"
                ariaShortcut="Meta+Shift+H Control+Shift+H"
                disabled={isEmpty}
              />
              <ToolbarButton
                icon={Download}
                label="Download .md"
                onClick={handleDownload}
                shortcut="⌘/Ctrl S"
                ariaShortcut="Meta+S Control+S"
                disabled={isEmpty}
              />
              <ToolbarButton
                icon={FileDown}
                label="Export HTML"
                onClick={handleExportHtml}
                disabled={isEmpty}
              />
              <ToolbarButton icon={Printer} label="Print / PDF" onClick={handlePrint} disabled={isEmpty} />
              <ToolbarButton icon={Trash2} label="Clear" onClick={handleClear} disabled={isEmpty} tone="danger" />
            </div>

            <MobileToolbar
              copyState={copyState}
              isEmpty={isEmpty}
              onLoadSample={handleLoadSample}
              onCopyMarkdown={handleCopyMarkdown}
              onCopyHtml={handleCopyHtml}
              onDownload={handleDownload}
              onPrint={handlePrint}
              onClear={handleClear}
            />

            <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground md:flex md:flex-wrap md:items-center xl:justify-end">
              <Stat label="Words" value={stats.words.toLocaleString()} />
              <Stat label="Chars" value={stats.characters.toLocaleString()} />
              <Stat label="Read" value={`${stats.minutes} min`} />
            </div>
          </div>
        </section>

        <div
          className="relative flex flex-1 flex-col"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {importNotice ? <ImportNoticeBanner notice={importNotice} /> : null}
          <section
            className={cn(
              "grid flex-1 gap-4 py-4",
              viewMode === "split" && "lg:grid-cols-2",
              viewMode !== "split" && "lg:grid-cols-1",
            )}
          >
            <EditorPanel
              value={markdown}
              onChange={setMarkdown}
              hiddenOnDesktop={viewMode === "preview"}
              hiddenOnMobile={mobilePane !== "editor"}
            />
            <PreviewPanel
              markdown={markdown}
              previewRef={previewRef}
              theme={theme}
              hiddenOnDesktop={viewMode === "editor"}
              hiddenOnMobile={mobilePane !== "preview"}
            />
          </section>
          {isDraggingFile ? <DropOverlay /> : null}
        </div>

        <footer className="flex flex-col gap-2 border-t border-border py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Want to improve Markdown Lens?{" "}
            <a
              href="https://github.com/ayushhagarwal/markdown-lens"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              Star or contribute on GitHub
            </a>
            .
          </p>
          <a
            href="/markdown-cheatsheet"
            className="w-fit font-medium text-accent underline-offset-4 hover:underline"
          >
            Markdown cheatsheet
          </a>
        </footer>
      </div>
    </main>
  );
}

function EditorPanel({
  value,
  onChange,
  hiddenOnDesktop,
  hiddenOnMobile,
}: {
  value: string;
  onChange: (value: string) => void;
  hiddenOnDesktop: boolean;
  hiddenOnMobile: boolean;
}) {
  return (
    <section
      className={cn(
        "panel-height overflow-hidden rounded-lg border border-border/80 bg-panel shadow-panel ring-1 ring-black/[0.02] dark:ring-white/[0.04]",
        hiddenOnMobile && "hidden lg:block",
        hiddenOnDesktop && "lg:hidden",
      )}
      aria-label="Markdown editor"
    >
      <div className="flex h-11 items-center justify-between border-b border-border/80 bg-surface px-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Code2 className="h-4 w-4 text-accent" aria-hidden />
          Editor
        </div>
        <span className="text-xs text-muted-foreground">Drop .md files here</span>
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        placeholder={placeholder}
        className="h-[calc(100%-2.75rem)] w-full resize-none bg-transparent p-5 font-mono text-sm leading-6 text-panel-foreground caret-accent outline-none selection:bg-accent/15 placeholder:text-muted-foreground/65 sm:p-6"
      />
    </section>
  );
}

function PreviewPanel({
  markdown,
  previewRef,
  theme,
  hiddenOnDesktop,
  hiddenOnMobile,
}: {
  markdown: string;
  previewRef: React.RefObject<HTMLDivElement | null>;
  theme: Theme;
  hiddenOnDesktop: boolean;
  hiddenOnMobile: boolean;
}) {
  const components = useMarkdownComponents(theme);
  const isEmpty = markdown.trim().length === 0;

  return (
    <section
      className={cn(
        "panel-height overflow-hidden rounded-lg border border-border/80 bg-panel shadow-panel ring-1 ring-black/[0.02] dark:ring-white/[0.04]",
        hiddenOnMobile && "hidden lg:block",
        hiddenOnDesktop && "lg:hidden",
      )}
      aria-label="Markdown preview"
    >
      <div className="flex h-11 items-center justify-between border-b border-border/80 bg-surface px-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Eye className="h-4 w-4 text-accent" aria-hidden />
          Preview
        </div>
        <span className="text-xs text-muted-foreground">GitHub-style output</span>
      </div>
      <div className="h-[calc(100%-2.75rem)] overflow-auto">
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div ref={previewRef} className="print-area markdown-body mx-auto w-full max-w-[980px] px-5 py-7 sm:px-8 lg:px-10">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[
                [rehypeKatex, { throwOnError: false, strict: false }],
                rehypeHighlight,
              ]}
              components={components}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </section>
  );
}

function ImportNoticeBanner({ notice }: { notice: Exclude<ImportNotice, null> }) {
  const isError = notice.tone === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "mt-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm",
        isError
          ? "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200"
          : "border-accent/30 bg-accent-soft text-foreground",
      )}
    >
      {isError ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
      )}
      <span>{notice.message}</span>
    </div>
  );
}

function DropOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-xl border-2 border-dashed border-accent bg-background/90 p-6 backdrop-blur-sm">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <FileUp className="h-7 w-7" aria-hidden />
        </div>
        <p className="mt-4 text-lg font-semibold">Drop your Markdown file</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Accepts .md and .markdown files. The file is read only in your browser.
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-[420px] items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-border/80 bg-accent-soft">
          <FileCode2 className="h-6 w-6 text-accent" aria-hidden />
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-normal">No preview yet</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Your rendered document will appear here.
        </p>
      </div>
    </div>
  );
}

function useMarkdownComponents(theme: Theme): Components {
  return useMemo(
    () => ({
      code(props) {
        const { className, children, ...rest } = props;
        const match = /language-(\w+)/.exec(className ?? "");
        const language = match?.[1]?.toLowerCase();
        const code = String(children).replace(/\n$/, "");

        if (language === "mermaid") {
          return <MermaidDiagram code={code} theme={theme} />;
        }

        return (
          <code className={className} {...rest}>
            {children}
          </code>
        );
      },
      a(props) {
        return <a {...props} target="_blank" rel="noreferrer" />;
      },
    }),
    [theme],
  );
}

function MermaidDiagram({ code, theme }: { code: string; theme: Theme }) {
  const [state, setState] = useState<{
    status: "loading" | "ready" | "error";
    svg?: string;
    error?: string;
  }>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: theme === "dark" ? "dark" : "default",
        });

        const id = `markdown-lens-mermaid-${crypto.randomUUID()}`;
        const { svg } = await mermaid.render(id, code);
        if (!cancelled) {
          setState({ status: "ready", svg });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            error: error instanceof Error ? error.message : "Unable to render this Mermaid diagram.",
          });
        }
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: "loading" });
    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [code, theme]);

  if (state.status === "loading") {
    return (
      <div className="not-prose my-5 flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Rendering Mermaid diagram
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="not-prose my-5 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-800 dark:text-red-200">
        <div className="font-semibold">Mermaid diagram could not be rendered.</div>
        <pre className="mt-3 overflow-auto whitespace-pre-wrap rounded-md bg-background p-3 font-mono text-xs text-foreground">
          {state.error}
        </pre>
      </div>
    );
  }

  return (
    <div
      className="not-prose my-5 overflow-auto rounded-lg border border-border bg-white p-4 dark:bg-slate-950"
      dangerouslySetInnerHTML={{ __html: state.svg ?? "" }}
    />
  );
}

function ModeButton({
  icon: Icon,
  label,
  active,
  onClick,
  shortcut,
  ariaShortcut,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
  shortcut?: string;
  ariaShortcut?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-keyshortcuts={ariaShortcut}
      className={cn(
        "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface lg:h-8 lg:flex-none",
        active
          ? "bg-foreground text-background shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone = "default",
  emphasis = false,
  shortcut,
  ariaShortcut,
  className,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  emphasis?: boolean;
  shortcut?: string;
  ariaShortcut?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-keyshortcuts={ariaShortcut}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border border-border/80 bg-surface px-3 text-sm font-medium text-panel-foreground shadow-sm transition hover:border-ring hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:border-border/60 disabled:bg-muted/60 disabled:text-muted-foreground disabled:shadow-none",
        emphasis && "border-accent/30 bg-accent-soft text-accent hover:bg-accent-soft/80",
        tone === "danger" && "hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-200",
        className,
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function MobileToolbar({
  copyState,
  isEmpty,
  onLoadSample,
  onCopyMarkdown,
  onCopyHtml,
  onDownload,
  onPrint,
  onClear,
}: {
  copyState: CopyState;
  isEmpty: boolean;
  onLoadSample: () => void;
  onCopyMarkdown: () => void;
  onCopyHtml: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onClear: () => void;
}) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    if (!isMoreOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMoreOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isMoreOpen]);

  const runAndClose = (action: () => void) => () => {
    action();
    setIsMoreOpen(false);
  };

  return (
    <div className="grid gap-2 md:hidden">
      <div className="grid grid-cols-2 gap-2">
        <ToolbarButton
          icon={Sparkles}
          label="Load sample"
          onClick={onLoadSample}
          shortcut="⌘/Ctrl ⇧ L"
          ariaShortcut="Meta+Shift+L Control+Shift+L"
          className="h-11 w-full justify-center px-2"
          emphasis
        />
        <ToolbarButton
          icon={copyState === "markdown" ? Check : Clipboard}
          label={copyState === "markdown" ? "Copied" : "Copy Markdown"}
          onClick={onCopyMarkdown}
          shortcut="⌘/Ctrl ⇧ C"
          ariaShortcut="Meta+Shift+C Control+Shift+C"
          className="h-11 w-full justify-center px-2"
          disabled={isEmpty}
        />
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsMoreOpen((current) => !current)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border/80 bg-surface px-3 text-sm font-medium text-panel-foreground shadow-sm transition hover:border-ring hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-expanded={isMoreOpen}
          aria-controls="mobile-secondary-actions"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
          More actions
          <ChevronDown
            className={cn("h-4 w-4 transition", isMoreOpen && "rotate-180")}
            aria-hidden
          />
        </button>
        {isMoreOpen ? (
          <div
            id="mobile-secondary-actions"
            className="absolute right-0 top-[calc(100%+0.5rem)] z-30 grid w-72 max-w-[calc(100vw-2rem)] gap-2 rounded-lg border border-border/80 bg-panel p-2 shadow-panel"
          >
            <ToolbarButton
              icon={copyState === "html" ? Check : FileCode2}
              label={copyState === "html" ? "Copied HTML" : "Copy HTML"}
              onClick={runAndClose(onCopyHtml)}
              shortcut="⌘/Ctrl ⇧ H"
              ariaShortcut="Meta+Shift+H Control+Shift+H"
              className="h-11 w-full justify-start shadow-none"
              disabled={isEmpty}
            />
            <ToolbarButton
              icon={Download}
              label="Download .md"
              onClick={runAndClose(onDownload)}
              shortcut="⌘/Ctrl S"
              ariaShortcut="Meta+S Control+S"
              className="h-11 w-full justify-start shadow-none"
              disabled={isEmpty}
            />
            <ToolbarButton
              icon={Printer}
              label="Print / PDF"
              onClick={runAndClose(onPrint)}
              className="h-11 w-full justify-start shadow-none"
              disabled={isEmpty}
            />
            <ToolbarButton
              icon={Trash2}
              label="Clear"
              onClick={runAndClose(onClear)}
              className="h-11 w-full justify-start shadow-none"
              disabled={isEmpty}
              tone="danger"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function useKeyboardShortcuts({
  hasContent,
  download,
  copyMarkdown,
  copyHtml,
  showPreview,
  showEditor,
  loadSample,
}: KeyboardShortcutActions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        event.altKey ||
        (!event.metaKey && !event.ctrlKey)
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      let action: (() => void) | undefined;

      if (!event.shiftKey && key === "s") {
        if (!hasContent) return;
        action = download;
      } else if (event.shiftKey && key === "c") {
        if (!hasContent) return;
        action = copyMarkdown;
      } else if (event.shiftKey && key === "h") {
        if (!hasContent) return;
        action = copyHtml;
      } else if (event.shiftKey && key === "p") {
        action = showPreview;
      } else if (event.shiftKey && key === "e") {
        action = showEditor;
      } else if (event.shiftKey && key === "l") {
        action = loadSample;
      }

      if (!action) return;

      event.preventDefault();
      action();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [copyHtml, copyMarkdown, download, hasContent, loadSample, showEditor, showPreview]);
}

function sanitizePreviewHtml(preview: HTMLDivElement) {
  const clone = preview.cloneNode(true) as HTMLDivElement;
  clone
    .querySelectorAll("script, style, link, meta, base, iframe, object, embed, form, input, button")
    .forEach((element) => element.remove());

  clone.querySelectorAll("*").forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      const isEventHandler = name.startsWith("on");
      const isUnsafeUrl =
        (name === "href" || name === "src" || name === "xlink:href") &&
        (value.startsWith("javascript:") || value.startsWith("data:text/html"));

      if (isEventHandler || name === "srcdoc" || isUnsafeUrl) {
        element.removeAttribute(attribute.name);
      }
    }
  });

  clone.querySelectorAll("a").forEach((anchor) => {
    anchor.setAttribute("rel", "noreferrer noopener");
  });

  return clone.innerHTML;
}

function getDocumentTitle(markdown: string) {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || "Markdown Lens Document";
}

function toFileName(title: string) {
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "markdown-lens-document";
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md border border-border/80 bg-surface px-2 shadow-sm md:h-8 md:justify-start md:px-2.5">
      <span>{label}</span>
      <span className="truncate text-foreground">{value}</span>
    </span>
  );
}
