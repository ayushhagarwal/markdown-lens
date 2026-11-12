import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Command,
  Eye,
  FileDown,
  FileText,
  Layers,
  LockKeyhole,
  ShieldCheck,
  Sigma,
  Star,
  WifiOff,
  Workflow,
} from "lucide-react";
import { ProductPreview } from "@/components/home/product-preview";
import { ConversionWorkflow } from "@/components/home/conversion-workflow";
import { GithubStarLink } from "@/components/github-star-link";
import { ConvertFileButton, LandingImportSurface, TrySamplePdfButton } from "@/components/landing-import-surface";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { converterLinks, siteConfig } from "@/lib/site";

const chipLink = "chip transition-colors hover:border-foreground/25 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function Homepage() {
  return (
    <LandingImportSurface path="/">
      <div className="min-h-screen overflow-x-clip bg-background text-foreground">
        <SiteHeader wide />
        <main id="main">
          <section className="relative isolate px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:pb-28">
            <div className="backdrop-grid" aria-hidden />
            <div className="backdrop-glow" aria-hidden />
            <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
              <p className="chip rise-in bg-panel/80 backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden />
                Free and open source · Nothing is uploaded
              </p>
              <h1 className="display mt-7 text-[clamp(2.6rem,6.4vw,5rem)]">
                A local Markdown editor that converts documents <span className="text-gradient">privately.</span>
              </h1>
              <p className="rise-in mt-7 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9" style={{ "--i": 1 } as React.CSSProperties}>
                Preview GitHub-style Markdown, then turn PDFs, Office files, HTML, EPUB, data, and images into editable
                source. All of it happens in your browser.
              </p>
              <div className="rise-in mt-10 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row" style={{ "--i": 2 } as React.CSSProperties}>
                <ConvertFileButton className="btn-primary group h-14 w-full px-8 text-base sm:w-auto">
                  Convert a file
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />
                </ConvertFileButton>
                <TrySamplePdfButton className="btn-secondary h-14 w-full px-8 text-base sm:w-auto">
                  Try a sample PDF
                </TrySamplePdfButton>
              </div>
              <div className="rise-in mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm" style={{ "--i": 3 } as React.CSSProperties}>
                <Link href="/editor" className="link-underline group inline-flex items-center gap-1.5">
                  Open workspace
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
                <Link href="/supported-formats" className="link-underline">View supported formats</Link>
              </div>
              <p className="rise-in mt-5 text-sm text-muted-foreground" style={{ "--i": 3 } as React.CSSProperties}>
                Or drop a PDF, Word file, or other supported document anywhere on this page.
              </p>
              <nav className="rise-in mt-8 flex flex-wrap justify-center gap-2" aria-label="Popular converters" style={{ "--i": 4 } as React.CSSProperties}>
                {converterLinks.slice(0, 6).map((link) => (
                  <Link key={link.href} href={link.href} className={chipLink}>
                    {link.label}
                  </Link>
                ))}
                <Link href="/supported-formats" className={chipLink}>More formats</Link>
              </nav>
            </div>

            <div className="rise-in relative z-10 mx-auto mt-16 max-w-6xl sm:mt-20" style={{ "--i": 5 } as React.CSSProperties}>
              <ProductPreview />
            </div>
          </section>

          <section className="border-y border-border bg-surface" aria-label="Markdown Lens at a glance">
            <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-border lg:grid-cols-4">
              {[
                ["0", "files uploaded, ever"],
                ["12", "formats supported"],
                ["100%", "open-source code"],
                ["Offline", "once it is installed"],
              ].map(([value, label]) => (
                <div key={label} className="flex flex-col-reverse gap-1 bg-surface px-5 py-8 sm:px-8">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="text-3xl font-semibold tracking-tight sm:text-4xl">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="defer-paint px-5 py-24 sm:px-8 lg:py-32" aria-labelledby="features-title">
            <div className="mx-auto max-w-6xl">
              <div className="reveal max-w-2xl">
                <p className="eyebrow">Why Markdown Lens</p>
                <h2 id="features-title" className="heading mt-4 text-4xl sm:text-5xl">Keep the source close, the workflow clear, and the output yours.</h2>
                <p className="mt-5 text-lg leading-8 text-muted-foreground">A focused place for document-heavy work, from the first import to the final review.</p>
              </div>

              <div className="mt-14 grid gap-4 md:grid-cols-6">
                <FeatureCard className="md:col-span-4" icon={LockKeyhole} title="Private by design" body="Files are read and converted on your device. There is no upload step, no account, and no analytics, so confidential documents stay with you.">
                  <div className="mt-8 flex items-center gap-3 rounded-xl border border-dashed border-accent/40 bg-accent-soft/40 p-4" aria-hidden>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-panel text-accent shadow-soft"><FileText className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs">contract-draft.pdf</span>
                      <span className="beam mt-2 block h-1 rounded-full bg-border" />
                    </span>
                    <span className="hidden shrink-0 rounded-full bg-panel px-3 py-1 font-mono text-[11px] text-accent shadow-soft sm:block">0 bytes sent</span>
                  </div>
                </FeatureCard>

                <FeatureCard className="md:col-span-2" icon={Eye} title="Live GitHub-style preview" body="See headings, tables, task lists, and code exactly as they will render.">
                  <div className="mt-8 grid gap-2 font-mono text-xs" aria-hidden>
                    <span className="rounded-lg bg-muted px-3 py-2 text-muted-foreground">**Ship** the _draft_</span>
                    <span className="rounded-lg border border-border px-3 py-2 font-sans text-sm"><strong>Ship</strong> the <em>draft</em></span>
                  </div>
                </FeatureCard>

                <FeatureCard className="md:col-span-2" icon={Workflow} title="Mermaid diagrams" body="Fenced mermaid blocks become diagrams as you type.">
                  <div className="mt-8 flex items-center gap-2 font-mono text-[11px]" aria-hidden>
                    <span className="rounded-lg border border-accent/40 bg-accent-soft/50 px-2.5 py-1.5 text-accent">Write</span>
                    <span className="h-px flex-1 bg-border" />
                    <span className="rounded-lg border border-border px-2.5 py-1.5">Preview</span>
                    <span className="h-px flex-1 bg-border" />
                    <span className="rounded-lg border border-border px-2.5 py-1.5">Publish</span>
                  </div>
                </FeatureCard>

                <FeatureCard className="md:col-span-2" icon={Sigma} title="Math with KaTeX" body="Inline and block equations render next to your text.">
                  <p className="mt-8 rounded-xl bg-muted px-4 py-3 text-center font-serif text-xl italic" aria-hidden>
                    e<sup className="text-sm">iπ</sup> + 1 = 0
                  </p>
                </FeatureCard>

                <FeatureCard className="md:col-span-2" icon={Command} title="Fast on the keyboard" body="A command palette, find and replace, and shortcuts for every common action.">
                  <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground" aria-hidden>
                    <kbd className="!px-2 !py-1 !text-xs">⌘</kbd>
                    <kbd className="!px-2 !py-1 !text-xs">K</kbd>
                    <span>opens every command</span>
                  </p>
                </FeatureCard>

                <FeatureCard className="md:col-span-3" icon={Layers} title="A workspace, not a text box" body="Keep many documents with autosave, an outline, version snapshots, and extracted images, all stored in your browser.">
                  <ul className="mt-8 grid gap-1.5 text-xs" aria-hidden>
                    {[
                      ["PDF", "Product handbook", "now"],
                      ["DOCX", "Architecture notes", "2m"],
                      ["MD", "Release checklist", "1h"],
                    ].map(([format, title, time], index) => (
                      <li key={title} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${index === 0 ? "bg-accent-soft/60" : "bg-muted/60"}`}>
                        <span className="w-10 font-mono text-[10px] font-semibold text-muted-foreground">{format}</span>
                        <span className="flex-1 truncate">{title}</span>
                        <span className="text-muted-foreground">{time}</span>
                      </li>
                    ))}
                  </ul>
                </FeatureCard>

                <FeatureCard className="md:col-span-3" icon={FileDown} title="Take the result anywhere" body="Copy Markdown, download .md, export standalone HTML, print to PDF, or share a link that keeps the text out of server logs.">
                  <p className="mt-8 flex flex-wrap gap-2" aria-hidden>
                    {[".md", ".html", "PDF", "Markdown + assets", "Share link"].map((label) => (
                      <span key={label} className="rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-xs">{label}</span>
                    ))}
                  </p>
                  <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><WifiOff className="h-3.5 w-3.5 text-accent" aria-hidden />Works offline as an installable app.</p>
                </FeatureCard>
              </div>
            </div>
          </section>

          <ConversionWorkflow />

          <section className="defer-paint border-t border-border px-5 py-24 sm:px-8 lg:py-28" aria-labelledby="about-title">
            <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
              <div className="reveal">
                <p className="eyebrow">In plain words</p>
                <h2 id="about-title" className="heading mt-4 text-4xl sm:text-5xl">What is Markdown Lens?</h2>
                <p className="mt-6 text-lg leading-8 text-muted-foreground">
                  Markdown Lens is a free, open-source Markdown editor that also converts documents to Markdown. You can
                  write with a live GitHub-style preview, or open a PDF, Word, PowerPoint, Excel, HTML, CSV, JSON, XML,
                  EPUB, ZIP, or image file and get editable Markdown back. Everything runs in your browser: files are not
                  uploaded, and no account is needed.
                </p>
                <Link href="/about" className="link-underline mt-6 inline-flex items-center gap-1.5">
                  About the project
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
              <dl className="reveal grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
                <AboutFact title="Who it is for">Developers writing READMEs and docs, writers who prefer plain text, and teams turning documents into clean source for wikis, Git, or AI assistants.</AboutFact>
                <AboutFact title="How it differs from online converters">Many web converters upload your file to a server. Markdown Lens parses it on your device, so confidential documents stay with you.</AboutFact>
                <AboutFact title="How it compares with command-line tools">Tools like Pandoc support more formats and options but need an install. Markdown Lens needs only a browser and shows the result next to an editor.</AboutFact>
                <AboutFact title="Price and source">
                  Free, with no sign-up or watermark. The code is{" "}
                  <a href={siteConfig.githubUrl} target="_blank" rel="noopener noreferrer" className="link-underline">public on GitHub</a>
                  , and the app can be installed to work offline.
                </AboutFact>
              </dl>
            </div>
          </section>

          <section className="defer-paint px-5 pb-24 sm:px-8 lg:pb-32" aria-labelledby="open-source-title">
            <div className="reveal relative isolate mx-auto max-w-6xl overflow-hidden rounded-3xl border border-border bg-panel px-6 py-14 text-center shadow-lift sm:px-12 sm:py-20">
              <div className="backdrop-glow !top-[-22rem]" aria-hidden />
              <div className="relative z-10 mx-auto max-w-2xl">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-highlight/30 bg-highlight/10 text-highlight">
                  <Star className="h-6 w-6 fill-current" aria-hidden />
                </span>
                <h2 id="open-source-title" className="heading mt-6 text-4xl sm:text-5xl">Open source, so you can check the claims.</h2>
                <p className="mt-5 text-lg leading-8 text-muted-foreground">
                  Read how a file becomes Markdown and what the converter will not invent. If Markdown Lens saves you
                  time, a star on GitHub helps other people find it.
                </p>
                <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <GithubStarLink variant="cta" />
                  <a href={siteConfig.githubUrl} target="_blank" rel="noopener noreferrer" aria-label="Read the source of Markdown Lens on GitHub (opens in a new tab)" className="btn-ghost h-12 px-5 text-base">
                    Read the source
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section className="defer-paint relative isolate border-t border-border px-5 py-24 text-center sm:px-8 lg:py-32">
            <div className="backdrop-grid" aria-hidden />
            <div className="reveal relative z-10 mx-auto max-w-3xl">
              <h2 className="display text-5xl sm:text-7xl">Convert a page, then edit the Markdown.</h2>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <ConvertFileButton className="btn-primary group h-14 w-full px-8 text-base sm:w-auto">
                  Convert a file
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />
                </ConvertFileButton>
                <Link href="/editor" className="btn-secondary group h-14 w-full px-8 text-base sm:w-auto">
                  Open workspace
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

function FeatureCard({
  icon: Icon,
  title,
  body,
  className = "",
  children,
}: {
  icon: typeof FileText;
  title: string;
  body: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <article className={`card card-interactive reveal flex flex-col p-6 sm:p-7 ${className}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
      <div className="mt-auto">{children}</div>
    </article>
  );
}

function AboutFact({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-panel p-6 sm:p-7">
      <dt className="font-semibold">{title}</dt>
      <dd className="mt-2 text-sm leading-6 text-muted-foreground">{children}</dd>
    </div>
  );
}
