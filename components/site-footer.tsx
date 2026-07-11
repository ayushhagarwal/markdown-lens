import Link from "next/link";
import { BrandIcon } from "@/components/brand-icon";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/75 bg-surface">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 text-sm sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2.5 font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <BrandIcon className="h-8 w-8" />
          Markdown Lens
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
  );
}
