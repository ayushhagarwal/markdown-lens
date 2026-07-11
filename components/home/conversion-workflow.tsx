"use client";

import Link from "next/link";
import { ArrowRight, FileCheck2, FileText, LockKeyhole, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
          <h2 className="text-balance text-4xl font-semibold leading-[1.1] tracking-[-0.045em] sm:text-5xl lg:text-6xl">From source to Markdown,<br className="hidden sm:block" /> without leaving your browser.</h2>
          <p className="mt-6 text-base text-muted-foreground sm:text-lg">Open a file, review what changed, then export clean Markdown.</p>
          <p className="mt-7 text-sm tracking-wide text-muted-foreground">PDF · DOCX · PPTX · XLSX · HTML · EPUB · Images</p>
          <Link href="/supported-formats" className="home-text-link group mt-4 justify-center">See format details <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></Link>
        </div>

        <div className="home-workflow-rail relative mt-16 grid gap-10 lg:grid-cols-[0.7fr_1.3fr_0.7fr] lg:items-center lg:gap-14">
          <WorkflowStage number="01" title="Open"><div className="flex -space-x-8"><SourceFile label="PDF" /><SourceFile label="DOCX" muted /><SourceFile label="HTML" muted /></div></WorkflowStage>
          <WorkflowStage number="02" title="Review"><div className="grid overflow-hidden rounded-lg border border-border bg-panel sm:grid-cols-2"><div className="border-b border-border p-4 sm:border-b-0 sm:border-r"><p className="text-xs font-semibold">Source</p><div className="mt-4 space-y-2">{["w-4/5","w-3/5","w-full","w-2/3","w-5/6"].map((width) => <span key={width} className={`block h-1.5 rounded bg-muted-foreground/35 ${width}`} />)}</div></div><div className="p-4"><p className="text-xs font-semibold">Markdown</p><div className="mt-4 space-y-2"><span className="block h-1.5 w-2/3 rounded bg-accent" /><span className="block h-1.5 w-4/5 rounded bg-muted-foreground/35" /><span className="block h-1.5 w-3/5 rounded bg-muted-foreground/35" /><span className="block h-1.5 w-full rounded bg-accent/45" /></div></div></div></WorkflowStage>
          <WorkflowStage number="03" title="Export"><div className="flex h-36 w-28 flex-col items-center justify-center rounded-lg border border-border bg-panel"><FileCheck2 className="h-9 w-9 text-accent" aria-hidden /><span className="mt-3 font-mono text-xs">report.md</span></div></WorkflowStage>
        </div>

        <div className="mt-20 grid border-y border-border/75 md:grid-cols-3">
          <Proof icon={FileText} title="Structure retained" body="Headings, lists, tables, and more—kept intact." />
          <Proof icon={TriangleAlert} title="Warnings surfaced" body="See issues and decisions before you export." divided />
          <Proof icon={LockKeyhole} title="Processed locally" body="Your files never leave your device." divided />
        </div>
      </div>
    </section>
  );
}

function WorkflowStage({ number, title, children }: { number: string; title: string; children: React.ReactNode }) { return <article className="home-workflow-stage relative"><p className="mb-6 text-lg font-semibold"><span className="mr-3 font-mono text-accent">{number}</span>{title}</p><div className="flex min-h-40 items-center justify-center">{children}</div></article>; }
function SourceFile({ label, muted = false }: { label: string; muted?: boolean }) { return <div className={`flex h-36 w-28 flex-col items-center justify-center rounded-lg border border-border bg-panel ${muted ? "opacity-40" : "relative z-10"}`}><FileText className="h-9 w-9 text-accent" aria-hidden /><span className="mt-3 font-mono text-[10px]">{label}</span></div>; }
function Proof({ icon: Icon, title, body, divided = false }: { icon: typeof FileText; title: string; body: string; divided?: boolean }) { return <div className={`flex gap-4 py-7 md:px-8 ${divided ? "border-t border-border/75 md:border-l md:border-t-0" : ""}`}><Icon className="mt-1 h-6 w-6 shrink-0 text-accent" aria-hidden /><div><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p></div></div>; }
