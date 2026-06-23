import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, LockKeyhole } from "lucide-react";
import { markdownViewerFaq, SeoContent } from "@/components/seo-content";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    absolute: siteConfig.title,
  },
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#website`,
      name: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.description,
      inLanguage: "en",
      publisher: {
        "@id": `${siteConfig.url}/#creator`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${siteConfig.url}/#webpage`,
      url: siteConfig.url,
      name: siteConfig.title,
      description: siteConfig.description,
      isPartOf: {
        "@id": `${siteConfig.url}/#website`,
      },
      mainEntity: {
        "@id": `${siteConfig.url}/#software`,
      },
      inLanguage: "en",
      dateModified: "2026-06-23",
    },
    {
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": `${siteConfig.url}/#creator`,
      name: siteConfig.author.name,
      url: siteConfig.author.url,
      sameAs: [siteConfig.author.url],
    },
    {
      "@context": "https://schema.org",
      "@type": ["SoftwareApplication", "WebApplication"],
      "@id": `${siteConfig.url}/#software`,
      name: siteConfig.name,
      alternateName: [
        "Online Markdown Editor",
        "Online Markdown Viewer",
        "Markdown Preview Tool",
        "PDF and Word to Markdown Converter",
      ],
      applicationCategory: "DeveloperApplication",
      applicationSubCategory: "Markdown editor",
      operatingSystem: "Any",
      browserRequirements: "Requires a modern web browser with JavaScript enabled.",
      url: siteConfig.url,
      downloadUrl: siteConfig.url,
      installUrl: siteConfig.url,
      screenshot: `${siteConfig.url}/opengraph-image`,
      codeRepository: siteConfig.githubUrl,
      isAccessibleForFree: true,
      isFamilyFriendly: true,
      license: "https://github.com/ayushhagarwal/markdown-lens/blob/main/LICENSE",
      creator: {
        "@id": `${siteConfig.url}/#creator`,
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      description: siteConfig.description,
      featureList: siteConfig.features,
      keywords: siteConfig.keywords.join(", "),
      softwareVersion: "0.1.0",
      softwareHelp: `${siteConfig.url}/markdown-cheatsheet`,
      dateModified: "2026-06-23",
      inLanguage: "en",
      sameAs: [siteConfig.githubUrl],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${siteConfig.url}/#faq`,
      mainEntity: markdownViewerFaq.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer,
        },
      })),
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main>
          <section className="mx-auto grid w-full max-w-7xl gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-[0.86fr_1.14fr] lg:items-center lg:px-8 lg:py-24">
            <div className="max-w-2xl">
              <h1 className="text-balance text-4xl font-semibold tracking-[-0.05em] sm:text-5xl lg:text-[4rem] lg:leading-[1.03]">
                Markdown that looks right before you publish.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Paste or open Markdown, or turn a text-based PDF or Word .docx into an editable
                draft. GitHub-style rendering, diagrams, math, and code—all in your browser.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/editor"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-foreground px-5 text-sm font-semibold text-background transition hover:bg-foreground/88 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                >
                  Open editor
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/editor?sample=1"
                  className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-panel px-5 text-sm font-semibold shadow-sm transition hover:border-ring hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                >
                  Try a sample
                </Link>
              </div>
              <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <LockKeyhole className="h-4 w-4 text-accent" aria-hidden />
                Private by default. Nothing is uploaded.
              </p>
            </div>

            <ProductPreview />
          </section>

          <SeoContent />
        </main>
      </div>
    </>
  );
}

function ProductPreview() {
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
          <span className="text-[11px] font-medium text-muted-foreground">Live preview</span>
        </div>
        <div className="grid min-h-[390px] md:grid-cols-2">
          <div className="border-b border-border p-5 font-mono text-[12px] leading-6 text-muted-foreground md:border-b-0 md:border-r">
            <p className="text-accent"># Release notes</p>
            <p className="mt-4 text-foreground">## What changed</p>
            <p className="mt-2">- Faster previews</p>
            <p>- Mermaid diagrams</p>
            <p>- Private local drafts</p>
            <p className="mt-5 text-foreground">```ts</p>
            <p>
              <span className="text-accent">const</span> ready ={" "}
              <span className="text-foreground">true</span>;
            </p>
            <p className="text-foreground">```</p>
            <span className="mt-3 block h-4 w-px bg-accent" aria-hidden />
          </div>
          <div className="p-6 sm:p-7">
            <h2 className="border-b border-border pb-3 text-2xl font-semibold tracking-tight">
              Release notes
            </h2>
            <h3 className="mt-6 text-base font-semibold">What changed</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {["Faster previews", "Mermaid diagrams", "Private local drafts"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-accent" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <pre className="mt-6 overflow-hidden rounded-lg bg-[#0d1117] px-4 py-3 font-mono text-[11px] leading-5 text-slate-300">
              <code>
                <span className="text-teal-300">const</span> ready ={" "}
                <span className="text-sky-300">true</span>;
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
