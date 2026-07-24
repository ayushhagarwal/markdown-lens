"use client";

import { useEffect, useMemo, useState, type ReactElement, type RefObject } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import { Check, Clipboard, FileCode2, Loader2 } from "lucide-react";

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
        if (language === "mermaid") return <MermaidDiagram code={code} theme={theme} />;
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
      img({ src, alt, ...props }) {
        const resolved =
          typeof src === "string" && src.startsWith("assets/")
            ? assetUrls[src.slice("assets/".length)]
            : src;
        // User-owned blob/data URLs cannot use the Next image optimizer safely.
        // eslint-disable-next-line @next/next/no-img-element
        return <img {...props} src={resolved} alt={alt ?? ""} loading="lazy" />;
      },
    }),
    [assetUrls, theme],
  );
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
        className="absolute right-2 top-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-white/15 bg-black/60 px-2 text-[11px] font-medium text-slate-200 opacity-100 backdrop-blur transition hover:bg-black/80 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent sm:opacity-0 sm:group-hover/code:opacity-100"
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
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; svg?: string; error?: string }>({
    status: "loading",
  });
  useEffect(() => {
    let cancelled = false;
    import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: theme === "dark" ? "dark" : "default" });
        const { svg } = await mermaid.render(`markdown-lens-mermaid-${crypto.randomUUID()}`, code);
        if (!cancelled) setState({ status: "ready", svg });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", error: error instanceof Error ? error.message : "Diagram failed." });
      });
    return () => {
      cancelled = true;
    };
  }, [code, theme]);
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
