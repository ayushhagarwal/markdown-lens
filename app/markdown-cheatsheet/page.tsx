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
        <div className="relative isolate">
          <div className="backdrop-grid" aria-hidden />
          <div className="backdrop-glow" aria-hidden />
          <section className="relative z-10 mx-auto w-full max-w-4xl px-4 pb-10 pt-16 text-center sm:px-6 sm:pb-14 sm:pt-24 lg:px-8">
            <span className="rise-in mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-panel text-accent shadow-soft">
              <BookOpen className="h-6 w-6" aria-hidden />
            </span>
            <p className="eyebrow rise-in mt-6" style={{ "--i": 1 } as React.CSSProperties}>
              Quick reference
            </p>
            <h1 className="display mx-auto mt-4 max-w-3xl text-4xl sm:text-5xl lg:text-6xl">
              Markdown cheat sheet
            </h1>
            <p className="rise-in mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8 [&_code]:rounded-md [&_code]:border [&_code]:border-border [&_code]:bg-panel [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-foreground" style={{ "--i": 2 } as React.CSSProperties}>
              Markdown formats plain text with a few symbols: <code>#</code> for headings, <code>**</code> for bold,{" "}
              <code>-</code> for lists, <code>[text](url)</code> for links, and backticks for code. Every example below
              shows the syntax next to the GitHub-style result, rendered by the same engine as the editor.
            </p>
            <p className="rise-in mt-4 font-mono text-xs text-muted-foreground" style={{ "--i": 3 } as React.CSSProperties}>
              By {siteConfig.author.name} · Published <time dateTime={published}>June 20, 2026</time> · Updated{" "}
              <time dateTime={modified}>{formatDate(modified)}</time>
            </p>
          </section>
        </div>

        <nav aria-label="On this page" className="sticky top-16 z-20 border-y border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="mx-auto flex w-full max-w-7xl gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:px-6 lg:flex-wrap lg:justify-center lg:overflow-visible lg:px-8 [&::-webkit-scrollbar]:hidden">
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
              <a key={href} href={href} className="chip shrink-0 whitespace-nowrap transition-colors hover:border-foreground/25 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                {label}
              </a>
            ))}
          </div>
        </nav>

        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <section id="quick-reference" aria-labelledby="quick-reference-heading" className="scroll-mt-24 pt-14 sm:pt-20">
          <SectionHeading
            id="quick-reference-heading"
            title="Markdown syntax quick reference"
            description="The most common Markdown elements on one screen. Scroll down for rendered examples of each."
          />
          <div role="region" aria-label="Markdown syntax quick reference table" tabIndex={0} className="card mt-8 overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <caption className="sr-only">Markdown syntax quick reference: element and the syntax that creates it</caption>
              <thead className="bg-surface">
                <tr>
                  <th scope="col" className="border-b border-border px-5 py-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Element</th>
                  <th scope="col" className="border-b border-border px-5 py-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Markdown syntax</th>
                </tr>
              </thead>
              <tbody>
                {cheatsheetQuickReference.map(([element, syntax]) => (
                  <tr key={element} className="border-b border-border transition-colors last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-3 font-medium">{element}</td>
                    <td className="px-5 py-3"><code className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-foreground">{syntax}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {cheatsheetSections.map((section) => (
          <section key={section.id} className="defer-paint mt-20 sm:mt-24" aria-labelledby={section.id}>
            <SectionHeading id={section.id} title={section.title} description={section.description} />
            <div className={`mt-8 grid gap-5 ${section.examples.length > 1 ? "md:grid-cols-2" : ""}`}>
              {section.examples.map((example) => (
                <ExampleCard key={example.title} title={example.title} syntax={example.syntax} />
              ))}
            </div>
            {section.id === "tables-heading" ? (
              <p className="mt-5 text-sm leading-6 text-muted-foreground">
                Have the data in a spreadsheet already? The{" "}
                <Link href="/csv-to-markdown" className="link-underline">CSV to Markdown table converter</Link>{" "}
                and{" "}
                <Link href="/excel-to-markdown" className="link-underline">Excel to Markdown converter</Link>{" "}
                build the table for you.
              </p>
            ) : null}
          </section>
        ))}

        <section className="defer-paint mt-20 sm:mt-24" aria-labelledby="faq-heading">
          <SectionHeading
            id="faq-heading"
            title="Markdown syntax questions"
            description="Short answers to the questions people ask most when writing Markdown."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {cheatsheetFaq.map((item) => (
              <div key={item.question} className="card reveal p-6">
                <h3 className="font-semibold tracking-tight">{item.question}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="defer-paint relative isolate my-20 overflow-hidden rounded-3xl border border-border bg-panel px-5 py-14 text-center shadow-lift sm:my-24 sm:px-10 sm:py-16">
          <div className="backdrop-grid" aria-hidden />
          <div className="pointer-events-none absolute -bottom-40 left-1/2 -z-0 h-80 w-[min(40rem,120%)] -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" aria-hidden />
          <div className="relative z-10">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Eye className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="heading mt-5 text-3xl sm:text-4xl">Try the syntax in the editor</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              Open any example above to edit it, or convert an existing document into Markdown.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link href="/editor" className="btn-primary h-11">
                Open the Markdown editor
              </Link>
              <Link href="/pdf-to-markdown" className="btn-secondary h-11">
                PDF to Markdown
              </Link>
              <Link href="/word-to-markdown" className="btn-secondary h-11">
                Word to Markdown
              </Link>
              <Link href="/pptx-to-markdown" className="btn-secondary h-11">
                PowerPoint to Markdown
              </Link>
            </div>
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
    <div className="reveal max-w-2xl">
      <h2 id={id} className="heading scroll-mt-24 text-3xl sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 leading-7 text-muted-foreground">{description}</p>
    </div>
  );
}
