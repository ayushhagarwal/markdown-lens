import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, Check, Eye } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";
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
  {
    title: "Headings",
    syntax: "# Heading 1\n## Heading 2\n### Heading 3",
    output: (
      <div className="space-y-2">
        <p className="text-2xl font-bold">Heading 1</p>
        <p className="text-xl font-bold">Heading 2</p>
        <p className="text-lg font-bold">Heading 3</p>
      </div>
    ),
  },
  {
    title: "Emphasis",
    syntax: "**Bold text**\n*Italic text*\n~~Strikethrough~~",
    output: (
      <div className="space-y-1">
        <p className="font-bold">Bold text</p>
        <p className="italic">Italic text</p>
        <p className="line-through">Strikethrough</p>
      </div>
    ),
  },
  {
    title: "Links and images",
    syntax:
      "[Markdown Lens](https://markdownlens.ayushdev.com)\n\n![Alt text](https://example.com/image.png)",
    output: (
      <div className="space-y-3">
        <a className="font-semibold text-emerald-700 underline underline-offset-4 dark:text-accent" href={siteConfig.url}>
          Markdown Lens
        </a>
        <div className="rounded-md border border-dashed border-border bg-muted/50 px-3 py-4 text-sm text-muted-foreground">
          Image renders here, with “Alt text” as its accessible description.
        </div>
      </div>
    ),
  },
  {
    title: "Blockquotes",
    syntax: "> Markdown keeps plain text readable.\n>\n> Add another line with the same marker.",
    output: (
      <blockquote className="rounded-r-md border-l-4 border-accent bg-accent-soft/60 px-4 py-3">
        Markdown keeps plain text readable.
        <br />
        Add another line with the same marker.
      </blockquote>
    ),
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
    <main className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-border/80 pb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to Markdown Lens
          </Link>
          <ThemeToggle />
        </header>

        <section className="py-12 text-center sm:py-16">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-accent/25 bg-accent-soft text-accent">
            <BookOpen className="h-7 w-7" aria-hidden />
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-accent">
            Quick reference
          </p>
          <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">
            Markdown cheatsheet
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            The syntax you will use most often, paired with clear rendered examples. Copy a
            snippet, adapt it, and preview it in Markdown Lens.
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
              output={
                <div className="grid gap-4 sm:grid-cols-2">
                  <ul className="list-disc space-y-1 pl-5">
                    <li>First item</li>
                    <li>
                      Second item
                      <ul className="list-disc pl-5 text-muted-foreground">
                        <li>Nested item</li>
                      </ul>
                    </li>
                  </ul>
                  <ol className="list-decimal space-y-1 pl-5">
                    <li>Plan</li>
                    <li>Write</li>
                    <li>Review</li>
                  </ol>
                </div>
              }
            />
            <ExampleCard
              title="Task lists"
              syntax={"- [x] Draft the README\n- [ ] Add examples\n- [ ] Request review"}
              output={
                <ul className="space-y-2">
                  {[
                    [true, "Draft the README"],
                    [false, "Add examples"],
                    [false, "Request review"],
                  ].map(([done, label]) => (
                    <li key={String(label)} className="flex items-center gap-2">
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          done ? "border-accent bg-accent text-accent-foreground" : "border-border"
                        }`}
                        aria-hidden
                      >
                        {done ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              }
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
            syntax={
              "| Feature | Status |\n| --- | ---: |\n| Tables | Ready |\n| Mermaid | Ready |\n| Math | Ready |"
            }
            output={
              <div className="overflow-x-auto">
                <table className="w-full min-w-80 border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-muted/70">
                      <th className="border border-border px-3 py-2">Feature</th>
                      <th className="border border-border px-3 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {["Tables", "Mermaid", "Math"].map((feature) => (
                      <tr key={feature}>
                        <td className="border border-border px-3 py-2">{feature}</td>
                        <td className="border border-border px-3 py-2 text-right">Ready</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          />
        </section>

        <section className="mt-14" aria-labelledby="code-heading">
          <SectionHeading
            id="code-heading"
            title="Code"
            description="Use backticks for inline code and triple backticks for fenced blocks."
          />
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <ExampleCard
              title="Inline code"
              syntax={"Run `npm run dev` to start the app."}
              output={
                <p>
                  Run{" "}
                  <code className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-sm">
                    npm run dev
                  </code>{" "}
                  to start the app.
                </p>
              }
            />
            <ExampleCard
              title="Fenced code block"
              syntax={'```ts\nconst greeting = "Hello, Markdown!";\nconsole.log(greeting);\n```'}
              output={
                <pre
                  tabIndex={0}
                  className="overflow-x-auto rounded-md border border-slate-700 bg-[#0d1117] p-4 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <code>{'const greeting = "Hello, Markdown!";\nconsole.log(greeting);'}</code>
                </pre>
              }
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
              output={
                <div className="flex flex-wrap items-center justify-center gap-2 py-3 text-sm font-semibold">
                  {["Write", "Preview", "Publish"].map((step, index) => (
                    <div key={step} className="flex items-center gap-2">
                      <span className="rounded-md border border-accent/30 bg-accent-soft px-3 py-2">
                        {step}
                      </span>
                      {index < 2 ? <span className="text-accent">→</span> : null}
                    </div>
                  ))}
                </div>
              }
            />
            <ExampleCard
              title="Inline and block math"
              syntax={"Inline: $E = mc^2$\n\nBlock:\n$$\n\\int_0^1 x^2\\,dx = \\frac{1}{3}\n$$"}
              output={
                <div className="space-y-5 text-center">
                  <p>
                    Inline: <span className="font-serif italic">E = mc²</span>
                  </p>
                  <p className="text-xl font-serif">∫₀¹ x² dx = ⅓</p>
                </div>
              }
            />
          </div>
        </section>

        <section className="my-14 rounded-xl border border-accent/25 bg-accent-soft/70 px-5 py-8 text-center sm:px-8">
          <Eye className="mx-auto h-6 w-6 text-accent" aria-hidden />
          <h2 className="mt-3 text-2xl font-bold">Ready to try it?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Paste any example into the editor to see GitHub-flavored Markdown, Mermaid, code
            highlighting, and math render together.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/editor"
              className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-accent-soft"
            >
              Open the Markdown editor
            </Link>
            <Link
              href="/pdf-to-markdown"
              className="inline-flex h-10 items-center justify-center rounded-md border border-border px-5 text-sm font-semibold transition hover:bg-muted"
            >
              PDF to Markdown
            </Link>
            <Link
              href="/word-to-markdown"
              className="inline-flex h-10 items-center justify-center rounded-md border border-border px-5 text-sm font-semibold transition hover:bg-muted"
            >
              Word to Markdown
            </Link>
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
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

function ExampleCard({
  title,
  syntax,
  output,
  className = "",
}: {
  title: string;
  syntax: string;
  output: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`overflow-hidden rounded-xl border border-border/80 bg-panel shadow-panel ${className}`}
    >
      <h3 className="border-b border-border/80 bg-surface px-5 py-3 text-sm font-semibold">
        {title}
      </h3>
      <div className="grid lg:grid-cols-2">
        <div className="min-w-0 border-b border-border/80 p-5 lg:border-b-0 lg:border-r">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Markdown
          </p>
          <pre
            tabIndex={0}
            className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-slate-700 bg-[#0d1117] p-4 font-mono text-sm leading-6 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <code>{syntax}</code>
          </pre>
        </div>
        <div className="min-w-0 p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Rendered
          </p>
          <div className="text-sm leading-7">{output}</div>
        </div>
      </div>
    </article>
  );
}
