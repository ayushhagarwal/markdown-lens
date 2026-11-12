import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Eye } from "lucide-react";
import { ExampleCard } from "@/components/guide/example-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { pageMetadata } from "@/lib/seo";
import { cheatsheetFaq, cheatsheetQuickReference, cheatsheetSections } from "@/lib/cheatsheet";
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
      mainEntity: cheatsheetFaq.map((item) => ({
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
              <caption className="sr-only">Markdown syntax quick reference: element and the syntax that creates it</caption>
              <thead className="bg-surface">
                <tr>
                  <th scope="col" className="border-b border-border px-4 py-3 font-semibold">Element</th>
                  <th scope="col" className="border-b border-border px-4 py-3 font-semibold">Markdown syntax</th>
                </tr>
              </thead>
              <tbody>
                {cheatsheetQuickReference.map(([element, syntax]) => (
                  <tr key={element} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{element}</td>
                    <td className="px-4 py-3"><code className="font-mono text-xs">{syntax}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {cheatsheetSections.map((section) => (
          <section key={section.id} className="mt-14" aria-labelledby={section.id}>
            <SectionHeading id={section.id} title={section.title} description={section.description} />
            <div className={`mt-6 grid gap-5 ${section.examples.length > 1 ? "md:grid-cols-2" : ""}`}>
              {section.examples.map((example) => (
                <ExampleCard key={example.title} title={example.title} syntax={example.syntax} />
              ))}
            </div>
            {section.id === "tables-heading" ? (
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Have the data in a spreadsheet already? The{" "}
                <Link href="/csv-to-markdown" className="text-accent underline-offset-4 hover:underline">CSV to Markdown table converter</Link>{" "}
                and{" "}
                <Link href="/excel-to-markdown" className="text-accent underline-offset-4 hover:underline">Excel to Markdown converter</Link>{" "}
                build the table for you.
              </p>
            ) : null}
          </section>
        ))}

        <section className="mt-14" aria-labelledby="faq-heading">
          <SectionHeading
            id="faq-heading"
            title="Markdown syntax questions"
            description="Short answers to the questions people ask most when writing Markdown."
          />
          <div className="mt-6 divide-y divide-border border-y border-border">
            {cheatsheetFaq.map((item) => (
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
