import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { GithubStarLink } from "@/components/github-star-link";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function Breadcrumb({ current }: { current: string }) {
  return (
    <nav className="mx-auto w-full max-w-7xl px-4 pt-6 text-sm text-muted-foreground sm:px-6 lg:px-8" aria-label="Breadcrumb">
      <Link href="/" className={`rounded-sm transition-colors hover:text-foreground ${focusRing}`}>Home</Link>
      <span className="mx-2 text-border" aria-hidden="true">/</span>
      <span aria-current="page" className="text-foreground">{current}</span>
    </nav>
  );
}

export function SectionHeader({ eyebrow, title, intro, id }: { eyebrow?: string; title: string; intro?: string; id?: string }) {
  return (
    <div className="reveal max-w-2xl">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 id={id} className={`heading text-3xl sm:text-4xl ${eyebrow ? "mt-3" : ""}`}>{title}</h2>
      {intro ? <p className="mt-4 leading-7 text-muted-foreground">{intro}</p> : null}
    </div>
  );
}

/** FAQ accordion. Native <details>, so it works without JavaScript. */
export function FaqList({ items }: { items: readonly { question: string; answer: string }[] }) {
  return (
    <div className="reveal divide-y divide-border overflow-hidden rounded-2xl border border-border bg-panel">
      {items.map((item) => (
        <details key={item.question} className="group">
          <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 font-medium transition-colors hover:bg-muted/60 sm:px-6 ${focusRing} focus-visible:ring-inset focus-visible:ring-offset-0`}>
            {item.question}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-base font-light leading-none text-muted-foreground transition-transform duration-300 group-open:rotate-45" aria-hidden>
              +
            </span>
          </summary>
          <p className="max-w-3xl px-5 pb-6 text-sm leading-7 text-muted-foreground sm:px-6">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function RelatedTools({ related }: { related: readonly { href: string; title: string; description: string }[] }) {
  return (
    <section className="defer-paint border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeader eyebrow="Keep exploring" title="Related Markdown tools" />
          <div className="flex flex-col gap-3 self-start sm:flex-row md:self-auto">
            <Link href="/editor" className="btn-primary h-11">
              Open the editor
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <GithubStarLink variant="button" />
          </div>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {related.map((item) => (
            <Link key={item.href} href={item.href} className={`card card-interactive reveal group p-6 ${focusRing}`}>
              <span className="flex items-center justify-between gap-3 font-semibold">
                {item.title}
                <ArrowRight aria-hidden="true" className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
              </span>
              <span className="mt-2 block text-sm leading-6 text-muted-foreground">{item.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Dashed drop target shown beside converter heroes. The whole page accepts drops; this makes that obvious. */
export function DropTarget({ title, hint, children }: { title: string; hint: string; children?: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-3 -z-10 rounded-[2.5rem] bg-accent/10 blur-3xl sm:-inset-6" aria-hidden />
      <div className="card p-2">
        <div className="rounded-xl border border-dashed border-accent/45 bg-accent-soft/30 px-6 py-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-panel text-accent shadow-soft">
            <Plus className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-4 font-semibold">{title}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{hint}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Steps({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="space-y-4 p-5">
      {steps.map((step, index) => (
        <li key={step} className="flex gap-4 text-sm leading-6">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-xs font-semibold text-accent">{index + 1}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}
