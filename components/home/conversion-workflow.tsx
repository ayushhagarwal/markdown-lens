"use client";

import Link from "next/link";
import { ArrowRight, FileText, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { sampleHandbookLines, sampleHandbookMarkdown } from "@/lib/sample-conversion";
import { converterLinks } from "@/lib/site";

export function ConversionWorkflow() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.2 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={`home-workflow border-t border-border/70 px-5 py-24 sm:px-8 lg:py-36 ${visible ? "is-visible" : ""}`}>
      <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-4xl font-semibold leading-[1.1] tracking-[-0.045em] sm:text-5xl lg:text-6xl">From a PDF page to Markdown you can edit.</h2>
          <p className="mt-6 text-base text-muted-foreground sm:text-lg">The page on the left is the sample handbook. The text on the right is the Markdown this converter writes.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-x-3 gap-y-2 text-sm tracking-wide text-muted-foreground">
            {converterLinks.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-sm transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                {link.label}
              </Link>
            ))}
          </div>
          <Link href="/supported-formats" className="home-text-link group mt-4 justify-center">See format details <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></Link>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-2" role="region" aria-label="Sample conversion">
          <figure className="overflow-hidden rounded-xl border border-border bg-panel shadow-sm">
            <figcaption className="border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">PDF page</figcaption>
            <div className="min-h-72 bg-[#f7f4ee] px-8 py-10 text-[#1c1915] sm:px-10">
              <p className="text-2xl font-semibold tracking-tight">{sampleHandbookLines[0]}</p>
              <p className="mt-8 text-sm font-semibold">{sampleHandbookLines[1]}</p>
              <p className="mt-3 text-sm leading-6">{sampleHandbookLines[2]}</p>
            </div>
          </figure>
          <figure className="overflow-hidden rounded-xl border border-border bg-panel shadow-sm">
            <figcaption className="border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Markdown</figcaption>
            <pre tabIndex={0} className="min-h-72 overflow-x-auto whitespace-pre-wrap p-6 font-mono text-sm leading-7 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-8">{sampleHandbookMarkdown}</pre>
          </figure>
        </div>

        <div className="mt-20 grid border-y border-border/75 md:grid-cols-2">
          <Proof icon={FileText} title="Structure retained" body="Headings, lists, tables, and more—kept intact." />
          <Proof icon={TriangleAlert} title="Warnings surfaced" body="See issues and decisions before you export." divided />
        </div>
      </div>
    </section>
  );
}

function Proof({ icon: Icon, title, body, divided = false }: { icon: typeof FileText; title: string; body: string; divided?: boolean }) { return <div className={`flex gap-4 py-7 md:px-8 ${divided ? "border-t border-border/75 md:border-l md:border-t-0" : ""}`}><Icon className="mt-1 h-6 w-6 shrink-0 text-accent" aria-hidden /><div><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p></div></div>; }
