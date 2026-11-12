"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownPreview } from "@/components/workspace/markdown-preview";
import { stagePendingExample } from "@/lib/pending-import";

export function ExampleCard({
  title,
  syntax,
  className = "",
}: {
  title: string;
  syntax: string;
  className?: string;
}) {
  return (
    <article className={`window flex min-w-0 flex-col ${className}`}>
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border bg-surface pl-4 pr-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="window-dots hidden sm:flex" aria-hidden><i /><i /><i /></span>
          <h3 className="truncate text-sm font-semibold tracking-tight">{title}</h3>
        </div>
        <OpenExampleButton title={title} markdown={syntax} />
      </div>
      <div className="grid flex-1 lg:grid-cols-2">
        <div className="min-w-0 border-b border-border bg-surface/60 p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Markdown</p>
          <pre
            tabIndex={0}
            className="code-block whitespace-pre-wrap break-words text-[13px]"
          >
            <code>{syntax}</code>
          </pre>
        </div>
        <div className="min-w-0 p-4 sm:p-5">
          <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Preview</p>
          <GuidePreview markdown={syntax} title={title} />
        </div>
      </div>
    </article>
  );
}

function OpenExampleButton({ title, markdown }: { title: string; markdown: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        stagePendingExample({ title, markdown });
        router.push("/editor");
      }}
      aria-label={`Open this example: ${title}`}
      className="-mr-2 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-accent transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      Open this example
    </button>
  );
}

function GuidePreview({ markdown, title }: { markdown: string; title: string }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const sync = () => setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return <MarkdownPreview markdown={markdown} theme={theme} previewRef={previewRef} assetUrls={{}} compact demoteH1 tableLabel={`${title} preview`} />;
}
