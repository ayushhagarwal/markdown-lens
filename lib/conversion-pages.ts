import type { ConversionLandingPageConfig } from "@/components/conversion-landing-page";

export const pdfPageConfig = {
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
      question: "Does it extract images from the PDF?",
      answer:
        "No. The PDF converter extracts text only, so the Markdown has no image links. If you need Markdown with local image files, convert the original Word (.docx) or PowerPoint (.pptx) file instead, which keeps embedded images as assets, or save the figures as images and import them with the image converter.",
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
      title: "Markdown cheat sheet",
      description: "Review the syntax used in the generated output and copy practical examples.",
    },
    {
      href: "/zip-to-markdown",
      title: "ZIP to Markdown importer",
      description: "Convert a folder of PDFs and other documents from one ZIP archive at once.",
    },
  ],
} as const satisfies ConversionLandingPageConfig;

export const wordPageConfig = {
  path: "/word-to-markdown",
  eyebrow: "Private .docx conversion in your browser",
  title: "Free Word to Markdown converter",
  summary:
    "Markdown Lens converts Microsoft Word .docx files into editable Markdown locally in your browser. Open a document, review preserved headings, lists, links, simple tables, and formatting, then download the result without an account or server upload.",
  supportingSummary:
    "It is built for modern .docx files such as handbooks, product specs, documentation drafts, meeting notes, and operating procedures.",
  cta: "Convert a Word document",
  sourceLabel: "Microsoft Word .docx",
  sourceFileName: "team-handbook.docx",
  sourceLines: [
    "Team Handbook",
    "Working agreements",
    "• Write decisions down",
    "• Review the release checklist",
    "Owner | Responsibility",
  ],
  markdownLines: [
    "# Team Handbook",
    "",
    "## Working agreements",
    "",
    "- Write decisions down",
    "- Review the release checklist",
    "",
    "| Owner | Responsibility |",
    "| --- | --- |",
  ],
  highlights: [
    "Modern .docx files up to 100 MB",
    "Headings and lists preserved",
    "Simple tables converted",
    "Links and text styles retained",
  ],
  steps: [
    {
      title: "Choose a .docx file",
      description:
        "Select a modern Microsoft Word document from your device. It is read directly by your browser and never posted to a Markdown Lens backend.",
    },
    {
      title: "Translate document structure",
      description:
        "Markdown Lens converts Word headings, paragraphs, lists, links, simple tables, code-like blocks, and common inline formatting into Markdown syntax.",
    },
    {
      title: "Polish the Markdown",
      description:
        "Compare the source with a live rendered preview, make any cleanup edits, then copy or download the Markdown for your next destination.",
    },
  ],
  outputHeading: "What the Word converter keeps",
  outputIntro:
    "Word documents contain more semantic structure than PDFs, so .docx conversion can retain many familiar document elements while producing readable plain text.",
  outputItems: [
    {
      title: "Heading hierarchy and paragraphs",
      description:
        "Word heading styles become ATX Markdown headings. Ordinary text becomes clean paragraphs, and the filename supplies a title when the document has no top-level heading.",
    },
    {
      title: "Lists and common formatting",
      description:
        "Ordered and unordered lists, bold, italic, strikethrough, inline links, autolinked web addresses, blockquotes, and preformatted text are translated to Markdown equivalents.",
    },
    {
      title: "Simple tables",
      description:
        "Table rows and cells are converted to GitHub-flavored Markdown tables with escaped pipe characters and a generated header separator.",
    },
    {
      title: "Embedded images as local assets",
      description:
        "Embedded Word images are extracted into the local document workspace so they can be previewed and exported with the Markdown bundle.",
    },
  ],
  limitsHeading: "Know the Word limitations",
  limitsIntro:
    "Markdown intentionally has fewer layout controls than Word. The converter prioritizes portable content and makes unsupported pieces visible.",
  limitations: [
    "Legacy .doc files are not supported; save them as .docx in Word, Pages, LibreOffice, or Google Docs first.",
    "Image quality depends on what was embedded in the .docx package; floating layouts may still need review.",
    "Merged cells, nested tables, text boxes, columns, footnotes, and complex page layout may need manual cleanup.",
    "Macros, embedded objects, tracked-change history, and comments are not carried into the Markdown output.",
  ],
  useCases: [
    {
      title: "Handbooks and operating procedures",
      description:
        "Move structured team documentation from .docx into repositories, static sites, or Markdown-based knowledge systems.",
    },
    {
      title: "Product specs and technical drafts",
      description:
        "Preserve the useful hierarchy, lists, links, and simple tables before reviewing the source with engineering or documentation teams.",
    },
    {
      title: "README and documentation prep",
      description:
        "Turn an existing Word draft into plain-text source that can be refined for GitHub, a docs site, or an AI-assisted editing workflow.",
    },
  ],
  faq: [
    {
      question: "Is this Word to Markdown converter free?",
      answer:
        "Yes. Markdown Lens is free and open source, requires no account, and lets you copy or download the generated Markdown without a watermark.",
    },
    {
      question: "Does Markdown Lens upload my Word document?",
      answer:
        "No. The .docx file is read, converted, edited, and autosaved locally in your browser. Document content is not sent to a Markdown Lens application server.",
    },
    {
      question: "Can it convert old .doc files?",
      answer:
        "Not directly. The legacy binary .doc format is different from .docx. Open the file in a trusted word processor, save or export it as .docx, and then convert that file in Markdown Lens.",
    },
    {
      question: "What happens to images and complex Word layouts?",
      answer:
        "Embedded images are extracted as local document assets and can be exported with the Markdown bundle. Complex tables, columns, text boxes, merged cells, and precise page positioning may still require manual reconstruction because Markdown does not represent fixed page layout.",
    },
  ],
  related: [
    {
      href: "/pdf-to-markdown",
      title: "PDF to Markdown converter",
      description: "Extract selectable PDF text page by page into editable Markdown locally.",
    },
    {
      href: "/pptx-to-markdown",
      title: "PowerPoint to Markdown converter",
      description: "Convert PPTX slides, notes, and embedded images locally.",
    },
    {
      href: "/zip-to-markdown",
      title: "ZIP to Markdown importer",
      description: "Convert a folder of Word files and other documents from one ZIP archive.",
    },
  ],
} as const satisfies ConversionLandingPageConfig;
