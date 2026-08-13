import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileDown,
  FileText,
  FileUp,
  LockKeyhole,
  PencilLine,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/lib/site";

export type ConversionLandingPageConfig = {
  path: string;
  eyebrow: string;
  title: string;
  summary: string;
  supportingSummary: string;
  cta: string;
  sourceLabel: string;
  sourceFileName: string;
  sourceLines: readonly string[];
  markdownLines: readonly string[];
  highlights: readonly string[];
  steps: readonly {
    title: string;
    description: string;
  }[];
  outputHeading: string;
  outputIntro: string;
  outputItems: readonly {
    title: string;
    description: string;
  }[];
  limitsHeading: string;
  limitsIntro: string;
  limitations: readonly string[];
  useCases: readonly {
    title: string;
    description: string;
  }[];
  faq: readonly {
    question: string;
    answer: string;
  }[];
  related: readonly {
    href: string;
    title: string;
    description: string;
  }[];
};

export function ConversionLandingPage({ config }: { config: ConversionLandingPageConfig }) {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${siteConfig.url}${config.path}/#webpage`,
      url: `${siteConfig.url}${config.path}`,
      name: config.title,
      description: config.summary,
      isPartOf: {
        "@id": `${siteConfig.url}/#website`,
      },
      about: {
        "@id": `${siteConfig.url}/#software`,
      },
      inLanguage: "en",
      dateModified: siteConfig.dateModified,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: siteConfig.name,
          item: siteConfig.url,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: config.title,
          item: `${siteConfig.url}${config.path}`,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: config.faq.map((item) => ({
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
      <main>
        <section className="mx-auto grid w-full max-w-7xl gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
              <LockKeyhole className="h-3.5 w-3.5" aria-hidden />
              {config.eyebrow}
            </p>
            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.05em] sm:text-5xl lg:text-[4rem] lg:leading-[1.03]">
              {config.title}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              {config.summary}
            </p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              {config.supportingSummary}
            </p>
            <ul className="mt-6 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {config.highlights.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/editor"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-foreground px-5 text-sm font-semibold text-background transition hover:bg-foreground/88 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
              >
                {config.cta}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-panel px-5 text-sm font-semibold shadow-sm transition hover:border-ring hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
              >
                See how it works
              </a>
            </div>
          </div>

          <ConversionPreview config={config} />
        </section>

        <section className="border-y border-border/75 bg-surface" aria-label="Conversion facts">
          <div className="mx-auto grid w-full max-w-7xl px-4 sm:px-6 md:grid-cols-3 lg:px-8">
            {[
              {
                icon: LockKeyhole,
                title: "Local by design",
                description: "Your document is read and converted in this browser, not uploaded.",
              },
              {
                icon: PencilLine,
                title: "Editable output",
                description: "Review the generated Markdown immediately in the built-in editor.",
              },
              {
                icon: FileDown,
                title: "Take it anywhere",
                description: "Copy Markdown, download .md, export HTML, or print the preview to PDF.",
              },
            ].map(({ icon: Icon, title, description }, index) => (
              <article
                key={title}
                className={`py-7 md:px-7 md:py-9 ${
                  index > 0 ? "border-t border-border/75 md:border-l md:border-t-0" : ""
                }`}
              >
                <Icon className="h-5 w-5 text-accent" aria-hidden />
                <h2 className="mt-4 text-base font-semibold">{title}</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="how-it-works"
          className="mx-auto w-full max-w-7xl scroll-mt-8 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
          aria-labelledby="how-heading"
        >
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
              Three simple steps
            </p>
            <h2 id="how-heading" className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              How it works
            </h2>
          </div>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {config.steps.map((step, index) => (
              <li key={step.title} className="rounded-xl border border-border bg-panel p-6 shadow-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-border/75 bg-surface">
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8">
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.035em]">{config.outputHeading}</h2>
              <p className="mt-4 max-w-xl leading-7 text-muted-foreground">{config.outputIntro}</p>
              <div className="mt-8 divide-y divide-border/75 border-y border-border/75">
                {config.outputItems.map((item) => (
                  <article key={item.title} className="py-5">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <aside className="self-start rounded-2xl border border-border bg-panel p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-semibold tracking-tight">{config.limitsHeading}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{config.limitsIntro}</p>
              <ul className="mt-6 space-y-4">
                {config.limitations.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-6">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="uses-heading">
          <h2 id="uses-heading" className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Useful for real documentation work
          </h2>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {config.useCases.map((item) => (
              <article key={item.title} className="rounded-xl border border-border bg-panel p-6">
                <FileText className="h-5 w-5 text-accent" aria-hidden />
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-border/75">
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
                Quick answers
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">Frequently asked questions</h2>
            </div>
            <div className="divide-y divide-border/75 border-y border-border/75">
              {config.faq.map(({ question, answer }) => (
                <details key={question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                    {question}
                    <span
                      className="text-xl font-light text-muted-foreground transition group-open:rotate-45"
                      aria-hidden
                    >
                      +
                    </span>
                  </summary>
                  <p className="max-w-2xl pt-3 text-sm leading-7 text-muted-foreground">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/75 bg-foreground text-background">
          <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-background/60">
                  Keep exploring
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">Related Markdown tools</h2>
              </div>
              <Link
                href="/editor"
                className="inline-flex h-11 items-center gap-2 self-start rounded-lg bg-background px-5 text-sm font-semibold text-foreground transition hover:bg-background/90 md:self-auto"
              >
                Open the editor
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {config.related.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-xl border border-background/15 bg-background/5 p-5 transition hover:border-background/30 hover:bg-background/10"
                >
                  <span className="flex items-center justify-between gap-3 font-semibold">
                    {item.title}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-background/65">
                    {item.description}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ConversionPreview({ config }: { config: ConversionLandingPageConfig }) {
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-accent/5 blur-2xl" aria-hidden />
      <div className="overflow-hidden rounded-2xl border border-border bg-panel shadow-[0_32px_90px_-46px_rgb(15_23_42_/_0.4)]">
        <div className="flex h-11 items-center justify-between border-b border-border bg-surface px-4">
          <div className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent/55" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">Local conversion</span>
        </div>
        <div className="grid min-h-[390px] md:grid-cols-2">
          <div className="border-b border-border bg-surface/55 p-5 md:border-b-0 md:border-r">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {config.sourceLabel}
            </p>
            <div className="mt-4 rounded-xl border border-dashed border-accent/45 bg-panel p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <FileUp className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{config.sourceFileName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Read in this browser</p>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-xs leading-5 text-muted-foreground">
                {config.sourceLines.map((line, index) => (
                  <div key={`${line}-${index}`} className="rounded-md bg-muted/70 px-3 py-2">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="p-6 font-mono text-[12px] leading-6 text-muted-foreground sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Editable Markdown
            </p>
            <div className="mt-4">
              {config.markdownLines.map((line, index) => (
                <p
                  key={`${line}-${index}`}
                  className={line.startsWith("#") ? "text-accent" : "text-foreground/80"}
                >
                  {line || "\u00a0"}
                </p>
              ))}
            </div>
            <span className="mt-3 block h-4 w-px bg-accent" aria-hidden />
          </div>
        </div>
        <div className="border-t border-border bg-surface px-5 py-3 text-xs text-muted-foreground">
          Nothing is sent to a Markdown Lens server.
        </div>
      </div>
    </div>
  );
}
