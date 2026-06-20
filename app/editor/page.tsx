import type { Metadata } from "next";
import { MarkdownLensApp } from "@/components/markdown-lens-app";

export const metadata: Metadata = {
  title: "Markdown Editor",
  description:
    "Open, write, and preview Markdown with GitHub-style rendering, Mermaid diagrams, math, code highlighting, and local browser autosave.",
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
