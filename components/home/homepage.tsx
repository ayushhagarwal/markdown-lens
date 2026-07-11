import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { HomepageHeader } from "@/components/home/homepage-header";
import { ProductPreview } from "@/components/home/product-preview";
import { ConversionWorkflow } from "@/components/home/conversion-workflow";
import { BrandIcon } from "@/components/brand-icon";
import { siteConfig } from "@/lib/site";

export function Homepage() {
  return (
    <div className="home-shell min-h-screen overflow-hidden bg-background text-foreground">
      <HomepageHeader />
      <main>
        <section className="mx-auto grid w-full max-w-[1500px] items-start gap-12 px-5 pb-16 pt-14 sm:px-8 lg:min-h-[860px] lg:grid-cols-[0.76fr_1.24fr] lg:gap-14 lg:px-12 lg:pb-20 lg:pt-16 xl:px-14">
          <div className="relative z-10 max-w-[560px] lg:pt-14">
            <h1 className="text-balance text-[clamp(2.75rem,4.2vw,4rem)] font-semibold leading-[1.04] tracking-[-0.055em]">
              A local workspace for document-to-Markdown.
            </h1>
            <p className="mt-7 max-w-[520px] text-[1.05rem] leading-8 text-muted-foreground sm:text-lg">
              <span className="sm:hidden">Convert PDFs, Office files, HTML, EPUB, data, and images into clean Markdown—entirely in your browser.</span>
              <span className="hidden sm:inline">Convert PDFs, Office files, HTML, EPUB, data, and images into clean Markdown. Review the result, edit the source, and export—entirely in your browser.</span>
            </p>
            <div className="mt-9 flex flex-col items-start gap-5">
              <Link href="/editor" className="home-primary-action group">
                Open workspace
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
              <Link href="/supported-formats" className="home-text-link group">
                View supported formats
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
            <p className="mt-9 text-sm tracking-[-0.01em] text-muted-foreground">
              Local processing <span aria-hidden>·</span> No account <span aria-hidden>·</span> Open source
            </p>
          </div>
          <ProductPreview />
        </section>

        <ConversionWorkflow />

        <section className="border-t border-border/70 px-5 py-24 sm:px-8 lg:py-36">
          <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
            <h2 className="text-balance text-4xl font-semibold leading-[1.1] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              Private by design.<br />Open by default.
            </h2>
            <div className="border-border/80 lg:border-l lg:pl-16">
              <p className="max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">
                Files are processed locally, workspace data stays in your browser, and the source
                is available to inspect.
              </p>
              <div className="mt-7 flex flex-wrap gap-x-8 gap-y-4 text-sm sm:text-base">
                <Link href="/supported-formats" className="home-inline-link">Local processing</Link>
                <a href={`${siteConfig.githubUrl}/blob/main/SECURITY.md`} className="home-inline-link">No analytics</a>
                <a href={siteConfig.githubUrl} className="home-inline-link">Open source</a>
              </div>
            </div>
          </div>
        </section>

        <section className="relative px-5 pb-28 pt-20 text-center sm:px-8 lg:pb-36 lg:pt-28">
          <BrandIcon className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 opacity-[0.025] grayscale" />
          <div className="relative z-10 mx-auto max-w-3xl">
            <h2 className="text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.05em] sm:text-6xl">
              Work with Markdown,<br />not around it.
            </h2>
            <div className="mt-9 flex flex-col items-center gap-5">
              <Link href="/editor" className="home-outline-action group">
                Open workspace
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
              <a href={siteConfig.githubUrl} className="home-text-link group">
                View on GitHub
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        </section>

        <footer className="border-t border-border/75 px-5 py-7 sm:px-8">
          <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 text-sm sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="flex items-center gap-2.5 font-semibold">
              <BrandIcon className="h-8 w-8" /> Markdown Lens
            </Link>
            <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-muted-foreground" aria-label="Footer navigation">
              <Link href="/supported-formats" className="transition hover:text-foreground">Formats</Link>
              <Link href="/markdown-cheatsheet" className="transition hover:text-foreground">Guide</Link>
              <a href={`${siteConfig.githubUrl}/blob/main/SECURITY.md`} className="transition hover:text-foreground">Security</a>
              <a href={siteConfig.githubUrl} className="transition hover:text-foreground">GitHub</a>
            </nav>
            <p className="text-muted-foreground">Built locally. Shared openly.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
