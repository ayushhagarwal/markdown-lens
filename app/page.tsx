import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, FileText, FileUp, LockKeyhole } from "lucide-react";
import { markdownViewerFaq, SeoContent } from "@/components/seo-content";
import { SiteFooter } from "@/components/site-footer";
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
      dateModified: "2026-06-27",
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
      softwareVersion: "0.2.1",
      softwareHelp: `${siteConfig.url}/markdown-cheatsheet`,
      dateModified: "2026-06-27",
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
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                <FileUp className="h-3.5 w-3.5" aria-hidden />
                New: upload PDF or Word .docx to Markdown
              </div>
              <h1 className="text-balance text-4xl font-semibold tracking-[-0.05em] sm:text-5xl lg:text-[4rem] lg:leading-[1.03]">
                Turn PDFs and Word docs into clean Markdown.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Markdown Lens is a free PDF-to-Markdown and Word-to-Markdown converter that runs
                entirely in your browser. Upload a text-based PDF or .docx file, edit the generated
                Markdown, and download it—no account or server upload required.
              </p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Great for Confluence exports, existing docs, README prep, and AI-ready knowledge
                bases.
              </p>
              <div className="mt-6 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                {[
                  "Local conversion — no upload",
                  "Editable .md output",
                  "PDF pages kept with separators",
                  "DOCX headings, lists, tables, links",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/editor"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-foreground px-5 text-sm font-semibold text-background transition hover:bg-foreground/88 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                >
                  Upload a document
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/editor?sample=1"
                  className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-panel px-5 text-sm font-semibold shadow-sm transition hover:border-ring hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                >
                  Try Markdown preview
                </Link>
              </div>
              <p className="mt-6 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                <LockKeyhole className="h-4 w-4 text-accent" aria-hidden />
                Private by default. PDF and .docx conversion runs locally; scanned PDFs and legacy
                .doc files are not converted.
              </p>
            </div>

            <ProductPreview />
          </section>

          <SeoContent />
        </main>
        <SiteFooter />
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
          <span className="text-[11px] font-medium text-muted-foreground">
            Local document import
          </span>
        </div>
        <div className="grid min-h-[390px] md:grid-cols-2">
          <div className="border-b border-border bg-surface/55 p-5 md:border-b-0 md:border-r">
            <div className="rounded-xl border border-dashed border-accent/45 bg-panel p-5 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <FileUp className="h-6 w-6" aria-hidden />
              </div>
              <p className="mt-4 text-sm font-semibold">Upload a source document</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Drop a Confluence PDF export, product spec, handbook, or Word .docx.
              </p>
              <div className="mt-5 grid gap-2 text-left text-xs text-muted-foreground">
                {["team-handbook.docx", "confluence-export.pdf", "release-plan.pdf"].map(
                  (file) => (
                    <div
                      key={file}
                      className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
                    >
                      <FileText className="h-3.5 w-3.5 text-accent" aria-hidden />
                      {file}
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
          <div className="p-6 font-mono text-[12px] leading-6 text-muted-foreground sm:p-7">
            <p className="text-accent"># Team Handbook</p>
            <p className="mt-4 text-foreground">## Overview</p>
            <p className="mt-2">Imported from Word or PDF, ready to edit.</p>
            <p className="mt-4 text-foreground">## Decisions</p>
            <p>- Keep headings and lists</p>
            <p>- Preserve links and simple tables</p>
            <p>- Add page separators for PDFs</p>
            <div className="mt-5 rounded-lg border border-border bg-background p-3">
              <p>| Source | Markdown |</p>
              <p>| --- | --- |</p>
              <p>| PDF | local import |</p>
              <p>| DOCX | editable .md |</p>
            </div>
            <span className="mt-3 block h-4 w-px bg-accent" aria-hidden />
          </div>
        </div>
        <div className="border-t border-border bg-surface px-5 py-3 text-xs text-muted-foreground">
          Converted Markdown stays in the editor. Images/scanned pages are skipped instead of
          uploaded.
        </div>
      </div>
    </div>
  );
}
