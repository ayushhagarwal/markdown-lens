import type { Metadata } from "next";
import {
  ConversionLandingPage,
  type ConversionLandingPageConfig,
} from "@/components/conversion-landing-page";
import { siteConfig } from "@/lib/site";

const title = "Free Word to Markdown Converter (.docx) | Markdown Lens";
const description =
  "Convert a Microsoft Word .docx file to editable Markdown locally in your browser. Keep headings, lists, links, simple tables, and common text formatting without a server upload.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: {
    canonical: "/word-to-markdown",
  },
  openGraph: {
    type: "website",
    url: "/word-to-markdown",
    title,
    description,
    siteName: siteConfig.name,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Markdown Lens Word .docx to Markdown converter",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/opengraph-image"],
  },
};

const config = {
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
      title: "Explicit image placeholders",
      description:
        "Embedded images are not silently lost. The converter inserts a visible Markdown note for each omitted image so you know where manual asset work remains.",
    },
  ],
  limitsHeading: "Know the Word limitations",
  limitsIntro:
    "Markdown intentionally has fewer layout controls than Word. The converter prioritizes portable content and makes unsupported pieces visible.",
  limitations: [
    "Legacy .doc files are not supported; save them as .docx in Word, Pages, LibreOffice, or Google Docs first.",
    "Embedded images are represented by placeholders but are not extracted into separate files.",
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
        "Embedded images become visible omission notes rather than extracted files. Complex tables, columns, text boxes, merged cells, and precise page positioning may require manual reconstruction because Markdown does not represent fixed page layout.",
    },
  ],
  related: [
    {
      href: "/pdf-to-markdown",
      title: "PDF to Markdown converter",
      description: "Extract selectable PDF text page by page into editable Markdown locally.",
    },
    {
      href: "/markdown-cheatsheet",
      title: "Markdown cheatsheet",
      description: "Learn the headings, lists, tables, links, code, and other syntax in the output.",
    },
  ],
} as const satisfies ConversionLandingPageConfig;

export default function WordToMarkdownPage() {
  return <ConversionLandingPage config={config} />;
}
