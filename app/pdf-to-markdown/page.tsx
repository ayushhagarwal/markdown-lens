import type { Metadata } from "next";
import {
  ConversionLandingPage,
  type ConversionLandingPageConfig,
} from "@/components/conversion-landing-page";
import { pageMetadata } from "@/lib/seo";

const title = "Free PDF to Markdown Converter | Markdown Lens";
const description =
  "Convert a text-based PDF to editable Markdown locally in your browser. Free, private, and built for documents, Confluence exports, headings, lists, links, and page-by-page review.";

export const metadata: Metadata = pageMetadata({
  title,
  description,
  path: "/pdf-to-markdown",
  absoluteTitle: true,
});

const config = {
  path: "/pdf-to-markdown",
  eyebrow: "Free and private — no server upload",
  title: "Free PDF to Markdown converter",
  summary:
    "Markdown Lens converts text-based PDF files into editable Markdown entirely in your browser. Choose a PDF, review the page-by-page output, and download a clean .md file without creating an account or uploading the document to a server.",
  supportingSummary:
    "It is designed for PDFs that contain selectable text, including documentation exports, product specs, handbooks, and reports.",
  cta: "Convert a PDF",
  sourceLabel: "Text-based PDF",
  sourceFileName: "product-handbook.pdf",
  sourceLines: [
    "Product Handbook",
    "Overview and operating principles",
    "1. Keep decisions documented",
    "2. Link each change to its owner",
  ],
  markdownLines: [
    "# Product Handbook",
    "",
    "<!-- Page 1 -->",
    "",
    "## Overview and operating principles",
    "",
    "1. Keep decisions documented",
    "2. Link each change to its owner",
  ],
  highlights: [
    "Up to 100 MB",
    "Page separators retained",
    "Headings and lists inferred",
    "Links collected where available",
  ],
  steps: [
    {
      title: "Choose a PDF",
      description:
        "Open a text-based PDF from your device. The file is handed directly to the browser and is never posted to a Markdown Lens backend.",
    },
    {
      title: "Extract page by page",
      description:
        "Markdown Lens reads selectable text, groups lines into paragraphs, detects likely headings and lists, and marks each original page.",
    },
    {
      title: "Review and export",
      description:
        "Edit the generated Markdown beside a rendered preview, then copy it, download .md, export HTML, or print the result.",
    },
  ],
  outputHeading: "What the PDF converter preserves",
  outputIntro:
    "PDF is a visual format, so conversion is necessarily interpretive. Markdown Lens focuses on producing readable source that is easy to review instead of pretending to reproduce every pixel.",
  outputItems: [
    {
      title: "Document and page structure",
      description:
        "The filename becomes a document title, page boundaries become Markdown comments and horizontal separators, and empty pages are identified clearly.",
    },
    {
      title: "Headings, paragraphs, and lists",
      description:
        "Font-size differences help infer heading levels. Bulleted and numbered lines become Markdown lists, while wrapped lines are joined into readable paragraphs.",
    },
    {
      title: "Code-like text and web links",
      description:
        "Text set in common monospaced fonts is placed in fenced code blocks. Visible URLs are linked, and additional PDF web links are listed by page.",
    },
    {
      title: "Cleaner repeated margins",
      description:
        "Repeated headers, footers, and standalone page numbers are removed when they can be identified consistently across pages.",
    },
  ],
  limitsHeading: "Know the PDF limitations",
  limitsIntro:
    "A PDF stores positioned content rather than document semantics. These boundaries are stated up front so you can choose the right workflow.",
  limitations: [
    "Scanned or image-only PDFs need OCR first because they contain no selectable text.",
    "Images and charts are skipped; Markdown Lens does not upload or extract embedded image assets.",
    "Complex visual tables, multi-column layouts, and precise typography may need manual cleanup.",
    "Password-protected, damaged, or unusually encoded PDFs may not open successfully.",
  ],
  useCases: [
    {
      title: "Confluence exports",
      description:
        "Turn a text-based Confluence PDF export into a Markdown draft for migration, cleanup, or reuse in a knowledge base.",
    },
    {
      title: "Product and engineering specs",
      description:
        "Recover headings, paragraphs, lists, code-like text, and links from specs that need to return to an editable format.",
    },
    {
      title: "AI-ready source material",
      description:
        "Create reviewable plain-text source for documentation systems, repositories, and retrieval workflows without sending the original file away.",
    },
  ],
  faq: [
    {
      question: "Is this PDF to Markdown converter free?",
      answer:
        "Yes. Markdown Lens is free and open source, requires no account, and does not add watermarks to the generated Markdown.",
    },
    {
      question: "Does Markdown Lens upload my PDF?",
      answer:
        "No. PDF parsing, text extraction, Markdown conversion, editing, and draft autosave happen locally in your browser. The document is not sent to a Markdown Lens application server.",
    },
    {
      question: "Can it convert a scanned PDF to Markdown?",
      answer:
        "Not directly. Scanned PDFs contain images rather than selectable text, and Markdown Lens does not perform OCR. Run OCR in a trusted tool first, then convert the resulting text-based PDF.",
    },
    {
      question: "Will the Markdown look exactly like the PDF?",
      answer:
        "No. Markdown represents document structure rather than fixed visual layout. The converter aims for editable headings, paragraphs, lists, links, code-like blocks, and page boundaries; complex tables and visual positioning may require cleanup.",
    },
  ],
  related: [
    {
      href: "/word-to-markdown",
      title: "Word to Markdown converter",
      description: "Convert .docx headings, lists, links, simple tables, and formatting locally.",
    },
    {
      href: "/markdown-cheatsheet",
      title: "Markdown cheatsheet",
      description: "Review the syntax used in the generated output and copy practical examples.",
    },
  ],
} as const satisfies ConversionLandingPageConfig;

export default function PdfToMarkdownPage() {
  return <ConversionLandingPage config={config} />;
}
