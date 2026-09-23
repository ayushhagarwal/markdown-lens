import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Eye } from "lucide-react";
import { ExampleCard } from "@/components/guide/example-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Markdown Cheatsheet – Common Markdown Syntax | Markdown Lens",
  description:
    "Learn common Markdown syntax for headings, lists, tables, links, code blocks, Mermaid diagrams, and math with simple examples.",
  path: "/markdown-cheatsheet",
  type: "article",
  absoluteTitle: true,
});

const inlineExamples = [
  { title: "Headings", syntax: "# Heading 1\n## Heading 2\n### Heading 3" },
  { title: "Emphasis", syntax: "**Bold text**\n*Italic text*\n~~Strikethrough~~" },
  {
    title: "Links and images",
    syntax: "[Markdown Lens](https://markdownlens.ayushdev.com)\n\n![Alt text](https://example.com/image.png)",
  },
  {
    title: "Blockquotes",
    syntax: "> Markdown keeps plain text readable.\n>\n> Add another line with the same marker.",
  },
];

export default function MarkdownCheatsheetPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: "Markdown Cheatsheet – Common Markdown Syntax",
      description:
        "A concise Markdown reference for headings, lists, tables, links, code, Mermaid diagrams, and math.",
      url: `${siteConfig.url}/markdown-cheatsheet`,
      mainEntityOfPage: `${siteConfig.url}/markdown-cheatsheet`,
      dateModified: siteConfig.dateModified,
      inLanguage: "en",
      author: {
        "@type": "Person",
        name: siteConfig.author.name,
        url: siteConfig.author.url,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Markdown Lens",
          item: siteConfig.url,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Markdown Cheatsheet",
          item: `${siteConfig.url}/markdown-cheatsheet`,
        },
      ],
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
            Markdown cheatsheet
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            The syntax you will use most often. Each preview uses the same renderer as the editor.
          </p>
        </section>

        <section aria-labelledby="basics-heading">
          <SectionHeading
            id="basics-heading"
            title="Text and document structure"
            description="Start with the building blocks for readable Markdown documents."
          />
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {inlineExamples.map((example) => (
              <ExampleCard key={example.title} {...example} />
            ))}
          </div>
        </section>

        <section className="mt-14" aria-labelledby="lists-heading">
          <SectionHeading
            id="lists-heading"
            title="Lists and tasks"
            description="Use indentation to create hierarchy and square brackets to track work."
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
            description="Separate headers with dashes and columns with vertical bars."
          />
          <ExampleCard
            className="mt-6"
            title="Feature table"
            syntax={"| Feature | Status |\n| --- | ---: |\n| Tables | Ready |\n| Mermaid | Ready |\n| Math | Ready |"}
          />
        </section>

        <section className="mt-14" aria-labelledby="code-heading">
          <SectionHeading
            id="code-heading"
            title="Code"
            description="Use backticks for inline code and triple backticks for fenced blocks."
          />
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <ExampleCard title="Inline code" syntax={"Run `npm run dev` to start the app."} />
            <ExampleCard
              title="Fenced code block"
              syntax={'```ts\nconst greeting = "Hello, Markdown!";\nconsole.log(greeting);\n```'}
            />
          </div>
        </section>

        <section className="mt-14" aria-labelledby="extended-heading">
          <SectionHeading
            id="extended-heading"
            title="Mermaid diagrams and math"
            description="Markdown Lens recognizes Mermaid fences and KaTeX-compatible math delimiters."
          />
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <ExampleCard
              title="Mermaid diagram"
              syntax={"```mermaid\nflowchart LR\n  A[Write] --> B[Preview]\n  B --> C[Publish]\n```"}
            />
            <ExampleCard
              title="Inline and block math"
              syntax={"Inline: $E = mc^2$\n\nBlock:\n$$\n\\int_0^1 x^2\\,dx = \\frac{1}{3}\n$$"}
            />
          </div>
        </section>

        <section className="my-14 rounded-xl border border-accent/25 bg-accent-soft/70 px-5 py-8 text-center sm:px-8">
          <Eye className="mx-auto h-6 w-6 text-accent" aria-hidden />
          <h2 className="mt-3 text-2xl font-bold">Ready to try it?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Open an example above to edit it, or start from a file.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/editor"
              className="btn-primary h-10"
            >
              Open the Markdown editor
            </Link>
            <Link
              href="/pdf-to-markdown"
              className="btn-secondary h-10"
            >
              PDF to Markdown
            </Link>
            <Link
              href="/word-to-markdown"
              className="btn-secondary h-10"
            >
              Word to Markdown
            </Link>
          </div>
        </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
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
      <h2 id={id} className="text-2xl font-bold tracking-tight sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">{description}</p>
    </div>
  );
}

