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
    <article className={`overflow-hidden rounded-xl border border-border/80 bg-panel shadow-panel ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-border/80 bg-surface px-5 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <OpenExampleButton title={title} markdown={syntax} />
      </div>
      <div className="grid lg:grid-cols-2">
        <div className="min-w-0 border-b border-border/80 p-5 lg:border-b-0 lg:border-r">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Markdown</p>
          <pre
            tabIndex={0}
            className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-slate-700 bg-[#0d1117] p-4 font-mono text-sm leading-6 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <code>{syntax}</code>
          </pre>
        </div>
        <div className="min-w-0 p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
          <GuidePreview markdown={syntax} />
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
      aria-label={`Open the ${title} example`}
      className="inline-flex min-h-11 shrink-0 items-center rounded-md px-2 text-xs font-medium text-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      Open this example
    </button>
  );
}

function GuidePreview({ markdown }: { markdown: string }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const sync = () => setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return <MarkdownPreview markdown={markdown} theme={theme} previewRef={previewRef} assetUrls={{}} compact />;
}
