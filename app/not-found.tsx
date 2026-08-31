import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { converterLinks } from "@/lib/site";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">
          That URL is not part of Markdown Lens. Use a converter page, the format guide, or the local editor instead.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="btn-primary h-11">
            Go to the homepage
          </Link>
          <Link href="/supported-formats" className="btn-secondary h-11">
            View supported formats
          </Link>
        </div>
        <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground" aria-label="Popular converters">
          {converterLinks.slice(0, 6).map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
      </main>
      <SiteFooter />
    </div>
  );
}
