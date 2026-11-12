import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Eye } from "lucide-react";
import { ExampleCard } from "@/components/guide/example-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { pageMetadata } from "@/lib/seo";
import { modifiedFor, siteConfig } from "@/lib/site";

const path = "/markdown-cheatsheet";
const published = "2026-06-20";
const modified = modifiedFor(path);

export const metadata: Metadata = pageMetadata({
  title: "Markdown Cheat Sheet: Syntax with Examples | Markdown Lens",
  description:
    "A Markdown cheat sheet with copyable examples for headings, lists, tables, links, code, footnotes, math (LaTeX), and Mermaid, each with a live preview.",
  path,
  type: "article",
  absoluteTitle: true,
});

const quickReference = [
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
  ["Table", "| A | B |\\n| --- | --- |"],
  ["Horizontal rule", "---"],
  ["Footnote", "text[^1]  [^1]: note"],
  ["Inline math", "$E = mc^2$"],
  ["Block math", "$$ … $$"],
  ["Escape a character", "\\*not italic\\*"],
] as const;

const faq = [
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

export default function MarkdownCheatsheetPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: "Markdown Cheat Sheet: Syntax with Examples",
      description:
        "A Markdown reference for headings, lists, tables, links, code, footnotes, math, and Mermaid diagrams, with rendered examples.",
      url: `${siteConfig.url}${path}`,
      mainEntityOfPage: `${siteConfig.url}${path}`,
      datePublished: published,
      dateModified: modified,
      image: `${siteConfig.url}${path}/opengraph-image`,
      inLanguage: "en",
      author: {
        "@type": "Person",
        "@id": siteConfig.author.id,
        name: siteConfig.author.name,
        url: siteConfig.author.url,
      },
      publisher: { "@id": siteConfig.author.id },
      about: { "@id": `${siteConfig.url}/#software` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: siteConfig.name, item: siteConfig.url },
        { "@type": "ListItem", position: 2, name: "Markdown Cheat Sheet", item: `${siteConfig.url}${path}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <SiteHeader />
      <main id="main">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <section className="py-12 text-center sm:py-16">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-accent/25 bg-accent-soft text-accent">
            <BookOpen className="h-7 w-7" aria-hidden />
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-accent">
            Quick reference
          </p>
          <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
            Markdown cheat sheet
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Markdown formats plain text with a few symbols: <code>#</code> for headings, <code>**</code> for bold,{" "}
            <code>-</code> for lists, <code>[text](url)</code> for links, and backticks for code. Every example below
            shows the syntax next to the GitHub-style result, rendered by the same engine as the editor.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            By {siteConfig.author.name} · Published <time dateTime={published}>June 20, 2026</time> · Updated{" "}
            <time dateTime={modified}>{formatDate(modified)}</time>
          </p>
          <nav aria-label="On this page" className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            {[
              ["#quick-reference", "Quick reference"],
              ["#basics-heading", "Text"],
              ["#links-heading", "Links and images"],
              ["#lists-heading", "Lists"],
              ["#tables-heading", "Tables"],
              ["#code-heading", "Code"],
              ["#more-heading", "Footnotes and more"],
              ["#math-heading", "Math"],
              ["#mermaid-heading", "Mermaid"],
              ["#faq-heading", "FAQ"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-sm text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {label}
              </a>
            ))}
          </nav>
        </section>

        <section id="quick-reference" aria-labelledby="quick-reference-heading" className="scroll-mt-20">
          <SectionHeading
            id="quick-reference-heading"
            title="Markdown syntax quick reference"
            description="The most common Markdown elements on one screen. Scroll down for rendered examples of each."
          />
          <div className="mt-6 overflow-x-auto rounded-xl border border-border/80">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead className="bg-surface">
                <tr>
                  <th scope="col" className="border-b border-border px-4 py-3 font-semibold">Element</th>
                  <th scope="col" className="border-b border-border px-4 py-3 font-semibold">Markdown syntax</th>
                </tr>
              </thead>
              <tbody>
                {quickReference.map(([element, syntax]) => (
                  <tr key={element} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{element}</td>
                    <td className="px-4 py-3 font-mono text-xs">{syntax}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-14" aria-labelledby="basics-heading">
          <SectionHeading
            id="basics-heading"
            title="Headings, emphasis, and paragraphs"
            description="Start with the building blocks for readable Markdown documents. Leave a blank line between paragraphs."
          />
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <ExampleCard title="Headings" syntax={"# Heading 1\n## Heading 2\n### Heading 3\n#### Heading 4"} />
            <ExampleCard title="Emphasis" syntax={"**Bold text**\n\n*Italic text*\n\n***Bold and italic***\n\n~~Strikethrough~~"} />
            <ExampleCard
              title="Blockquotes"
              syntax={"> Markdown keeps plain text readable.\n>\n> > Nest a quote with a second marker."}
            />
            <ExampleCard title="Line breaks and rules" syntax={"First line\\\nSecond line, same paragraph\n\n---\n\nA new section after a horizontal rule."} />
          </div>
        </section>

        <section className="mt-14" aria-labelledby="links-heading">
          <SectionHeading
            id="links-heading"
            title="Links and images"
            description="Square brackets hold the visible text; parentheses hold the URL. Images use the same pattern with a leading exclamation mark."
          />
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <ExampleCard
              title="Inline, reference, and auto links"
              syntax={"[Markdown Lens](https://markdownlens.ayushdev.com)\n\nRead the [spec][gfm].\n\nhttps://github.com is linked automatically.\n\n[gfm]: https://github.github.com/gfm/"}
            />
            <ExampleCard
              title="Images"
              syntax={"![Markdown Lens icon](https://markdownlens.ayushdev.com/icon-192.png)\n\n![Alt text describes the image](image.png \"Optional title\")"}
            />
          </div>
        </section>

        <section className="mt-14" aria-labelledby="lists-heading">
          <SectionHeading
            id="lists-heading"
            title="Lists and task lists"
            description="Indent by two or more spaces to nest. Square brackets after a list marker create a checklist."
          />
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <ExampleCard
              title="Ordered and unordered lists"
              syntax={"- First item\n- Second item\n  - Nested item\n\n1. Plan\n2. Write\n3. Review"}
            />
            <ExampleCard
              title="Task lists"
              syntax={"- [x] Draft the README\n- [ ] Add examples\n- [ ] Request review"}
            />
          </div>
        </section>

        <section className="mt-14" aria-labelledby="tables-heading">
          <SectionHeading
            id="tables-heading"
            title="Tables"
            description="Separate the header with dashes and columns with vertical bars. Colons in the divider row set alignment."
          />
          <div className="mt-6 grid gap-5">
            <ExampleCard
              title="Table with column alignment"
              syntax={"| Left | Center | Right |\n| :--- | :---: | ---: |\n| Tables | Ready | 1 |\n| Mermaid | Ready | 2 |\n| Math | Ready | 3 |"}
            />
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Have the data in a spreadsheet already? The{" "}
            <Link href="/csv-to-markdown" className="text-accent underline-offset-4 hover:underline">CSV to Markdown table converter</Link>{" "}
            and{" "}
            <Link href="/excel-to-markdown" className="text-accent underline-offset-4 hover:underline">Excel to Markdown converter</Link>{" "}
            build the table for you.
          </p>
        </section>

        <section className="mt-14" aria-labelledby="code-heading">
          <SectionHeading
            id="code-heading"
            title="Code"
            description="Use single backticks for inline code and triple backticks for fenced blocks. Add a language name for syntax highlighting."
          />
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <ExampleCard title="Inline code" syntax={"Run `npm run dev` to start the app."} />
            <ExampleCard
              title="Fenced code block"
              syntax={'```ts\nconst greeting = "Hello, Markdown!";\nconsole.log(greeting);\n```'}
            />
          </div>
        </section>

        <section className="mt-14" aria-labelledby="more-heading">
          <SectionHeading
            id="more-heading"
            title="Footnotes and escaping"
            description="Footnotes collect references at the end of the document. A backslash prints a Markdown symbol literally."
          />
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <ExampleCard title="Footnotes" syntax={"Markdown was created in 2004.[^1]\n\n[^1]: By John Gruber, with Aaron Swartz."} />
            <ExampleCard title="Escaping characters" syntax={"\\*Not italic\\* and \\# not a heading.\n\nUse \\\\ for a literal backslash."} />
          </div>
        </section>

        <section className="mt-14" aria-labelledby="math-heading">
          <SectionHeading
            id="math-heading"
            title="Math and LaTeX"
            description="Markdown Lens renders KaTeX-compatible math. Use single dollar signs inline and double dollar signs for display equations."
          />
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <ExampleCard
              title="Inline and block math"
              syntax={"Inline: $E = mc^2$\n\nBlock:\n$$\n\\int_0^1 x^2\\,dx = \\frac{1}{3}\n$$"}
            />
            <ExampleCard
              title="Fractions, sums, and Greek letters"
              syntax={"$$\n\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\n$$\n\n$\\alpha + \\beta \\le \\sqrt{x_1^2 + x_2^2}$"}
            />
            <ExampleCard
              title="Matrices"
              syntax={"$$\nA = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}\n$$"}
            />
            <ExampleCard
              title="Aligned equations"
              syntax={"$$\n\\begin{aligned}\nf(x) &= (x + 1)^2 \\\\\n     &= x^2 + 2x + 1\n\\end{aligned}\n$$"}
            />
          </div>
        </section>

        <section className="mt-14" aria-labelledby="mermaid-heading">
          <SectionHeading
            id="mermaid-heading"
            title="Mermaid diagrams"
            description="A fenced block with the mermaid language becomes a diagram in Markdown Lens and on GitHub."
          />
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <ExampleCard
              title="Flowchart"
              syntax={"```mermaid\nflowchart LR\n  A[Write] --> B[Preview]\n  B --> C[Publish]\n```"}
            />
            <ExampleCard
              title="Sequence diagram"
              syntax={"```mermaid\nsequenceDiagram\n  Writer->>Editor: Type Markdown\n  Editor-->>Writer: Live preview\n```"}
            />
          </div>
        </section>

        <section className="mt-14" aria-labelledby="faq-heading">
          <SectionHeading
            id="faq-heading"
            title="Markdown syntax questions"
            description="Short answers to the questions people ask most when writing Markdown."
          />
          <div className="mt-6 divide-y divide-border border-y border-border">
            {faq.map((item) => (
              <div key={item.question} className="py-5">
                <h3 className="font-semibold">{item.question}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="my-14 rounded-xl border border-accent/25 bg-accent-soft/70 px-5 py-8 text-center sm:px-8">
          <Eye className="mx-auto h-6 w-6 text-accent" aria-hidden />
          <h2 className="mt-3 text-2xl font-bold">Try the syntax in the editor</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Open any example above to edit it, or convert an existing document into Markdown.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link href="/editor" className="btn-primary h-10">
              Open the Markdown editor
            </Link>
            <Link href="/pdf-to-markdown" className="btn-secondary h-10">
              PDF to Markdown
            </Link>
            <Link href="/word-to-markdown" className="btn-secondary h-10">
              Word to Markdown
            </Link>
            <Link href="/pptx-to-markdown" className="btn-secondary h-10">
              PowerPoint to Markdown
            </Link>
          </div>
        </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 id={id} className="scroll-mt-20 text-2xl font-bold tracking-tight sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">{description}</p>
    </div>
  );
}
