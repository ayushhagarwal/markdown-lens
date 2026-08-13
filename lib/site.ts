import packageJson from "../package.json";

export const siteConfig = {
  name: "Markdown Lens",
  url: "https://markdownlens.ayushdev.com",
  githubUrl: "https://github.com/ayushhagarwal/markdown-lens",
  title: "Free Local Markdown Editor and Document Converter | Markdown Lens",
  description:
    "Markdown Lens is a free, privacy-first Markdown editor and document-to-Markdown workbench with local PDF, Word, PowerPoint, Excel, HTML, EPUB, data, archive, and image OCR conversion plus editable GitHub-style previews.",
  shortDescription:
    "Edit Markdown privately in your browser and convert PDF, Word, PowerPoint, Excel, HTML, and more into GitHub-style Markdown without an account or server upload.",
  dateModified: "2026-08-13",
  softwareVersion: packageJson.version,
  author: {
    name: "Ayush Agarwal",
    url: "https://github.com/ayushhagarwal",
  },
  features: [
    "Live Markdown editor and preview",
    "GitHub-flavored Markdown rendering",
    "Mermaid diagram rendering",
    "KaTeX math rendering",
    "Syntax-highlighted code blocks",
    "Tables, task lists, strikethrough, and autolinks",
    "Copy Markdown and rendered HTML",
    "Download Markdown files",
    "Import local Markdown files",
    "Upload PDFs and Word .docx files",
    "Convert PowerPoint .pptx and Excel .xlsx locally",
    "Convert HTML, CSV, TSV, JSON, XML, EPUB, and safe ZIP archives locally",
    "Import images with optional local English OCR",
    "Convert text-based PDFs to Markdown locally",
    "Convert Word .docx files to Markdown locally",
    "Export rendered Markdown as standalone HTML",
    "Print or save preview as PDF",
    "Local draft autosave with no account required",
    "Local multi-document workspace with IndexedDB persistence",
    "Document outline, find and replace, command palette, and resizable preview",
    "Privacy-preserving URL-fragment share links",
    "Installable offline-capable Progressive Web App",
    "Keyboard shortcuts for common actions",
    "Light and dark mode",
  ],
};

export const primaryNav = [
  { href: "/pdf-to-markdown", label: "PDF" },
  { href: "/word-to-markdown", label: "Word" },
  { href: "/supported-formats", label: "Formats" },
  { href: "/markdown-cheatsheet", label: "Guide" },
] as const;

export const converterLinks = [
  { href: "/pdf-to-markdown", label: "PDF", description: "Convert text-based PDFs locally." },
  { href: "/word-to-markdown", label: "Word", description: "Convert .docx files locally." },
  { href: "/pptx-to-markdown", label: "PowerPoint", description: "Convert PPTX slides locally." },
  { href: "/excel-to-markdown", label: "Excel", description: "Convert XLSX sheets to tables." },
  { href: "/html-to-markdown", label: "HTML", description: "Convert local HTML files." },
  { href: "/csv-to-markdown", label: "CSV", description: "Convert CSV or TSV to tables." },
  { href: "/json-to-markdown", label: "JSON", description: "Turn JSON into fenced Markdown." },
  { href: "/xml-to-markdown", label: "XML", description: "Turn XML into fenced Markdown." },
  { href: "/epub-to-markdown", label: "EPUB", description: "Convert EPUB chapters locally." },
  { href: "/image-to-markdown", label: "Images", description: "Import images with optional OCR." },
  { href: "/zip-to-markdown", label: "ZIP", description: "Import supported files from a ZIP." },
] as const;

export const sitemapPaths = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "/pdf-to-markdown", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/word-to-markdown", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/supported-formats", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/markdown-cheatsheet", priority: 0.8, changeFrequency: "monthly" as const },
  ...converterLinks
    .filter((link) => !["/pdf-to-markdown", "/word-to-markdown"].includes(link.href))
    .map((link) => ({
      path: link.href,
      priority: 0.8,
      changeFrequency: "monthly" as const,
    })),
];
