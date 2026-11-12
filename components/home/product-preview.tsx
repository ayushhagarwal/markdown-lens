"use client";

import { Eye, FileText, ListTree, PenLine, ShieldCheck } from "lucide-react";
import { useState } from "react";

type PreviewTab = "markdown" | "preview";

const markdown = [
  "# Product Requirements",
  "",
  "## Overview",
  "A private workspace for document work.",
  "",
  "## Goals",
  "- Keep document structure",
  "- Surface conversion warnings",
  "- Export clean Markdown",
  "",
  "## Supported sources",
  "PDF, Office, HTML, EPUB, data, images",
];

const documents = [
  ["PDF", "PRD.pdf"],
  ["DOCX", "architecture.docx"],
  ["HTML", "api-spec.html"],
  ["EPUB", "research.epub"],
] as const;

/** Static, CSS-animated picture of the workspace. No editor code is loaded for it. */
export function ProductPreview() {
  const [activeTab, setActiveTab] = useState<PreviewTab>("markdown");
  const tabs: PreviewTab[] = ["markdown", "preview"];
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = tabs.indexOf(activeTab);
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    const tab = tabs[next];
    setActiveTab(tab);
    event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-preview-tab="${tab}"]`)?.focus();
  };
  const tabClass = (tab: PreviewTab) =>
    `flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeTab === tab ? "bg-panel text-foreground shadow-soft" : "text-muted-foreground"}`;

  return (
    <div className="relative min-w-0">
      <div className="pointer-events-none absolute -inset-x-8 -bottom-10 top-10 -z-10 rounded-[3rem] bg-accent/10 blur-3xl" aria-hidden />
      <div className="window text-left">
        <div className="window-bar justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-3">
            <span className="window-dots" aria-hidden><i /><i /><i /></span>
            <span className="hidden sm:inline">Markdown Lens</span>
          </span>
          <span className="rounded-md bg-muted px-2.5 py-1 font-mono">product-requirements.md</span>
          <span className="flex items-center gap-1.5 text-accent"><ShieldCheck className="h-3.5 w-3.5" aria-hidden />Saved locally</span>
        </div>

        <div className="hidden min-h-[520px] min-w-0 grid-cols-[168px_minmax(0,1fr)_minmax(0,1.15fr)_150px] lg:grid">
          <DocumentRail />
          <MarkdownPane />
          <PreviewPane />
          <OutlinePane />
        </div>

        <div className="lg:hidden">
          <div className="m-2 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Product preview" aria-orientation="horizontal">
            <button type="button" role="tab" id="preview-tab-markdown" data-preview-tab="markdown" tabIndex={activeTab === "markdown" ? 0 : -1} aria-selected={activeTab === "markdown"} aria-controls={activeTab === "markdown" ? "preview-panel-markdown" : undefined} onClick={() => setActiveTab("markdown")} onKeyDown={handleTabKeyDown} className={tabClass("markdown")}>
              <PenLine className="h-4 w-4" aria-hidden /> Markdown
            </button>
            <button type="button" role="tab" id="preview-tab-preview" data-preview-tab="preview" tabIndex={activeTab === "preview" ? 0 : -1} aria-selected={activeTab === "preview"} aria-controls={activeTab === "preview" ? "preview-panel-preview" : undefined} onClick={() => setActiveTab("preview")} onKeyDown={handleTabKeyDown} className={tabClass("preview")}>
              <Eye className="h-4 w-4" aria-hidden /> Preview
            </button>
          </div>
          <div id={`preview-panel-${activeTab}`} role="tabpanel" aria-labelledby={`preview-tab-${activeTab}`} className="h-[340px] overflow-hidden border-t border-border">
            {activeTab === "markdown" ? <MarkdownPane mobile /> : <PreviewPane mobile />}
          </div>
        </div>
      </div>
    </div>
  );
}

function PaneTitle({ icon: Icon, children }: { icon: typeof Eye; children: string }) {
  return <p className="mb-4 flex items-center gap-2 font-sans text-xs font-semibold text-foreground"><Icon className="h-3.5 w-3.5 text-accent" aria-hidden />{children}</p>;
}

function DocumentRail() {
  return (
    <div className="border-r border-border bg-surface/60 p-3 text-xs">
      <PaneTitle icon={FileText}>Documents</PaneTitle>
      {documents.map(([format, file], index) => (
        <div key={file} className={`mb-1 flex items-center gap-2 rounded-lg px-2 py-2 ${index === 0 ? "bg-accent-soft/70 text-foreground" : "text-muted-foreground"}`}>
          <span className="w-9 shrink-0 font-mono text-[9px] font-semibold">{format}</span>
          <span className="truncate">{file}</span>
        </div>
      ))}
    </div>
  );
}

function MarkdownPane({ mobile = false }: { mobile?: boolean }) {
  return (
    <div className={`${mobile ? "h-full" : "border-r border-border"} overflow-hidden p-4 font-mono text-[12px] leading-[1.75] sm:p-5`}>
      <PaneTitle icon={PenLine}>Markdown</PaneTitle>
      {markdown.map((line, index) => (
        <div key={`${line}-${index}`} className="line-in grid grid-cols-[26px_1fr]" style={{ "--i": index } as React.CSSProperties}>
          <span className="select-none text-muted-foreground/70">{index + 1}</span>
          <span className={`${line.startsWith("#") ? "font-semibold text-accent" : "text-foreground/80"} ${index === markdown.length - 1 ? "caret" : ""}`}>{line || " "}</span>
        </div>
      ))}
    </div>
  );
}

function PreviewPane({ mobile = false }: { mobile?: boolean }) {
  return (
    <div className={`${mobile ? "h-full" : "border-r border-border"} overflow-hidden p-5 sm:p-6`}>
      <PaneTitle icon={Eye}>Preview</PaneTitle>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-[1.7rem]">Product Requirements</h2>
      <h3 className="mt-6 border-b border-border pb-2 text-base font-semibold">Overview</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">A private workspace for document work.</p>
      <h3 className="mt-6 border-b border-border pb-2 text-base font-semibold">Goals</h3>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
        <li>Keep document structure</li>
        <li>Surface conversion warnings</li>
        <li>Export clean Markdown</li>
      </ul>
      <h3 className="mt-6 border-b border-border pb-2 text-base font-semibold">Supported sources</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">PDF, Office, HTML, EPUB, data, images</p>
    </div>
  );
}

function OutlinePane() {
  return (
    <div className="bg-surface/60 p-4 text-xs">
      <PaneTitle icon={ListTree}>Outline</PaneTitle>
      {["Product Requirements", "Overview", "Goals", "Supported sources"].map((item, index) => (
        <p key={item} className={`mb-1 flex gap-2 rounded-md border-l-2 px-2 py-1.5 ${index === 0 ? "border-accent text-foreground" : "border-transparent text-muted-foreground"}`}>
          <span className="font-mono text-[10px]">H{index ? 2 : 1}</span>
          <span className="truncate">{item}</span>
        </p>
      ))}
    </div>
  );
}
