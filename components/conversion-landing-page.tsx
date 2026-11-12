import { ArrowRight, Check, FileDown, FileText, FileUp, LockKeyhole, PencilLine } from "lucide-react";
import { Breadcrumb, FaqList, RelatedTools } from "@/components/landing/parts";
import { ConvertFileButton, LandingImportSurface } from "@/components/landing-import-surface";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { modifiedFor, siteConfig } from "@/lib/site";

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
      dateModified: modifiedFor(config.path),
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
    <LandingImportSurface path={config.path}>
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
          <div className="relative z-10">
            <Breadcrumb current={config.title} />
            <section className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8">
              <div className="min-w-0 max-w-2xl">
                <p className="chip rise-in">
                  <LockKeyhole className="h-3.5 w-3.5 text-accent" aria-hidden />
                  {config.eyebrow}
                </p>
                <h1 className="display mt-6 text-4xl sm:text-5xl lg:text-6xl">{config.title}</h1>
                <p className="rise-in mt-6 max-w-xl text-lg leading-8 text-muted-foreground" style={{ "--i": 1 } as React.CSSProperties}>
                  {config.summary}
                </p>
                <p className="rise-in mt-3 max-w-xl text-sm leading-6 text-muted-foreground" style={{ "--i": 1 } as React.CSSProperties}>
                  {config.supportingSummary}
                </p>
                <ul className="rise-in mt-7 grid gap-2.5 text-sm sm:grid-cols-2" style={{ "--i": 2 } as React.CSSProperties}>
                  {config.highlights.map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                        <Check className="h-3 w-3" aria-hidden />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="rise-in mt-8 flex flex-col gap-3 sm:flex-row" style={{ "--i": 3 } as React.CSSProperties}>
                  <ConvertFileButton className="btn-primary group">
                    {config.cta}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                  </ConvertFileButton>
                  <a href="#how-it-works" className="btn-secondary">
                    See how it works
                  </a>
                </div>
                <p className="rise-in mt-4 text-sm text-muted-foreground" style={{ "--i": 4 } as React.CSSProperties}>Or drop a file on this page. It stays in this browser.</p>
              </div>

              <div className="rise-in min-w-0" style={{ "--i": 2 } as React.CSSProperties}>
                <ConversionPreview config={config} />
              </div>
            </section>
          </div>
        </div>

        <section className="defer-paint border-y border-border bg-surface" aria-label="Conversion facts">
          <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
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
            ].map(({ icon: Icon, title, description }) => (
              <article key={title} className="reveal flex gap-4 rounded-2xl p-2 md:p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-panel text-accent shadow-soft">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold tracking-tight">{title}</h2>
                  <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          id="how-it-works"
          className="defer-paint mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
          aria-labelledby="how-heading"
        >
          <div className="reveal max-w-2xl">
            <p className="eyebrow">Three simple steps</p>
            <h2 id="how-heading" className="heading mt-3 text-3xl sm:text-4xl">
              How it works
            </h2>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {config.steps.map((step, index) => (
              <li key={step.title} className="card reveal relative overflow-hidden p-6 sm:p-7">
                <span className="font-mono text-xs font-medium tracking-[0.18em] text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-6 text-lg font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="defer-paint border-y border-border bg-surface">
          <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
            <div className="card reveal p-6 sm:p-8">
              <h2 className="heading text-2xl sm:text-3xl">{config.outputHeading}</h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">{config.outputIntro}</p>
              <ul className="mt-7 space-y-5">
                {config.outputItems.map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                    <article className="min-w-0">
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    </article>
                  </li>
                ))}
              </ul>
            </div>

            <aside className="card reveal self-start p-6 sm:p-8">
              <h2 className="heading text-2xl sm:text-3xl">{config.limitsHeading}</h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{config.limitsIntro}</p>
              <ul className="mt-5 divide-y divide-border border-y border-border">
                {config.limitations.map((item) => (
                  <li key={item} className="py-3.5 text-sm leading-6 text-muted-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>

        <section className="defer-paint mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8" aria-labelledby="uses-heading">
          <div className="reveal max-w-2xl">
            <p className="eyebrow">Use cases</p>
            <h2 id="uses-heading" className="heading mt-3 text-3xl sm:text-4xl">
              Useful for real documentation work
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {config.useCases.map((item) => (
              <article key={item.title} className="card card-interactive reveal p-6 sm:p-7">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <FileText className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-5 font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="defer-paint mx-auto grid w-full max-w-7xl gap-8 border-t border-border px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.7fr_1.3fr] lg:px-8">
          <div className="reveal max-w-2xl">
            <p className="eyebrow">Quick answers</p>
            <h2 className="heading mt-3 text-3xl sm:text-4xl">Frequently asked questions</h2>
          </div>
          <FaqList items={config.faq} />
        </section>

        <RelatedTools related={config.related} />
      </main>
      <SiteFooter />
    </div>
    </LandingImportSurface>
  );
}

function ConversionPreview({ config }: { config: ConversionLandingPageConfig }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-3 -z-10 sm:-inset-6 rounded-[2.5rem] bg-accent/10 blur-3xl" aria-hidden />
      <div className="window">
        <div className="window-bar text-xs font-medium text-muted-foreground">
          <span className="window-dots" aria-hidden><i /><i /><i /></span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            <LockKeyhole className="h-3 w-3 text-accent" aria-hidden />
            Local conversion
          </span>
        </div>
        <div className="grid md:grid-cols-2">
          <div className="min-w-0 border-b border-border bg-surface/60 p-5 md:border-b-0 md:border-r">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {config.sourceLabel}
            </p>
            <div className="mt-4 rounded-xl border border-dashed border-accent/45 bg-panel p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <FileUp className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{config.sourceFileName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Read in this browser</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-xs leading-5 text-muted-foreground">
                {config.sourceLines.map((line, index) => (
                  <div key={`${line}-${index}`} className="whitespace-pre-wrap break-words rounded-lg bg-muted/70 px-3 py-2">
                    <code className="font-mono">{line}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="min-w-0 p-5 font-mono text-xs leading-6 sm:p-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
              Editable Markdown
            </p>
            <div className="mt-4 overflow-x-auto">
              {config.markdownLines.map((line, index) => (
                <code
                  key={`${line}-${index}`}
                  className={`block whitespace-pre-wrap break-words ${line.startsWith("#") ? "font-semibold text-accent" : "text-foreground/80"}`}
                >
                  {line || "\u00a0"}
                </code>
              ))}
              <span className="caret mt-1 block h-4" aria-hidden />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-border bg-surface px-5 py-3 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
          Nothing is sent to a Markdown Lens server.
        </div>
      </div>
    </div>
  );
}
