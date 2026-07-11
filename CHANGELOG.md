# Changelog

All notable Markdown Lens changes are documented here.

## v0.9.4 - 2026-07-11

### Testing

- Added desktop and mobile homepage contracts for metadata, structured data, theme initialization, mobile navigation, and responsive product-preview tabs.
- Added homepage axe coverage requiring no serious or critical accessibility violations.

## v0.9.3 - 2026-07-11

### Changed

- Rebuilt the homepage around a restrained product-led hero, a continuous local conversion workflow, and a compact privacy/open-source close.
- Replaced crowded capability and FAQ sections with dedicated format and guide links.
- Added a responsive code-native workspace preview with mobile Markdown and Preview tabs.
- Removed homepage FAQ structured data while preserving WebSite, WebPage, and SoftwareApplication metadata.

## v0.9.2 - 2026-07-11

### Changed

- Simplified the shared marketing header and footer around Formats, Guide, Security, GitHub, and one workspace action.
- Made graphite the first-visit homepage theme while preserving saved theme preferences and the adaptive light presentation.
- Updated the public product title to position Markdown Lens as a local document-to-Markdown workspace.

### Accessibility

- Added a pre-hydration theme bootstrap to prevent a visible light-to-dark flash.

## v0.9.1 - 2026-07-11

### Changed

- Updated the README, contributor guide, security model, and AI-readable references to match the v0.9 local workspace and converter architecture.
- Clarified archive, OCR, URL-fragment sharing, IndexedDB, and exported-asset security expectations.

## v0.9.0 - 2026-07-10

### Added

- A four-pane local document workspace with Documents, CodeMirror editor, rendered Preview, and navigable Outline.
- IndexedDB document and asset persistence with migration from the previous single local draft, search, duplication, trash, restore, and workspace backup/restore.
- A lazy local converter registry for Markdown/text, PDF, DOCX, PPTX, XLSX, HTML, CSV/TSV, JSON, XML, EPUB, bounded ZIP archives, and images with optional local English OCR.
- Conversion jobs with progress, cancellation, warnings, omitted-content reporting, statistics, and per-document conversion reports.
- Resizable editor/preview split, find/replace, command palette, code-block copy controls, mobile workspace panes, and a compact status bar.
- Privacy-preserving compressed URL-fragment share links, Markdown-plus-assets ZIP export, offline service worker, PWA install state, and same-origin OCR model caching.
- Format-specific landing pages, supported-format matrix, Vitest coverage, browser and accessibility tests, and Node 20/22 CI.

### Changed

- DOCX embedded images are extracted into local document assets instead of being represented only as omitted-image notices.
- The editor uses the accepted graphite-and-teal workbench design with heavy editor and converter dependencies loaded on demand.
- Package version and structured software metadata now report v0.9.0.

### Security

- ZIP imports are limited to 100 entries, one nesting level, 100 MB input, and 250 MB expanded content.
- Legacy XLS support was not implemented because the available spreadsheet dependency failed the production vulnerability audit; users receive guidance to export XLSX instead.
- Share payloads remain in URL fragments and imported content remains local to the browser.

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
