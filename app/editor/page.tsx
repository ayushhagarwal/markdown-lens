import type { Metadata } from "next";
import { MarkdownLensApp } from "@/components/markdown-lens-app";

export const metadata: Metadata = {
  title: "Markdown Editor",
  description:
    "Open Markdown or convert text-based PDFs and Word .docx files locally, then edit and preview with GitHub-style rendering, Mermaid diagrams, math, and code highlighting.",
  alternates: {
    canonical: "/editor",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function EditorPage() {
  return <MarkdownLensApp />;
}
