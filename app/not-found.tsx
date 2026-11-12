import type { Metadata } from "next";
import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { converterLinks } from "@/lib/site";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The requested Markdown Lens page could not be found.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main id="main" className="relative isolate flex flex-1 items-center overflow-hidden">
        <div className="backdrop-grid" aria-hidden />
        <div className="backdrop-glow" aria-hidden />
        <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8">
          <span className="rise-in flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-panel text-accent shadow-soft">
            <FileQuestion className="h-6 w-6" aria-hidden />
          </span>
          <p className="eyebrow rise-in mt-7" style={{ "--i": 1 } as React.CSSProperties}>404</p>
          <h1 className="display mt-4 text-4xl sm:text-5xl lg:text-6xl">Page not found</h1>
          <p className="rise-in mt-5 max-w-xl text-pretty text-lg leading-8 text-muted-foreground" style={{ "--i": 2 } as React.CSSProperties}>
            That URL is not part of Markdown Lens. Use a converter page, the format guide, or the local editor instead.
          </p>
          <div className="rise-in mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row" style={{ "--i": 3 } as React.CSSProperties}>
            <Link href="/" className="btn-primary h-11">
              Go to the homepage
            </Link>
            <Link href="/supported-formats" className="btn-secondary h-11">
              View supported formats
            </Link>
          </div>
          <nav className="rise-in mt-10 flex flex-wrap justify-center gap-2" aria-label="Popular converters" style={{ "--i": 4 } as React.CSSProperties}>
            {converterLinks.slice(0, 6).map((link) => (
              <Link key={link.href} href={link.href} className="chip transition-colors hover:border-foreground/25 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
