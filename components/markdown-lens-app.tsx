"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Clipboard,
  Code2,
  Download,
  Eye,
  FileCode2,
  FileDown,
  FileText,
  FileUp,
  Github,
  Loader2,
  Moon,
  PanelLeft,
  PanelRight,
  Printer,
  Sparkles,
  Sun,
  Trash2,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import {
  importPdfAsMarkdown,
  PdfImportError,
  PDF_SIZE_LIMIT_BYTES,
} from "@/lib/pdf-import";
import {
  importWordAsMarkdown,
  WordImportError,
  WORD_SIZE_LIMIT_BYTES,
} from "@/lib/word-import";
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
  | { tone: "progress"; message: string }
  | null;
type ImportProgress = {
  fileName: string;
  kind: "pdf" | "word";
  currentPage?: number;
  totalPages?: number;
} | null;

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

const starterTemplates = [
  {
    id: "readme",
    label: "README",
    description: "Project overview",
    icon: FileText,
    markdown: `# Project name

A concise description of what this project does.

## Getting started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Features

- Fast to set up
- Easy to extend
- Ready to document
`,
  },
  {
    id: "meeting",
    label: "Meeting notes",
    description: "Decisions and actions",
    icon: CalendarDays,
    markdown: `# Meeting notes

**Date:** Add date

## Agenda

1. Project update
2. Open decisions
3. Next steps

## Action items

- [ ] Owner — follow-up
`,
  },
  {
    id: "changelog",
    label: "Changelog",
    description: "Release summary",
    icon: BookOpen,
    markdown: `# Changelog

## Unreleased

### Added

- Describe a new capability.

### Fixed

- Describe a resolved issue.
`,
  },
  {
    id: "mermaid",
    label: "Mermaid",
    description: "Simple flowchart",
    icon: Workflow,
    markdown: `# Workflow

\`\`\`mermaid
flowchart LR
  A[Write Markdown] --> B[Preview]
  B --> C[Publish]
\`\`\`
`,
  },
] as const;

