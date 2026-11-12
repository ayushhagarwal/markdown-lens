import Link from "next/link";
import { ArrowRight, Check, LockKeyhole } from "lucide-react";
import { Breadcrumb, DropTarget, FaqList, RelatedTools, SectionHeader, Steps } from "@/components/landing/parts";
import { ConvertFileButton, LandingImportSurface } from "@/components/landing-import-surface";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { modifiedFor, siteConfig } from "@/lib/site";

export type FormatLandingConfig = {
  path: string;
  title: string;
  summary: string;
  description: string;
  extensions: string;
  preserves: readonly string[];
  limitations: readonly string[];
  steps: readonly string[];
  faq: readonly { question: string; answer: string }[];
  related: readonly { href: string; title: string; description: string }[];
  /** Real converter output for a small input, shown as an input/output example. */
  sample?: {
    heading: string;
    fileName: string;
    sourceLabel: string;
    sourceLines: readonly string[];
    markdown: string;
    note?: string;
  };
  /** Extra how-to and reference sections rendered after the limitations. */
  sections?: readonly FormatLandingSection[];
};

export type FormatLandingSection = {
  heading: string;
  paragraphs?: readonly string[];
  list?: readonly string[];
  ordered?: boolean;
  table?: { caption: string; head: readonly string[]; rows: readonly (readonly string[])[]; codeColumns?: readonly number[] };
  code?: string;
  links?: readonly { href: string; label: string }[];
};

export function FormatLandingPage({ config }: { config: FormatLandingConfig }) {
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      url: `${siteConfig.url}${config.path}`,
      name: config.title,
      description: config.summary,
      isPartOf: { "@id": `${siteConfig.url}/#website` },
      about: { "@id": `${siteConfig.url}/#software` },
      dateModified: modifiedFor(config.path),
      inLanguage: "en",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: siteConfig.name, item: siteConfig.url },
        { "@type": "ListItem", position: 2, name: config.title, item: `${siteConfig.url}${config.path}` },
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <SiteHeader />
      <main id="main">
        <div className="relative isolate">
          <div className="backdrop-grid" aria-hidden />
          <div className="backdrop-glow" aria-hidden />
          <div className="relative z-10">
            <Breadcrumb current={config.title} />
            <section className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
              <div>
                <p className="chip rise-in"><LockKeyhole aria-hidden="true" className="h-3.5 w-3.5 text-accent" />Free · runs in your browser</p>
                <h1 className="display mt-6 max-w-3xl text-4xl sm:text-5xl lg:text-6xl">{config.title}</h1>
                <p className="rise-in mt-6 max-w-2xl text-lg leading-8 text-muted-foreground" style={{ "--i": 1 } as React.CSSProperties}>{config.summary}</p>
                <p className="rise-in mt-3 max-w-2xl text-sm leading-6 text-muted-foreground" style={{ "--i": 1 } as React.CSSProperties}>{config.description}</p>
                <div className="rise-in mt-8 flex flex-col gap-3 sm:flex-row" style={{ "--i": 2 } as React.CSSProperties}>
                  <ConvertFileButton className="btn-primary group">
                    Open or convert {config.extensions}
                    <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </ConvertFileButton>
                  <Link href="/supported-formats" className="btn-secondary">Compare formats</Link>
                </div>
                <p className="rise-in mt-4 text-sm text-muted-foreground" style={{ "--i": 3 } as React.CSSProperties}>Or drop a file on this page. It stays in this browser.</p>
              </div>
              <div className="rise-in" style={{ "--i": 2 } as React.CSSProperties}>
                <DropTarget title="Drop a file here" hint={config.extensions}>
                  <Steps steps={config.steps} />
                </DropTarget>
              </div>
            </section>
          </div>
        </div>

        {config.sample ? <SampleSection sample={config.sample} /> : null}

        <section className="defer-paint border-y border-border bg-surface">
          <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8">
            <div className="card reveal p-6 sm:p-8">
              <h2 className="heading text-2xl sm:text-3xl">What the converter preserves</h2>
              <ul className="mt-7 space-y-4">
                {config.preserves.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-6">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><Check aria-hidden="true" className="h-3 w-3" /></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card reveal p-6 sm:p-8">
              <h2 className="heading text-2xl sm:text-3xl">Limitations to review</h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">Markdown represents document structure, not every visual layout detail.</p>
              <ul className="mt-5 divide-y divide-border border-y border-border">
                {config.limitations.map((item) => <li key={item} className="py-3.5 text-sm leading-6 text-muted-foreground">{item}</li>)}
              </ul>
            </div>
          </div>
        </section>

        {config.sections?.length ? (
          <div className="defer-paint mx-auto w-full max-w-4xl space-y-16 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            {config.sections.map((section) => <GuideSection key={section.heading} section={section} />)}
          </div>
        ) : null}

        <section className="defer-paint mx-auto grid w-full max-w-7xl gap-8 border-t border-border px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.7fr_1.3fr] lg:px-8">
          <SectionHeader eyebrow="Quick answers" title={`Questions about ${config.extensions}`} />
          <FaqList items={config.faq} />
        </section>

        <RelatedTools related={config.related} />
      </main>
      <SiteFooter />
    </div>
    </LandingImportSurface>
  );
}

