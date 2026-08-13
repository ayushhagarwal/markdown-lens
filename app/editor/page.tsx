import type { Metadata } from "next";
import { MarkdownLensApp } from "@/components/markdown-lens-app";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Markdown Editor",
  description:
    "Open Markdown or convert text-based PDFs and Word .docx files locally, then edit and preview with GitHub-style rendering, Mermaid diagrams, math, and code highlighting.",
  path: "/editor",
  index: false,
});

export default function EditorPage() {
  return <MarkdownLensApp />;
}
