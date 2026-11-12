import Link from "next/link";
import { ArrowRight, FileText, TriangleAlert } from "lucide-react";
import { sampleHandbookLines, sampleHandbookMarkdown } from "@/lib/sample-conversion";
import { converterLinks } from "@/lib/site";

// Server component: the sample Markdown is produced by the real PDF converter
// at build time, so none of that code ships to the homepage bundle.
export function ConversionWorkflow() {
  return (
    <section className="defer-paint border-t border-border bg-surface px-5 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto w-full max-w-6xl">
        <div className="reveal mx-auto max-w-3xl text-center">
          <p className="eyebrow">See a real conversion</p>
          <h2 className="heading mt-4 text-4xl sm:text-5xl lg:text-6xl">From a PDF page to Markdown you can edit.</h2>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">The page on the left is the sample handbook. The text on the right is the Markdown this converter writes.</p>
        </div>

        <div className="reveal relative mt-14 grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center" role="region" aria-label="Sample conversion">
          <figure className="window">
            <figcaption className="window-bar text-xs font-medium text-muted-foreground">
              <span className="window-dots" aria-hidden><i /><i /><i /></span>
              sample-handbook.pdf
            </figcaption>
            <div className="min-h-72 bg-[#f7f4ee] px-8 py-10 text-[#1c1915] sm:px-10">
              <p className="text-2xl font-semibold tracking-tight">{sampleHandbookLines[0]}</p>
              <p className="mt-8 text-sm font-semibold">{sampleHandbookLines[1]}</p>
              <p className="mt-3 text-sm leading-6">{sampleHandbookLines[2]}</p>
            </div>
          </figure>
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-border bg-panel text-accent shadow-soft max-lg:rotate-90" aria-hidden>
            <ArrowRight className="h-5 w-5" />
          </span>
          <figure className="window">
            <figcaption className="window-bar text-xs font-medium text-muted-foreground">
              <span className="window-dots" aria-hidden><i /><i /><i /></span>
              sample-handbook.md
            </figcaption>
            <pre tabIndex={0} className="min-h-72 overflow-x-auto whitespace-pre-wrap p-6 font-mono text-sm leading-7 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-8">{sampleHandbookMarkdown}</pre>
          </figure>
        </div>

        <div className="reveal mt-10 grid gap-4 md:grid-cols-2">
          <Proof icon={FileText} title="Structure retained" body="Headings, lists, tables, and links come out as Markdown you can edit." />
          <Proof icon={TriangleAlert} title="Warnings surfaced" body="Anything the converter skipped or guessed is listed before you export." />
        </div>

        <div className="reveal mt-14 text-center">
          <p className="text-sm text-muted-foreground">Converters for every format, each with its limits written down.</p>
          <div className="marquee mt-5 overflow-hidden">
            <div className="marquee-track gap-2">
              {[false, true].map((duplicate) => (
                <div key={String(duplicate)} className="flex gap-2 pr-2" aria-hidden={duplicate || undefined}>
                  {converterLinks.map((link) => (
                    <Link key={link.href} href={link.href} tabIndex={duplicate ? -1 : undefined} className="chip whitespace-nowrap px-4 py-2 text-sm transition-colors hover:border-foreground/25 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {link.label} to Markdown
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <Link href="/supported-formats" className="link-underline group mt-6 inline-flex items-center gap-1.5 text-sm">
            See format details
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Proof({ icon: Icon, title, body }: { icon: typeof FileText; title: string; body: string }) {
  return (
    <div className="card flex gap-4 p-6">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon className="h-5 w-5" aria-hidden /></span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