function SampleSection({ sample }: { sample: NonNullable<FormatLandingConfig["sample"]> }) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8" aria-labelledby="sample-heading">
      <div className="reveal max-w-3xl">
        <p className="eyebrow">Real output</p>
        <h2 id="sample-heading" className="heading mt-3 text-3xl sm:text-4xl">{sample.heading}</h2>
        {sample.note ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{sample.note}</p> : null}
      </div>
      <div className="reveal mt-10 grid gap-5 lg:grid-cols-2">
        <div className="window">
          <p className="window-bar text-xs font-medium text-muted-foreground">
            <span className="window-dots" aria-hidden><i /><i /><i /></span>
            <span className="font-mono">{sample.fileName}</span>
            <span className="ml-auto">{sample.sourceLabel}</span>
          </p>
          <ul className="space-y-2 p-5">
            {sample.sourceLines.map((line, index) => (
              <li key={`${line}-${index}`} className="whitespace-pre-wrap break-words rounded-lg bg-muted/70 px-3 py-2 text-muted-foreground"><code className="font-mono text-xs">{line}</code></li>
            ))}
          </ul>
        </div>
        <div className="window min-w-0">
          <p className="window-bar text-xs font-medium text-muted-foreground">
            <span className="window-dots" aria-hidden><i /><i /><i /></span>
            Markdown output
          </p>
          <pre tabIndex={0} className="overflow-x-auto p-5 font-mono text-xs leading-6 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><code>{sample.markdown}</code></pre>
        </div>
      </div>
    </section>
  );
}

function GuideSection({ section }: { section: FormatLandingSection }) {
  const ListTag = section.ordered ? "ol" : "ul";
  return (
    <section className="reveal">
      <h2 className="heading text-2xl sm:text-3xl">{section.heading}</h2>
      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph} className="mt-4 leading-7 text-muted-foreground">{paragraph}</p>
      ))}
      {section.list ? (
        <ListTag className={`mt-4 space-y-2 pl-5 leading-7 text-muted-foreground ${section.ordered ? "list-decimal" : "list-disc"}`}>
          {section.list.map((item) => <li key={item}>{item}</li>)}
        </ListTag>
      ) : null}
      {section.table ? (
        <div role="region" aria-label={section.table.caption} tabIndex={0} className="mt-6 overflow-x-auto rounded-xl border border-border bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <table className="w-full min-w-[480px] border-collapse text-left text-sm">
            <caption className="sr-only">{section.table.caption}</caption>
            <thead className="bg-surface">
              <tr>{section.table.head.map((cell) => <th key={cell} scope="col" className="border-b border-border px-4 py-3 font-semibold">{cell}</th>)}</tr>
            </thead>
            <tbody>
              {section.table.rows.map((row) => (
                <tr key={row.join("|")} className="border-b border-border last:border-0">
                  {row.map((cell, index) => (
                    <td key={`${index}-${cell}`} className="px-4 py-3">
                      {(section.table?.codeColumns ?? [1]).includes(index) ? <code className="font-mono text-xs">{cell}</code> : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {section.code ? (
        <pre tabIndex={0} className="code-block mt-6"><code>{section.code}</code></pre>
      ) : null}
      {section.links?.length ? (
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {section.links.map((link) => (
            <Link key={link.href} href={link.href} className="link-underline">{link.label}</Link>
          ))}
        </p>
      ) : null}
    </section>
  );
}
