# Changelog

All notable Markdown Lens changes are documented here.

## v0.2.1 - 2026-06-27

### Added

- Dedicated, indexable PDF-to-Markdown and Word-to-Markdown landing pages with concise summaries, accurate conversion details, limitations, examples, FAQs, and direct editor actions.
- A shared site footer with contextual links to conversion tools, the editor, the Markdown cheatsheet, AI-readable references, and the open-source repository.

### Changed

- Homepage opening copy now gives search engines and visitors a direct two-sentence product summary.
- Homepage feature content, the sitemap, and AI-readable reference files now link to and describe the dedicated conversion workflows consistently.

### Notes

- Both conversion pages are statically rendered and keep document processing local to the browser.
- No analytics, tracking, account system, or server-side document upload was added.

## v0.2.0 - 2026-06-25

### Added

- Local PDF-to-Markdown import for text-based PDF exports, including page-by-page progress, page separators, repeated header/footer cleanup, basic heading/list/code inference, and clear handling for scanned or encrypted PDFs.
- Local Word-to-Markdown import for `.docx` files, preserving common document structure such as headings, paragraphs, lists, tables, links, inline formatting, footnote references, and code-like blocks.
- Homepage copy that highlights PDF and Word upload as a first-class document-to-Markdown workflow.
- CI release guard requiring pull requests to update release notes and the package release version together before merge.

### Changed

- File picker and drag-and-drop copy now make PDF and Word import support clearer.
- Legacy `.doc` files are rejected with explicit guidance to save or export as `.docx` first.

### Notes

- PDF and Word conversion remains local to the browser.
- OCR, image extraction, visual table reconstruction, and legacy `.doc` conversion are not included in this release.
