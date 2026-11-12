export type CheatsheetExample = { title: string; syntax: string };
export type CheatsheetSection = { id: string; title: string; description: string; examples: readonly CheatsheetExample[] };

export const cheatsheetQuickReference = [
  ["Heading", "# H1  ## H2  ### H3"],
  ["Bold", "**bold text**"],
  ["Italic", "*italic text*"],
  ["Strikethrough", "~~deleted~~"],
  ["Link", "[title](https://example.com)"],
  ["Image", "![alt text](image.png)"],
  ["Inline code", "`code`"],
  ["Code block", "```js … ```"],
  ["Blockquote", "> quoted text"],
  ["Unordered list", "- item"],
  ["Ordered list", "1. item"],
  ["Task list", "- [ ] to do  - [x] done"],
  ["Table", "| A | B |  then  | --- | --- |"],
  ["Horizontal rule", "---"],
  ["Footnote", "text[^1]  [^1]: note"],
  ["Inline math", "$E = mc^2$"],
  ["Block math", "$$ … $$"],
  ["Escape a character", "\\*not italic\\*"],
] as const;

export const cheatsheetSections: readonly CheatsheetSection[] = [
  {
    id: "basics-heading",
    title: "Headings, emphasis, and paragraphs",
    description: "Start with the building blocks for readable Markdown documents. Leave a blank line between paragraphs.",
    examples: [
      { title: "Headings", syntax: "# Heading 1\n## Heading 2\n### Heading 3\n#### Heading 4" },
      { title: "Emphasis", syntax: "**Bold text**\n\n*Italic text*\n\n***Bold and italic***\n\n~~Strikethrough~~" },
      { title: "Blockquotes", syntax: "> Markdown keeps plain text readable.\n>\n> > Nest a quote with a second marker." },
      { title: "Line breaks and rules", syntax: "First line\\\nSecond line, same paragraph\n\n---\n\nA new section after a horizontal rule." },
    ],
  },
  {
    id: "links-heading",
    title: "Links and images",
    description: "Square brackets hold the visible text; parentheses hold the URL. Images use the same pattern with a leading exclamation mark.",
    examples: [
      { title: "Inline, reference, and auto links", syntax: "[Markdown Lens](https://markdownlens.ayushdev.com)\n\nRead the [spec][gfm].\n\nhttps://github.com is linked automatically.\n\n[gfm]: https://github.github.com/gfm/" },
      { title: "Images", syntax: "![Markdown Lens icon](https://markdownlens.ayushdev.com/icon-192.png)\n\n![Alt text describes the image](image.png \"Optional title\")" },
    ],
  },
  {
    id: "lists-heading",
    title: "Lists and task lists",
    description: "Indent by two or more spaces to nest. Square brackets after a list marker create a checklist.",
    examples: [
      { title: "Ordered and unordered lists", syntax: "- First item\n- Second item\n  - Nested item\n\n1. Plan\n2. Write\n3. Review" },
      { title: "Task lists", syntax: "- [x] Draft the README\n- [ ] Add examples\n- [ ] Request review" },
    ],
  },
  {
    id: "tables-heading",
    title: "Tables",
    description: "Separate the header with dashes and columns with vertical bars. Colons in the divider row set alignment.",
    examples: [
      { title: "Table with column alignment", syntax: "| Left | Center | Right |\n| :--- | :---: | ---: |\n| Tables | Ready | 1 |\n| Mermaid | Ready | 2 |\n| Math | Ready | 3 |" },
    ],
  },
  {
    id: "code-heading",
    title: "Code",
    description: "Use single backticks for inline code and triple backticks for fenced blocks. Add a language name for syntax highlighting.",
    examples: [
      { title: "Inline code", syntax: "Run `npm run dev` to start the app." },
      { title: "Fenced code block", syntax: '```ts\nconst greeting = "Hello, Markdown!";\nconsole.log(greeting);\n```' },
    ],
  },
  {
    id: "more-heading",
    title: "Footnotes and escaping",
    description: "Footnotes collect references at the end of the document. A backslash prints a Markdown symbol literally.",
    examples: [
      { title: "Footnotes", syntax: "Markdown was created in 2004.[^1]\n\n[^1]: By John Gruber, with Aaron Swartz." },
      { title: "Escaping characters", syntax: "\\*Not italic\\* and \\# not a heading.\n\nUse \\\\ for a literal backslash." },
    ],
  },
  {
    id: "math-heading",
    title: "Math and LaTeX",
    description: "Markdown Lens renders KaTeX-compatible math. Use single dollar signs inline and double dollar signs for display equations.",
    examples: [
      { title: "Inline and block math", syntax: "Inline: $E = mc^2$\n\nBlock:\n$$\n\\int_0^1 x^2\\,dx = \\frac{1}{3}\n$$" },
      { title: "Fractions, sums, and Greek letters", syntax: "$$\n\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\n$$\n\n$\\alpha + \\beta \\le \\sqrt{x_1^2 + x_2^2}$" },
      { title: "Matrices", syntax: "$$\nA = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}\n$$" },
      { title: "Aligned equations", syntax: "$$\n\\begin{aligned}\nf(x) &= (x + 1)^2 \\\\\n     &= x^2 + 2x + 1\n\\end{aligned}\n$$" },
    ],
  },
  {
    id: "mermaid-heading",
    title: "Mermaid diagrams",
    description: "A fenced block with the mermaid language becomes a diagram in Markdown Lens and on GitHub.",
    examples: [
      { title: "Flowchart", syntax: "```mermaid\nflowchart LR\n  A[Write] --> B[Preview]\n  B --> C[Publish]\n```" },
      { title: "Sequence diagram", syntax: "```mermaid\nsequenceDiagram\n  Writer->>Editor: Type Markdown\n  Editor-->>Writer: Live preview\n```" },
    ],
  },
];

export const cheatsheetFaq = [
  {
    question: "What is a Markdown cheat sheet?",
    answer:
      "A Markdown cheat sheet is a one-page reference of Markdown syntax: the characters you type for headings, emphasis, lists, links, images, code, and tables. This page shows each pattern next to its rendered GitHub-style output so you can copy what you need.",
  },
  {
    question: "Which Markdown flavor does this cheat sheet use?",
    answer:
      "GitHub-flavored Markdown (GFM). It covers the CommonMark basics plus GFM tables, task lists, strikethrough, autolinks, and footnotes. Math and Mermaid examples work in Markdown Lens and on GitHub, but not in every Markdown renderer.",
  },
  {
    question: "How do I make a line break in Markdown?",
    answer:
      "End the line with a backslash or two trailing spaces, then continue on the next line. A blank line between lines starts a new paragraph instead.",
  },
  {
    question: "How do I align columns in a Markdown table?",
    answer:
      "Add colons to the divider row: :--- aligns left, :---: centers, and ---: aligns right.",
  },
  {
    question: "How do I write math or LaTeX in Markdown?",
    answer:
      "Wrap inline math in single dollar signs, like $a^2 + b^2 = c^2$, and put block equations between lines containing only $$. Markdown Lens renders both with KaTeX, which supports most common LaTeX math commands.",
  },
  {
    question: "How do I show a literal asterisk, underscore, or pound sign?",
    answer:
      "Put a backslash in front of it, for example \\* or \\#. Markdown then prints the character instead of treating it as formatting.",
  },
] as const;
