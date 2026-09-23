import Link from "next/link";
import { ArrowRight, FileCheck2, FileText, Sparkles } from "lucide-react";
import { ProductPreview } from "@/components/home/product-preview";
import { ConversionWorkflow } from "@/components/home/conversion-workflow";
import { BrandIcon } from "@/components/brand-icon";
import { ConvertFileButton, LandingImportSurface, TrySamplePdfButton } from "@/components/landing-import-surface";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { converterLinks, siteConfig } from "@/lib/site";

export function Homepage() {
  return (
    <LandingImportSurface path="/">
    <div className="home-shell min-h-screen overflow-x-clip bg-background text-foreground">
      <SiteHeader wide />
      <main id="main">
        <section className="mx-auto grid w-full max-w-[1500px] items-start gap-12 px-5 pb-16 pt-14 sm:px-8 lg:min-h-[860px] lg:grid-cols-[0.76fr_1.24fr] lg:gap-14 lg:px-12 lg:pb-20 lg:pt-16 xl:px-14">
          <div className="relative z-10 max-w-[560px] lg:pt-14">
            <h1 className="text-balance text-[clamp(2.75rem,4.2vw,4rem)] font-semibold leading-[1.04] tracking-[-0.055em]">
              A local Markdown editor that converts documents privately.
            </h1>
            <p className="mt-7 max-w-[520px] text-[1.05rem] leading-8 text-muted-foreground sm:text-lg">
              <span className="sm:hidden">Preview GitHub-style Markdown and convert PDFs, Office files, HTML, EPUB, data, and images—entirely in your browser.</span>
              <span className="hidden sm:inline">Preview GitHub-style Markdown, then convert PDFs, Office files, HTML, EPUB, data, and images into editable source—entirely in your browser.</span>
            </p>
            <div className="mt-9 flex flex-col items-start gap-4">
              <ConvertFileButton className="btn-primary home-action group">
                Convert a file
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />
              </ConvertFileButton>
              <TrySamplePdfButton className="btn-secondary home-action">
                Try a sample PDF
              </TrySamplePdfButton>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link href="/editor" className="home-text-link group">
                  Open workspace
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
                <Link href="/supported-formats" className="home-text-link group">
                  View supported formats
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              </div>
            </div>
            <p className="mt-4 max-w-[520px] text-sm leading-6 text-muted-foreground">Or drop a PDF, Word file, or other supported document anywhere on this page.</p>
            <nav className="mt-8 flex max-w-[520px] flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground" aria-label="Popular converters">
              {converterLinks.slice(0, 6).map((link) => (
                <Link key={link.href} href={link.href} className="rounded-sm transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  {link.label}
                </Link>
              ))}
              <Link href="/supported-formats" className="rounded-sm transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">More formats</Link>
            </nav>
          </div>
          <ProductPreview />
        </section>

        <section className="border-t border-border/70 px-5 py-20 sm:px-8 lg:py-28" aria-labelledby="why-title">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">A calmer way to work</p>
              <h2 id="why-title" className="mt-4 text-balance text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Keep the source close, the workflow clear, and the output yours.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">Markdown Lens gives document-heavy work a focused place to happen—from the first import to the final review.</p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <ValueCard icon={FileText} title="A page becomes Markdown" body="Headings, lists, and paragraphs come out as text you can edit." />
              <ValueCard icon={FileCheck2} title="Review before export" body="Warnings, structure, and rendered output stay visible before you publish." />
              <ValueCard icon={Sparkles} title="Built for Markdown" body="Write in a fast editor, preview GitHub-style output, and keep clean source." />
            </div>
          </div>
        </section>

        <ConversionWorkflow />

        <section className="border-t border-border/70 px-5 py-24 sm:px-8 lg:py-36">
          <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
            <h2 className="text-balance text-4xl font-semibold leading-[1.1] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              Open when you want to see how it works.
            </h2>
            <div className="border-border/80 lg:border-l lg:pl-16">
              <p className="max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">
                The source is public, so you can read how a file becomes Markdown and what the
                converter will not invent.
              </p>
              <div className="mt-7 flex flex-wrap gap-x-8 gap-y-4 text-sm sm:text-base">
                <Link href="/supported-formats" className="home-inline-link">Supported formats</Link>
                <a href={siteConfig.githubUrl} target="_blank" rel="noopener noreferrer" aria-label="Inspect the Markdown Lens source on GitHub (opens in a new tab)" className="home-inline-link">Read the source</a>
              </div>
            </div>
          </div>
        </section>

        <section className="relative px-5 pb-28 pt-20 text-center sm:px-8 lg:pb-36 lg:pt-28">
          <BrandIcon className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 opacity-[0.025] grayscale" />
          <div className="relative z-10 mx-auto max-w-3xl">
            <h2 className="text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.05em] sm:text-6xl">
              Convert a page,<br />then edit the Markdown.
            </h2>
            <div className="mt-9 flex flex-col items-center gap-5">
              <ConvertFileButton className="btn-primary home-action group">
                Convert a file
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />
              </ConvertFileButton>
              <Link href="/editor" className="home-text-link group">
                Open workspace
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
    </LandingImportSurface>
  );
}

function ValueCard({ icon: Icon, title, body }: { icon: typeof FileText; title: string; body: string }) {
  return (
    <article className="rounded-xl border border-border bg-panel p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-7">
      <Icon className="h-6 w-6 text-accent" aria-hidden />
      <h3 className="mt-6 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </article>
  );
}
