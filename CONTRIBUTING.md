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
npm run build
```

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

## Good First Contribution Ideas

- Improve README wording or screenshots
- Add Markdown examples for edge cases
- Polish mobile spacing or responsive behavior
- Improve print/PDF output styles
- Add accessibility checks for toolbar controls
- Improve Mermaid error messages
- Add tests or fixtures for Markdown rendering
- Review dependency updates and compatibility notes

## Code Style

Follow the existing project style:

- TypeScript-first
- Tailwind CSS for styling
- Small, focused components
- Clear UI copy
- No unnecessary dependencies

When in doubt, open an issue first and describe the change you want to make.
