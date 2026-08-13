import Link from "next/link";
import { ArrowRight, Check, FileUp, LockKeyhole } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/lib/site";

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
      dateModified: siteConfig.dateModified,
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
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <SiteHeader />
      <main>
        <section className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8 lg:py-24">
          <div>
            <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{config.title}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{config.summary}</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{config.description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/editor" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/88 focus:outline-none focus:ring-2 focus:ring-ring">
                Open or convert {config.extensions}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/supported-formats" className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-panel px-5 text-sm font-semibold hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring">Compare formats</Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><LockKeyhole className="h-4 w-4 text-accent" />Local browser processing. No document upload.</p>
          </div>
          <div className="border border-border bg-panel p-6 sm:p-8">
            <div className="flex items-center gap-3 border-b border-border pb-5"><FileUp className="h-5 w-5 text-accent" /><div><p className="font-semibold">Open or convert</p><p className="text-sm text-muted-foreground">{config.extensions}</p></div></div>
            <ol className="mt-6 space-y-5">{config.steps.map((step, index) => <li key={step} className="flex gap-4 text-sm leading-6"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{index + 1}</span><span>{step}</span></li>)}</ol>
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div><h2 className="text-3xl font-semibold tracking-tight">What the converter preserves</h2><ul className="mt-7 space-y-4">{config.preserves.map((item) => <li key={item} className="flex items-start gap-3 text-sm leading-6"><Check className="mt-1 h-4 w-4 shrink-0 text-accent" />{item}</li>)}</ul></div>
            <div><h2 className="text-3xl font-semibold tracking-tight">Limitations to review</h2><p className="mt-4 text-sm leading-6 text-muted-foreground">Markdown represents document structure, not every visual layout detail.</p><ul className="mt-6 divide-y divide-border border-y border-border">{config.limitations.map((item) => <li key={item} className="py-4 text-sm leading-6 text-muted-foreground">{item}</li>)}</ul></div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight">Questions about {config.extensions}</h2>
          <div className="divide-y divide-border border-y border-border">{config.faq.map((item) => <details key={item.question} className="group py-5"><summary className="cursor-pointer list-none font-medium">{item.question}</summary><p className="pt-3 text-sm leading-7 text-muted-foreground">{item.answer}</p></details>)}</div>
        </section>

        <section className="border-t border-border/75 bg-foreground text-background">
          <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-semibold tracking-tight">Related Markdown tools</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {config.related.map((item) => (
                <Link key={item.href} href={item.href} className="group rounded-xl border border-background/15 bg-background/5 p-5 transition hover:border-background/30 hover:bg-background/10">
                  <span className="flex items-center justify-between gap-3 font-semibold">
                    {item.title}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-background/65">{item.description}</span>
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
