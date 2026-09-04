"use client";

import { Eye, FileText, ListTree, PenLine } from "lucide-react";
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

export function ProductPreview() {
  const [activeTab, setActiveTab] = useState<PreviewTab>("markdown");

  return (
    <div className="relative min-w-0">
      <div className="home-product-frame overflow-hidden rounded-xl border border-border bg-panel shadow-[0_32px_100px_-58px_rgb(0_0_0_/_0.9)]">
        <div className="flex h-11 items-center justify-between border-b border-border px-4 text-[11px] text-muted-foreground">
          <span>Project: Product requirements</span>
          <span className="flex items-center gap-2 text-accent"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Saved locally</span>
        </div>

        <div className="hidden min-h-[610px] min-w-0 grid-cols-[110px_minmax(0,1fr)_minmax(0,1.2fr)_110px] lg:grid">
          <DocumentRail />
          <MarkdownPane />
          <PreviewPane />
          <OutlinePane />
        </div>

        <div className="lg:hidden">
          <div className="grid grid-cols-2 border-b border-border p-2" role="tablist" aria-label="Product preview">
            <button type="button" role="tab" id="preview-tab-markdown" aria-selected={activeTab === "markdown"} aria-controls="preview-panel-markdown" onClick={() => setActiveTab("markdown")} className={`flex h-11 items-center justify-center gap-2 rounded-md text-sm ${activeTab === "markdown" ? "bg-muted text-accent" : "text-muted-foreground"}`}>
              <PenLine className="h-4 w-4" aria-hidden /> Markdown
            </button>
            <button type="button" role="tab" id="preview-tab-preview" aria-selected={activeTab === "preview"} aria-controls="preview-panel-preview" onClick={() => setActiveTab("preview")} className={`flex h-11 items-center justify-center gap-2 rounded-md text-sm ${activeTab === "preview" ? "bg-muted text-accent" : "text-muted-foreground"}`}>
              <Eye className="h-4 w-4" aria-hidden /> Preview
            </button>
          </div>
          <div id={`preview-panel-${activeTab}`} role="tabpanel" aria-labelledby={`preview-tab-${activeTab}`} className="h-[360px] overflow-hidden">
            {activeTab === "markdown" ? <MarkdownPane mobile /> : <PreviewPane mobile />}
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentRail() {
  return <div className="border-r border-border p-3 text-xs"><p className="mb-4 font-semibold">Documents</p>{["PRD.pdf", "architecture.docx", "api-spec.html", "research.epub"].map((file, index) => <div key={file} className={`mb-1 flex items-center gap-2 rounded px-2 py-2.5 ${index === 0 ? "bg-muted text-foreground" : "text-muted-foreground"}`}><FileText className="h-3.5 w-3.5 text-accent" aria-hidden />{file}</div>)}</div>;
}

function MarkdownPane({ mobile = false }: { mobile?: boolean }) {
  return <div className={`${mobile ? "h-full" : "border-r border-border"} overflow-hidden bg-background/35 p-4 font-mono text-[11px] leading-[1.65] sm:p-5`}><div className="mb-4 flex items-center gap-2 font-sans text-xs font-semibold text-foreground"><PenLine className="h-3.5 w-3.5 text-accent" aria-hidden />Markdown</div>{markdown.map((line, index) => <div key={`${line}-${index}`} className="grid grid-cols-[24px_1fr]"><span className="select-none text-muted-foreground">{index + 1}</span><span className={line.startsWith("#") ? "text-accent" : "text-muted-foreground"}>{line || "\u00a0"}</span></div>)}</div>;
}

function PreviewPane({ mobile = false }: { mobile?: boolean }) {
  return <div className={`${mobile ? "h-full" : "border-r border-border"} overflow-hidden p-5 sm:p-6`}><div className="mb-6 flex items-center gap-2 text-xs font-semibold"><Eye className="h-3.5 w-3.5 text-accent" aria-hidden />Preview</div><h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">Product Requirements</h3><h4 className="mt-7 border-b border-border pb-2 text-lg font-semibold">Overview</h4><p className="mt-3 text-sm leading-6 text-muted-foreground">A private workspace for document work.</p><h4 className="mt-7 border-b border-border pb-2 text-lg font-semibold">Goals</h4><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground"><li>Keep document structure</li><li>Surface conversion warnings</li><li>Export clean Markdown</li></ul></div>;
}

function OutlinePane() {
  return <div className="p-4 text-xs"><p className="mb-5 flex items-center gap-2 font-semibold"><ListTree className="h-3.5 w-3.5 text-accent" aria-hidden />Outline</p>{["Overview", "Goals", "Supported sources", "Export"].map((item, index) => <p key={item} className="mb-4 text-muted-foreground"><span className="mr-2 text-[10px]">H{index ? 2 : 1}</span>{item}</p>)}</div>;
}
