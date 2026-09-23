export const WELCOME_DOCUMENT_TITLE = "Welcome to Markdown Lens";

export const WELCOME_DOCUMENT_MARKDOWN = `# Welcome to Markdown Lens

A private workspace for writing and converting documents. The preview beside this note is the real renderer.

## Goals

- Keep the source next to the rendered page
- Convert a file without uploading it
- Export Markdown when the result looks right

## What the preview can show

| Format | What you get |
| --- | --- |
| PDF | Extracted text |
| Word | Headings, lists, and tables |
| Markdown | A live preview |

## A snippet

\`\`\`ts
const workspace = "local";
\`\`\`

## From file to preview

\`\`\`mermaid
graph LR
  File --> Markdown
  Markdown --> Preview
\`\`\`

## Math

$$E = mc^2$$

> Files stay in this browser unless you export or share them.
`;
