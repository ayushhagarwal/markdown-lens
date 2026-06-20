type StandaloneHtmlOptions = {
  bodyHtml: string;
  title: string;
};

const standaloneStyles = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #f6f8fa;
    color: #1f2328;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    line-height: 1.65;
  }
  main {
    width: min(100% - 2rem, 900px);
    margin: 2rem auto;
    border: 1px solid #d0d7de;
    border-radius: 12px;
    background: #fff;
    padding: clamp(1.25rem, 4vw, 3rem);
    box-shadow: 0 18px 55px rgb(31 35 40 / 0.08);
  }
  h1, h2, h3, h4, h5, h6 {
    margin: 1.5em 0 0.65em;
    line-height: 1.2;
  }
  h1, h2 { border-bottom: 1px solid #d8dee4; padding-bottom: 0.35em; }
  h1 { margin-top: 0; font-size: 2rem; }
  h2 { font-size: 1.5rem; }
  h3 { font-size: 1.25rem; }
  p, ul, ol, blockquote, table, pre { margin: 1rem 0; }
  ul, ol { padding-left: 1.5rem; }
  li + li { margin-top: 0.25rem; }
  a { color: #0969da; text-underline-offset: 3px; }
  img, svg { max-width: 100%; height: auto; }
  blockquote {
    margin-left: 0;
    border-left: 4px solid #1a7f67;
    border-radius: 0 8px 8px 0;
    background: #eef8f4;
    padding: 0.75rem 1rem;
  }
  table {
    display: block;
    width: 100%;
    overflow-x: auto;
    border-collapse: collapse;
  }
  th, td { border: 1px solid #d0d7de; padding: 0.55rem 0.75rem; text-align: left; }
  th { background: #f6f8fa; }
  code {
    border-radius: 5px;
    background: #eff1f3;
    padding: 0.12rem 0.32rem;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 0.9em;
  }
  pre {
    overflow-x: auto;
    border-radius: 8px;
    background: #0d1117;
    padding: 1rem;
    color: #e6edf3;
  }
  pre code { background: transparent; padding: 0; color: inherit; }
  .hljs-keyword, .hljs-selector-tag, .hljs-literal { color: #ff7b72; }
  .hljs-string, .hljs-attr { color: #a5d6ff; }
  .hljs-title, .hljs-function { color: #d2a8ff; }
  .hljs-comment { color: #8b949e; }
  .katex-display { overflow-x: auto; padding: 0.5rem 0; }
  @media (max-width: 640px) {
    body { background: #fff; }
    main { width: 100%; margin: 0; border: 0; border-radius: 0; box-shadow: none; }
  }
  @media print {
    body { background: #fff; }
    main { width: 100%; margin: 0; border: 0; box-shadow: none; }
  }
`;

export function buildStandaloneHtmlDocument({
  bodyHtml,
  title,
}: StandaloneHtmlOptions) {
  const safeTitle = escapeHtml(title);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src data:">
  <meta name="generator" content="Markdown Lens">
  <title>${safeTitle}</title>
  <style>${standaloneStyles}</style>
</head>
<body>
  <main>${bodyHtml}</main>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}
