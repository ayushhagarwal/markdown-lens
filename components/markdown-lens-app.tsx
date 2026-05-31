"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import {
  Check,
  Clipboard,
  Code2,
  Download,
  Eye,
  FileCode2,
  Github,
  Loader2,
  Moon,
  PanelLeft,
  PanelRight,
  Printer,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "split" | "editor" | "preview";
type Theme = "light" | "dark";
type CopyState = "idle" | "markdown" | "html" | "error";

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
  const previewRef = useRef<HTMLDivElement>(null);

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

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="app-shell mx-auto flex min-h-screen w-full max-w-[1800px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-panel shadow-sm">
              <Eye className="h-5 w-5 text-accent" aria-hidden />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold tracking-normal">Markdown Lens</p>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  Open Source
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Beautiful, privacy-first Markdown preview for AI notes, READMEs, and docs.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://github.com/ayushhagarwal/markdown-lens"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-panel px-3 text-sm font-medium text-panel-foreground transition hover:border-ring hover:bg-muted"
            >
              <Github className="h-4 w-4" aria-hidden />
              ayushhagarwal/markdown-lens
            </a>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-panel text-panel-foreground transition hover:border-ring hover:bg-muted"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <section className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
              Online Markdown Viewer
            </h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-muted-foreground">
              Preview Markdown instantly with GitHub-style rendering, Mermaid diagrams, code
              highlighting, math, tables, and dark mode.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" aria-hidden />
            <span>Drafts stay in localStorage on this device.</span>
          </div>
        </section>

        <section className="sticky top-0 z-20 -mx-4 border-y border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="hidden items-center gap-1 rounded-lg border border-border bg-panel p-1 lg:flex">
              <ModeButton icon={PanelLeft} label="Split" active={viewMode === "split"} onClick={() => setViewMode("split")} />
              <ModeButton icon={Code2} label="Editor" active={viewMode === "editor"} onClick={() => setViewMode("editor")} />
              <ModeButton icon={PanelRight} label="Preview" active={viewMode === "preview"} onClick={() => setViewMode("preview")} />
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-border bg-panel p-1 lg:hidden">
              <ModeButton icon={Code2} label="Editor" active={mobilePane === "editor"} onClick={() => setMobilePane("editor")} />
              <ModeButton icon={Eye} label="Preview" active={mobilePane === "preview"} onClick={() => setMobilePane("preview")} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ToolbarButton icon={Sparkles} label="Load sample" onClick={handleLoadSample} />
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
                disabled={isEmpty}
              />
              <ToolbarButton icon={Download} label="Download .md" onClick={handleDownload} disabled={isEmpty} />
              <ToolbarButton icon={Printer} label="Print / PDF" onClick={handlePrint} disabled={isEmpty} />
              <ToolbarButton icon={Trash2} label="Clear" onClick={handleClear} disabled={isEmpty} tone="danger" />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
              <Stat label="Words" value={stats.words.toLocaleString()} />
              <Stat label="Chars" value={stats.characters.toLocaleString()} />
              <Stat label="Read" value={`${stats.minutes} min`} />
            </div>
          </div>
        </section>

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

        <footer className="border-t border-border py-4 text-sm text-muted-foreground">
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
        "panel-height overflow-hidden rounded-lg border border-border bg-panel shadow-panel",
        hiddenOnMobile && "hidden lg:block",
        hiddenOnDesktop && "lg:hidden",
      )}
      aria-label="Markdown editor"
    >
      <div className="flex h-11 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Code2 className="h-4 w-4 text-accent" aria-hidden />
          Editor
        </div>
        <span className="text-xs text-muted-foreground">Autosaved locally</span>
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        placeholder={placeholder}
        className="h-[calc(100%-2.75rem)] w-full resize-none bg-transparent p-5 font-mono text-sm leading-6 text-panel-foreground outline-none placeholder:text-muted-foreground/70"
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
        "panel-height overflow-hidden rounded-lg border border-border bg-panel shadow-panel",
        hiddenOnMobile && "hidden lg:block",
        hiddenOnDesktop && "lg:hidden",
      )}
      aria-label="Markdown preview"
    >
      <div className="flex h-11 items-center justify-between border-b border-border px-4">
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
          <div ref={previewRef} className="print-area markdown-body px-5 py-6 sm:px-7">
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

function EmptyState() {
  return (
    <div className="flex h-full min-h-[420px] items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-muted">
          <FileCode2 className="h-6 w-6 text-accent" aria-hidden />
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-normal">Start previewing Markdown</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Paste Markdown on the left or load a sample to see GitHub-style output instantly.
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
}: {
  icon: typeof PanelLeft;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium transition",
        active
          ? "bg-foreground text-background"
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
}: {
  icon: typeof Clipboard;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border border-border bg-panel px-3 text-sm font-medium text-panel-foreground transition hover:border-ring hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45",
        tone === "danger" && "hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-200",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-panel px-2.5">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </span>
  );
}
