"use client";

import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";

/* eslint-disable @next/next/no-img-element -- preview images may be local blobs or consent-gated remote URLs */

import {
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type RefObject,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import {
  AlertTriangle,
  Check,
  Clipboard,
  FileCode2,
  ImageOff,
  Loader2,
  Play,
} from "lucide-react";
import {
  analyzeMarkdownBudget,
  assertMermaidSourceBudget,
  MARKDOWN_DEGRADED_PREVIEW_CHARACTERS,
  MAX_MERMAID_GRAPH_STATEMENTS,
  MAX_MERMAID_SOURCE_CHARACTERS,
  MAX_MERMAID_SVG_CHARACTERS,
} from "@/lib/markdown-limits";

let mermaidRenderQueue: Promise<void> = Promise.resolve();

export function MarkdownPreview({
  markdown,
  theme,
  previewRef,
  assetUrls,
}: {
  markdown: string;
  theme: "light" | "dark";
  previewRef: RefObject<HTMLDivElement | null>;
  assetUrls: Record<string, string>;
}) {
  const components = useMarkdownComponents(theme, assetUrls);
  const budget = useMemo(() => analyzeMarkdownBudget(markdown), [markdown]);
  if (!markdown.trim()) {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center">
        <div>
          <FileCode2 className="mx-auto h-7 w-7 text-accent" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold">No preview yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Write or import Markdown to begin.</p>
        </div>
      </div>
    );
  }
  if (!budget.allowed) {
    return (
      <div ref={previewRef} className="mx-auto w-full max-w-[860px] px-7 pb-24 pt-6 lg:px-9">
        <div className="border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-200">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Interactive preview paused
          </div>
          <p className="mt-2 text-xs leading-5 text-amber-100/80">
            {budget.reason} The full source remains editable and exportable.
          </p>
        </div>
        <pre className="mt-4 max-h-[60vh] overflow-auto whitespace-pre-wrap border border-border bg-muted p-4 text-xs">
          {markdown.slice(0, MARKDOWN_DEGRADED_PREVIEW_CHARACTERS)}
          {markdown.length > MARKDOWN_DEGRADED_PREVIEW_CHARACTERS
            ? "\n\n… preview excerpt truncated …"
            : ""}
        </pre>
      </div>
    );
  }
  return (
    <div ref={previewRef} className="print-area markdown-body mx-auto w-full max-w-[860px] px-7 pb-24 pt-6 lg:px-9">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [rehypeKatex, { throwOnError: false, strict: false }],
          rehypeHighlight,
          rehypeSlug,
        ]}
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

function useMarkdownComponents(theme: "light" | "dark", assetUrls: Record<string, string>): Components {
  return useMemo(
    () => ({
      code(props) {
        const { className, children, ...rest } = props;
        const language = /language-(\w+)/.exec(className ?? "")?.[1]?.toLowerCase();
        const code = String(children).replace(/\n$/, "");
        if (language === "mermaid") {
          return <MermaidDiagram key={`${theme}:${code}`} code={code} theme={theme} />;
        }
        return (
          <code className={className} {...rest}>
            {children}
          </code>
        );
      },
      pre({ children }) {
        const child = children as ReactElement<{ children?: unknown; className?: string }>;
        if (child?.props?.className?.includes("language-mermaid")) return <>{children}</>;
        return <CopyableCodeBlock>{children}</CopyableCodeBlock>;
      },
      a(props) {
        return <a {...props} target="_blank" rel="noreferrer" />;
      },
      img({ src, alt, node, ...props }) {
        void node;
        return (
          <SafeMarkdownImage
            {...props}
            src={src}
            alt={alt ?? ""}
            assetUrls={assetUrls}
          />
        );
      },
    }),
    [assetUrls, theme],
  );
}

