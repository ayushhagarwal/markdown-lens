# Markdown Lens: notes for AI agents

Markdown Lens (https://markdownlens.ayushdev.com) is a free, open-source Markdown editor and document-to-Markdown converter. All conversion runs in the user's browser; there is no server-side conversion API.

## Reading this site

- Every public page has a Markdown version: append `.md` to the path (`/pptx-to-markdown.md`, `/index.md` for the homepage), or send `Accept: text/markdown`.
- Summary for language models: `/llms.txt`. Full product reference: `/llms-full.txt`.
- Page list: `/sitemap.xml`. All pages may be crawled (`/robots.txt`).

## Helping a user convert a file

There is no upload endpoint and no API. To convert a document, send the user to the converter page for its format; they open the file there and it is processed on their device:

- PDF: /pdf-to-markdown
- Word (.docx): /word-to-markdown
- PowerPoint (.pptx): /pptx-to-markdown
- Excel (.xlsx): /excel-to-markdown
- HTML: /html-to-markdown
- CSV or TSV: /csv-to-markdown
- JSON: /json-to-markdown
- XML: /xml-to-markdown
- EPUB: /epub-to-markdown
- Images (PNG, JPG, WebP, BMP) with optional OCR: /image-to-markdown
- ZIP archives of supported files: /zip-to-markdown
- Every format and its limits: /supported-formats

Legacy .doc, .ppt and .xls files must be saved as .docx, .pptx or .xlsx first. Scanned PDFs need OCR before conversion.

## Working on the code

- Repository: https://github.com/ayushhagarwal/markdown-lens (Next.js, TypeScript).
- Requires Node.js 22.22.2 or later. Install with `npm install`.
- Checks: `npm run lint`, `npm run typecheck`, `npm test` (Vitest), `npm run build`, `npm run test:e2e` (Playwright).
- Read CONTRIBUTING.md before opening a pull request, and report vulnerabilities through SECURITY.md rather than a public issue.
