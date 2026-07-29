# Security Policy

Markdown Lens is a browser-first Markdown viewer. It should not upload Markdown content to a backend, and changes should preserve that privacy-first behavior.

## Reporting a Vulnerability

Please do not open a public issue for a suspected security vulnerability.

Use GitHub's private vulnerability reporting feature for this repository if available. If it is not available, contact the maintainer privately through GitHub with:

- A clear description of the issue
- Steps to reproduce
- Example Markdown input, if relevant
- Browser and operating system details
- Any suggested fix or mitigation

## Scope

Security-sensitive areas include:

- Markdown rendering behavior
- Raw HTML handling
- Mermaid rendering
- Exported HTML output
- Clipboard and file import/export behavior
- Any change that could upload or expose user Markdown content
- IndexedDB document and asset persistence, migration, backup, and restore
- ZIP, EPUB, Office, and other archive-based parsers
- Local OCR workers and same-origin language-model assets
- URL-fragment share links and malformed or oversized payload handling

## Expectations

Markdown Lens should remain safe by default:

- Do not execute unsafe raw HTML from Markdown input.
- Do not add analytics, tracking, authentication, or backend upload behavior without explicit discussion.
- Keep Markdown content local to the browser unless a future feature clearly explains otherwise and requires user action.
- Never extract archive entries to filesystem paths; enforce entry-count and expanded-size limits before conversion.
- Treat converted HTML, SVG, links, document metadata, filenames, and OCR output as untrusted input.
- Keep share payloads in URL fragments. Do not place document content in query parameters, paths, analytics, or logs.
- Do not describe URL compression as encryption; anyone with the complete share URL can read its contents.
- Store OCR language data and workers on the same origin, and never send image or document bytes to an OCR service.
- Validate workspace backups and document-to-asset ownership before writing records, reject ID collisions, and keep schema migrations idempotent.

## Current Limits

- Input files are limited to 100 MB.
- Workspace backup files are limited to 64 MiB, 1,000 documents, and 2,000 assets. A single decoded asset is limited to 16 MiB and decoded assets are limited to 48 MiB in aggregate.
- ZIP archives are limited to 100 files, one archive level, and 250 MB expanded content.
- Share fragments are capped to protect browsers from unstable URLs and decompression abuse.
- Legacy binary DOC, PPT, and XLS parsers are intentionally excluded.
