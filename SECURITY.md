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

## Expectations

Markdown Lens should remain safe by default:

- Do not execute unsafe raw HTML from Markdown input.
- Do not add analytics, tracking, authentication, or backend upload behavior without explicit discussion.
- Keep Markdown content local to the browser unless a future feature clearly explains otherwise and requires user action.
