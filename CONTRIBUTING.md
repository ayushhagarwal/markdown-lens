# Contributing to Markdown Lens

Thanks for your interest in contributing. Markdown Lens aims to stay simple, privacy-first, and useful for developers who work with Markdown every day.

## Local Setup

Install dependencies and start the local development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Before opening a pull request, run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:pwa
```

### Offline PWA verification

The service worker is intentionally disabled by `npm run dev`. Use the production-only regression to build the app, start it on port 3100, warm the application caches, switch Chromium offline, and verify the editor plus code, math, and Mermaid rendering:

```bash
npm run test:pwa
```

For a manual installability audit, run `npm run build` and `npm run start`, open `/editor` in Chromium, and inspect **Application → Manifest** and **Application → Service Workers**. Confirm that the 192 px and 512 px icons render cleanly, the start URL is `/editor`, the display mode is `standalone`, and an offline reload succeeds after one online visit. Lighthouse versions that still expose installability checks should report no PWA installability failures; newer versions have moved these checks to the Application panel.

## Branch Naming

Use short, descriptive branch names. Suggested prefixes:

- `feature/short-description`
- `fix/short-description`
- `docs/short-description`
- `chore/short-description`

Examples:

```text
feature/file-import
fix/mermaid-error-state
docs/readme-roadmap
```

## Pull Request Expectations

- Keep pull requests focused and reasonably small.
- Describe what changed and why.
- Include screenshots or short recordings for visible UI changes.
- Mention any known limitations or follow-up work.
- Avoid adding backend services, analytics, authentication, or paid APIs without prior discussion.
- Preserve the privacy-first behavior: Markdown should stay in the browser and should not be uploaded.
- Add or update a deterministic converter fixture when changing parsing behavior.
- Keep heavy editor, OCR, Office, archive, and rendering libraries behind dynamic imports.
- Document retained, flattened, and omitted content in conversion results instead of claiming visual fidelity.

## Good First Contribution Ideas

- Improve README wording or screenshots
- Add Markdown examples for edge cases
- Polish mobile spacing or responsive behavior
- Improve print/PDF output styles
- Add accessibility checks for toolbar controls
- Improve Mermaid error messages
- Add tests or fixtures for Markdown rendering
- Add small, license-safe fixtures for PDF, DOCX, PPTX, XLSX, EPUB, HTML, CSV, JSON, XML, and archive edge cases
- Review dependency updates and compatibility notes

## Code Style

Follow the existing project style:

- TypeScript-first
- Tailwind CSS for styling
- Small, focused components
- Clear UI copy
- No unnecessary dependencies

When in doubt, open an issue first and describe the change you want to make.

## Converter Contract

Converters implement the `LocalConverter` interface in `lib/converters/types.ts`. They must:

- Recognize only the formats they own.
- Validate input limits before allocating large buffers.
- Report progress and observe `AbortSignal` between meaningful units of work.
- Return warnings, omitted-content notes, statistics, and local assets with the Markdown.
- Avoid network calls, temporary filesystem paths, executable document content, and silent data loss.