export function MarkdownLensApp() {
  const [markdown, setMarkdown] = useState("");
  const [hasHydrated, setHasHydrated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [mobilePane, setMobilePane] = useState<"editor" | "preview">("editor");
  const [theme, setTheme] = useState<Theme>("light");
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [importNotice, setImportNotice] = useState<ImportNotice>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolvedTheme = storedTheme ?? (prefersDark ? "dark" : "light");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(resolvedTheme);

    const savedDraft = localStorage.getItem(STORAGE_KEY);
    const wantsSample = new URLSearchParams(window.location.search).get("sample") === "1";
    if (
      wantsSample &&
      (savedDraft === null || window.confirm("Replace your saved draft with the sample?"))
    ) {
      setMarkdown(sampleMarkdown);
      setMobilePane("preview");
    } else if (savedDraft !== null) {
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
    if (!importNotice || importNotice.tone === "progress") return;
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

  const handleLoadTemplate = useCallback(
    (template: (typeof starterTemplates)[number]) => {
      if (
        !isEmpty &&
        !window.confirm(`Replace the current draft with the ${template.label} template?`)
      ) {
        return;
      }
      setMarkdown(template.markdown);
      setMobilePane("editor");
    },
    [isEmpty],
  );

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
    downloadBlob(blob, `${toFileName(getDocumentTitle(markdown))}.md`);
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

  const importLocalFile = useCallback(
    async (file: File) => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const isMarkdownFile =
        extension === "md" || extension === "markdown" || file.type === "text/markdown";
      const isPdfFile = extension === "pdf" || file.type === "application/pdf";
      const isWordFile =
        extension === "docx" ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const isLegacyWordFile = extension === "doc";

      if (isLegacyWordFile) {
        setImportNotice({
          tone: "error",
          message: `"${file.name}" is a legacy .doc file. Save it as .docx and try again.`,
        });
        return;
      }

      if (!isMarkdownFile && !isPdfFile && !isWordFile) {
        setImportNotice({
          tone: "error",
          message: `"${file.name}" is not supported. Choose a Markdown, PDF, or Word .docx file.`,
        });
        return;
      }

      if (isPdfFile && file.size > PDF_SIZE_LIMIT_BYTES) {
        setImportNotice({
          tone: "error",
          message: `"${file.name}" is larger than the 100 MB PDF limit.`,
        });
        return;
      }

      if (isWordFile && file.size > WORD_SIZE_LIMIT_BYTES) {
        setImportNotice({
          tone: "error",
          message: `"${file.name}" is larger than the 100 MB Word import limit.`,
        });
        return;
      }

      if (!isEmpty && !window.confirm(`Replace the current draft with "${file.name}"?`)) {
        return;
      }

      if (isPdfFile) {
        setImportProgress({ fileName: file.name, kind: "pdf", currentPage: 0, totalPages: 0 });
        setImportNotice({
          tone: "progress",
          message: `Opening "${file.name}" locally…`,
        });

        try {
          const result = await importPdfAsMarkdown(file, ({ currentPage, totalPages }) => {
            setImportProgress({ fileName: file.name, kind: "pdf", currentPage, totalPages });
            setImportNotice({
              tone: "progress",
              message: `Converting page ${currentPage} of ${totalPages} from "${file.name}"…`,
            });
          });
          setMarkdown(result.markdown);
          setMobilePane("preview");
          setImportNotice({
            tone: "success",
            message: `Converted all ${result.pageCount} pages from "${file.name}" locally. Images were not included.`,
          });
        } catch (error) {
          const message =
            error instanceof PdfImportError
              ? error.message
              : `Could not convert "${file.name}". Please try another PDF.`;
          setImportNotice({ tone: "error", message });
        } finally {
          setImportProgress(null);
        }
        return;
      }

      if (isWordFile) {
        setImportProgress({ fileName: file.name, kind: "word" });
        setImportNotice({
          tone: "progress",
          message: `Opening "${file.name}" locally…`,
        });

        try {
          const result = await importWordAsMarkdown(file, ({ stage }) => {
            setImportProgress({ fileName: file.name, kind: "word" });
            const stageMessage =
              stage === "reading"
                ? `Reading "${file.name}" locally…`
                : stage === "converting"
                  ? `Converting "${file.name}" to Markdown locally…`
                  : `Finishing Markdown cleanup for "${file.name}"…`;
            setImportNotice({ tone: "progress", message: stageMessage });
          });
          setMarkdown(result.markdown);
          setMobilePane("preview");
          setImportNotice({
            tone: "success",
            message:
              result.imageCount > 0
                ? `Converted "${file.name}" locally. ${result.imageCount} embedded image${
                    result.imageCount === 1 ? " was" : "s were"
                  } noted but not extracted.`
                : `Converted "${file.name}" locally. Nothing was uploaded.`,
          });
        } catch (error) {
          const message =
            error instanceof WordImportError
              ? error.message
              : `Could not convert "${file.name}". Please try another .docx file.`;
          setImportNotice({ tone: "error", message });
        } finally {
          setImportProgress(null);
        }
        return;
      }

      try {
        const content = await file.text();
        setMarkdown(content);
        setMobilePane("preview");
        setImportNotice({
          tone: "success",
          message: `Opened "${file.name}" locally. Nothing was uploaded.`,
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

  const handleFileInput = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.item(0);
      if (file) {
        await importLocalFile(file);
      }
      event.target.value = "";
    },
    [importLocalFile],
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      dragDepthRef.current = 0;
      setIsDraggingFile(false);

      const file = event.dataTransfer.files.item(0);
      if (!file) {
        setImportNotice({
          tone: "error",
          message: "No file was found. Drop a Markdown, PDF, or Word .docx file to import it.",
        });
        return;
      }

      await importLocalFile(file);
    },
    [importLocalFile],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="app-shell mx-auto flex min-h-screen w-full max-w-[1800px] flex-col px-4 sm:px-6 lg:px-8">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-border/80">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded-md font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-panel text-accent shadow-sm">
                <Eye className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="hidden sm:inline">Markdown Lens</span>
            </Link>
            <nav className="hidden items-center gap-1 border-l border-border pl-3 md:flex" aria-label="Editor navigation">
              <Link
                href="/"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Home
              </Link>
              <Link
                href="/markdown-cheatsheet"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cheatsheet
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-1">
            <a
              href="https://github.com/ayushhagarwal/markdown-lens"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="View Markdown Lens on GitHub"
            >
              <Github className="h-4 w-4" aria-hidden />
            </a>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <section className="sticky top-0 z-20 -mx-4 border-b border-border/80 bg-background/94 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.pdf,.docx,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileInput}
            className="sr-only"
            aria-label="Choose a Markdown, PDF, or Word file"
            disabled={importProgress !== null}
          />
          <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
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

            <WorkspaceActions
              copyState={copyState}
              isEmpty={isEmpty}
              isImporting={importProgress !== null}
              onOpenFile={() => fileInputRef.current?.click()}
              onLoadSample={handleLoadSample}
              onLoadTemplate={handleLoadTemplate}
              onCopyMarkdown={handleCopyMarkdown}
              onCopyHtml={handleCopyHtml}
              onDownload={handleDownload}
              onExportHtml={handleExportHtml}
              onPrint={handlePrint}
              onClear={handleClear}
            />

            <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground md:flex md:flex-wrap md:items-center lg:justify-end">
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
              onLoadTemplate={handleLoadTemplate}
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

        <footer className="flex items-center justify-between gap-3 border-t border-border py-3 text-xs text-muted-foreground">
          <p>Saved locally in this browser.</p>
          <Link href="/" className="font-medium hover:text-foreground">
            Back to home
          </Link>
        </footer>
      </div>
    </div>
  );
}

function EditorPanel({
  value,
  onChange,
  onLoadTemplate,
  hiddenOnDesktop,
  hiddenOnMobile,
}: {
  value: string;
  onChange: (value: string) => void;
  onLoadTemplate: (template: (typeof starterTemplates)[number]) => void;
  hiddenOnDesktop: boolean;
  hiddenOnMobile: boolean;
}) {
  const isEmpty = value.trim().length === 0;

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
          Markdown
        </div>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Drop Markdown, PDF, or Word here
        </span>
      </div>
      <div className="flex h-[calc(100%-2.75rem)] flex-col">
        {isEmpty ? (
          <div className="border-b border-border/75 bg-surface/70 px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Start with a template</p>
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
              {starterTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => onLoadTemplate(template)}
                    className="group flex min-w-0 items-center gap-2 rounded-md border border-border bg-panel px-3 py-2 text-left transition hover:border-ring hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold">{template.label}</span>
                      <span className="hidden truncate text-[10px] text-muted-foreground 2xl:block">
                        {template.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          placeholder={placeholder}
          className="min-h-0 flex-1 w-full resize-none bg-transparent p-5 font-mono text-sm leading-6 text-panel-foreground caret-accent outline-none selection:bg-accent/15 placeholder:text-muted-foreground/65 sm:p-6"
        />
      </div>
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
  const isProgress = notice.tone === "progress";

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
      ) : isProgress ? (
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-accent" aria-hidden />
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
        <p className="mt-4 text-lg font-semibold">Drop your Markdown, PDF, or Word file</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          PDFs and .docx files are converted locally. Scanned PDFs and embedded images are not
          extracted.
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
  iconClassName,
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
  iconClassName?: string;
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
      <Icon className={cn("h-4 w-4 shrink-0", iconClassName)} aria-hidden />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function WorkspaceActions({
  copyState,
  isEmpty,
  isImporting,
  onOpenFile,
  onLoadSample,
  onLoadTemplate,
  onCopyMarkdown,
  onCopyHtml,
  onDownload,
  onExportHtml,
  onPrint,
  onClear,
}: {
  copyState: CopyState;
  isEmpty: boolean;
  isImporting: boolean;
  onOpenFile: () => void;
  onLoadSample: () => void;
  onLoadTemplate: (template: (typeof starterTemplates)[number]) => void;
  onCopyMarkdown: () => void;
  onCopyHtml: () => void;
  onDownload: () => void;
  onExportHtml: () => void;
  onPrint: () => void;
  onClear: () => void;
}) {
  const [openMenu, setOpenMenu] = useState<"templates" | "export" | null>(null);

  useEffect(() => {
    if (!openMenu) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [openMenu]);

  const runAndClose = (action: () => void) => () => {
    action();
    setOpenMenu(null);
  };

  return (
    <div className="flex items-center gap-2 lg:justify-center">
      <ToolbarButton
        icon={isImporting ? Loader2 : FileUp}
        label={isImporting ? "Converting…" : "Open file"}
        onClick={onOpenFile}
        className="h-10 flex-1 justify-center sm:flex-none"
        emphasis
        disabled={isImporting}
        iconClassName={isImporting ? "animate-spin" : undefined}
      />

      <div className="relative flex-1 sm:flex-none">
        <MenuButton
          icon={Sparkles}
          label="Templates"
          open={openMenu === "templates"}
          onClick={() =>
            setOpenMenu((current) => (current === "templates" ? null : "templates"))
          }
        />
        {openMenu === "templates" ? (
          <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-panel p-2 shadow-panel">
            <p className="px-2 pb-2 pt-1 text-xs font-medium text-muted-foreground">
              Start with a focused document
            </p>
            {starterTemplates.map((template) => {
              const Icon = template.icon;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={runAndClose(() => onLoadTemplate(template))}
                  className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  <span>
                    <span className="block text-sm font-medium">{template.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {template.description}
                    </span>
                  </span>
                </button>
              );
            })}
            <div className="mt-1 border-t border-border pt-1">
              <button
                type="button"
                onClick={runAndClose(onLoadSample)}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Sparkles className="h-4 w-4 text-accent" aria-hidden />
                Full feature sample
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative flex-1 sm:flex-none">
        <MenuButton
          icon={FileDown}
          label="Export"
          open={openMenu === "export"}
          onClick={() => setOpenMenu((current) => (current === "export" ? null : "export"))}
        />
        {openMenu === "export" ? (
          <div
            className="absolute right-0 top-[calc(100%+0.5rem)] z-40 grid w-64 max-w-[calc(100vw-2rem)] gap-1 rounded-xl border border-border bg-panel p-2 shadow-panel"
          >
            <ToolbarButton
              icon={copyState === "markdown" ? Check : Clipboard}
              label={copyState === "markdown" ? "Copied Markdown" : "Copy Markdown"}
              onClick={runAndClose(onCopyMarkdown)}
              shortcut="⌘/Ctrl ⇧ C"
              ariaShortcut="Meta+Shift+C Control+Shift+C"
              className="h-10 w-full justify-start border-0 shadow-none"
              disabled={isEmpty}
            />
            <ToolbarButton
              icon={copyState === "html" ? Check : FileCode2}
              label={copyState === "html" ? "Copied HTML" : "Copy HTML"}
              onClick={runAndClose(onCopyHtml)}
              shortcut="⌘/Ctrl ⇧ H"
              ariaShortcut="Meta+Shift+H Control+Shift+H"
              className="h-10 w-full justify-start border-0 shadow-none"
              disabled={isEmpty}
            />
            <ToolbarButton
              icon={Download}
              label="Download .md"
              onClick={runAndClose(onDownload)}
              shortcut="⌘/Ctrl S"
              ariaShortcut="Meta+S Control+S"
              className="h-10 w-full justify-start border-0 shadow-none"
              disabled={isEmpty}
            />
            <ToolbarButton
              icon={FileDown}
              label="Export HTML"
              onClick={runAndClose(onExportHtml)}
              className="h-10 w-full justify-start border-0 shadow-none"
              disabled={isEmpty}
            />
            <ToolbarButton
              icon={Printer}
              label="Print / PDF"
              onClick={runAndClose(onPrint)}
              className="h-10 w-full justify-start border-0 shadow-none"
              disabled={isEmpty}
            />
            <div className="my-1 border-t border-border" />
            <ToolbarButton
              icon={Trash2}
              label="Clear"
              onClick={runAndClose(onClear)}
              className="h-10 w-full justify-start border-0 shadow-none"
              disabled={isEmpty}
              tone="danger"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MenuButton({
  icon: Icon,
  label,
  open,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-panel px-3 text-sm font-medium shadow-sm transition hover:border-ring hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
      <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} aria-hidden />
    </button>
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