function SafeMarkdownImage({
  src,
  alt,
  assetUrls,
  ...props
}: ComponentPropsWithoutRef<"img"> & { assetUrls: Record<string, string> }) {
  const [loadedRemote, setLoadedRemote] = useState<string | null>(null);
  const localAsset =
    typeof src === "string" && src.startsWith("assets/")
      ? assetUrls[src.slice("assets/".length)]
      : undefined;
  const remoteUrl = normalizeRemoteImageUrl(src);

  if (localAsset) {
    return <img {...props} src={localAsset} alt={alt} loading="lazy" />;
  }

  if (remoteUrl && loadedRemote === remoteUrl) {
    return (
      <img
        {...props}
        src={remoteUrl}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  if (remoteUrl) {
    return (
      <span className="not-prose my-3 inline-flex max-w-full items-center gap-3 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
        <ImageOff className="h-4 w-4 shrink-0" aria-hidden />
        <span className="min-w-0">
          Remote image blocked from{" "}
          <span className="font-medium text-foreground">{new URL(remoteUrl).hostname}</span>
          {alt ? ` (${alt})` : ""}
        </span>
        <button
          type="button"
          onClick={() => setLoadedRemote(remoteUrl)}
          className="shrink-0 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Load image
        </button>
      </span>
    );
  }

  return (
    <span className="not-prose my-3 inline-flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      <ImageOff className="h-4 w-4" aria-hidden />
      Image source blocked{alt ? ` (${alt})` : ""}
    </span>
  );
}

function normalizeRemoteImageUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function CopyableCodeBlock({ children }: { children: React.ReactNode }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const text = extractText(children);

  useEffect(() => {
    if (copyStatus === "idle") return;
    const timeout = window.setTimeout(() => setCopyStatus("idle"), 1600);
    return () => window.clearTimeout(timeout);
  }, [copyStatus]);

  return (
    <div className="group/code relative">
      <pre>{children}</pre>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text.replace(/\n$/, ""));
            setCopyStatus("copied");
          } catch {
            setCopyStatus("error");
          }
        }}
        className="absolute right-2 top-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-white/15 bg-black/60 px-2 text-[11px] font-medium text-slate-200 opacity-100 backdrop-blur transition hover:bg-black/80 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:opacity-0 sm:group-hover/code:opacity-100"
        aria-label="Copy code block"
      >
        {copyStatus === "copied" ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
        {copyStatus === "copied" ? "Copied" : copyStatus === "error" ? "Copy failed" : "Copy"}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copyStatus === "copied" ? "Code copied to clipboard." : copyStatus === "error" ? "Code could not be copied." : ""}
      </span>
    </div>
  );
}

function extractText(value: React.ReactNode): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(extractText).join("");
  if (value && typeof value === "object" && "props" in value) {
    return extractText((value as ReactElement<{ children?: React.ReactNode }>).props.children);
  }
  return "";
}

function MermaidDiagram({ code, theme }: { code: string; theme: "light" | "dark" }) {
  const [request, setRequest] = useState(0);
  const [state, setState] = useState<{ status: "idle" | "loading" | "ready" | "error"; svg?: string; error?: string }>({
    status: "idle",
  });

  useEffect(() => {
    if (request === 0) return;
    let cancelled = false;
    const render = async () => {
      assertMermaidSourceBudget(code);
      const { default: mermaid } = await import("mermaid");
      if (cancelled) return;
      await enqueueMermaidRender(async () => {
        if (cancelled) return;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: theme === "dark" ? "dark" : "default",
          maxEdges: MAX_MERMAID_GRAPH_STATEMENTS,
          maxTextSize: MAX_MERMAID_SOURCE_CHARACTERS,
        });
        const { svg } = await mermaid.render(`markdown-lens-mermaid-${crypto.randomUUID()}`, code);
        if (svg.length > MAX_MERMAID_SVG_CHARACTERS) {
          throw new Error("The rendered Mermaid diagram exceeds the SVG output limit.");
        }
        if (!cancelled) setState({ status: "ready", svg });
      });
    };
    void render()
      .catch((error) => {
        if (!cancelled) setState({ status: "error", error: error instanceof Error ? error.message : "Diagram failed." });
      });
    return () => {
      cancelled = true;
    };
  }, [code, request, theme]);
  if (state.status === "idle") {
    return (
      <div className="not-prose my-5 flex items-center justify-between gap-3 border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
        <span>Mermaid diagram is paused until you choose to render it.</span>
        <button
          type="button"
          onClick={() => {
            setState({ status: "loading" });
            setRequest((current) => current + 1);
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Play className="h-3.5 w-3.5" aria-hidden />
          Render diagram
        </button>
      </div>
    );
  }
  if (state.status === "loading") {
    return (
      <div className="not-prose my-5 flex items-center gap-2 border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Rendering Mermaid diagram
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="not-prose my-5 border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
        <strong>Mermaid diagram could not be rendered.</strong>
        <pre className="mt-3 whitespace-pre-wrap text-xs">{state.error}</pre>
      </div>
    );
  }
  return <div className="not-prose my-5 overflow-auto border border-border bg-white p-4 dark:bg-slate-950" dangerouslySetInnerHTML={{ __html: state.svg ?? "" }} />;
}

function enqueueMermaidRender<T>(task: () => Promise<T>) {
  const result = mermaidRenderQueue.then(task, task);
  mermaidRenderQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}
