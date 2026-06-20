# Markdown Lens

A beautiful, privacy-first online Markdown viewer for AI notes, READMEs, docs, changelogs, and developer writing.

[Live Demo](https://markdownlens.ayushdev.com) · [Report Bug](../../issues) · [Request Feature](../../issues)

![Markdown Lens showing a Markdown document beside its rendered preview](./public/screenshot.png)

Markdown Lens helps you paste Markdown and instantly preview it with clean, GitHub-style rendering. It is built for developers, writers, and open-source maintainers who want a fast viewer without accounts, ads, analytics, or unnecessary UI.

## Why Markdown Lens?

Markdown is everywhere: AI notes, project READMEs, technical specs, release notes, and developer journals. Many preview tools either feel dated, add distractions, or route content through services you may not want to use for private drafts.

Markdown Lens exists to provide a simple, polished, browser-first Markdown viewer that is pleasant enough for daily use and transparent enough for open-source review.

## Common Use Cases

- **Preview README drafts** before committing them to GitHub.
- **Clean up AI-generated Markdown** and check headings, lists, tables, and code fences.
- **Validate Mermaid diagrams and math** alongside the surrounding documentation.
- **Review changelogs and release notes** in a focused, readable layout.
- **Export documentation** by downloading the Markdown or printing the rendered preview to PDF.

## Features

- Live Markdown editor and preview
- GitHub-flavored Markdown support, including tables, task lists, strikethrough, and autolinks
- Syntax highlighting for common code blocks
- Mermaid diagram rendering with safe fallback for invalid diagrams
- KaTeX math support for inline and block math
- Light and dark mode with local preference persistence
- Local draft autosave using `localStorage`
- Copy raw Markdown
- Copy rendered HTML
- Download current content as a `.md` file
- Print or save the preview as PDF
- Split, editor-only, and preview-only modes
- Mobile-friendly editor and preview tabs
- Word count, character count, and estimated reading time
- Keyboard shortcuts for common editor actions
- A responsive [Markdown cheatsheet](https://markdownlens.ayushdev.com/markdown-cheatsheet)

## Keyboard Shortcuts

Markdown Lens supports the same shortcuts on macOS (`Cmd`) and Windows/Linux
(`Ctrl`). Shortcut hints are also available from the relevant toolbar controls.

| Action | Shortcut |
| --- | --- |
| Download Markdown | `Cmd/Ctrl + S` |
| Copy Markdown | `Cmd/Ctrl + Shift + C` |
| Copy rendered HTML | `Cmd/Ctrl + Shift + H` |
| Switch to Preview | `Cmd/Ctrl + Shift + P` |
| Switch to Editor | `Cmd/Ctrl + Shift + E` |
| Load sample Markdown | `Cmd/Ctrl + Shift + L` |

## Local-Only Privacy

Markdown Lens is designed to be privacy-first.

- Markdown is parsed and rendered directly in your browser.
- Drafts are saved only to that browser profile using `localStorage`.
- The app does not upload document content to a backend.
- There is no account, database, analytics, or tracking in v0.1.

Because drafts are stored by the browser, anyone with access to your device or browser profile may be able to view locally saved content. Clear the editor when you are done with sensitive notes.

## Tech Stack

- [Next.js](https://nextjs.org/) App Router
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [lucide-react](https://lucide.dev/)
- [react-markdown](https://github.com/remarkjs/react-markdown)
- [remark-gfm](https://github.com/remarkjs/remark-gfm)
- [remark-math](https://github.com/remarkjs/remark-math)
- [rehype-katex](https://github.com/remarkjs/remark-math/tree/main/packages/rehype-katex)
- [rehype-highlight](https://github.com/rehypejs/rehype-highlight)
- [Mermaid](https://mermaid.js.org/)

## Local Development

Clone the repository, install dependencies, and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful checks:

```bash
npm run lint
npm run typecheck
npm run build
```

## Project Structure

```text
app/
  globals.css        Global styles, Markdown rendering styles, and print CSS
  layout.tsx         App metadata, fonts, and root layout
  page.tsx           Home route
components/
  markdown-lens-app.tsx
                    Main editor, preview, toolbar, and rendering experience
lib/
  utils.ts           Small shared utilities
public/
  screenshot.png     Current application screenshot
```

## Roadmap

- Add import from local `.md` files
- Add shareable state export without uploading content
- Improve copied HTML output styling
- Add more Markdown fixture tests
- Add accessibility and keyboard-navigation polish
- Publish a stable v0.1 release

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

Good places to start include documentation improvements, accessibility checks, Markdown rendering edge cases, responsive UI polish, and small bug fixes.

## License

Markdown Lens is released under the [MIT License](./LICENSE).

Markdown Lens is an independent open-source project maintained in personal time.
