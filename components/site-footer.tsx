import Link from "next/link";
import { BrandIcon } from "@/components/brand-icon";
import { GithubStarLink } from "@/components/github-star-link";
import { converterLinks, siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/75 bg-surface">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 text-sm sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <BrandIcon className="h-8 w-8" />
            Markdown Lens
          </Link>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-muted-foreground" aria-label="Footer navigation">
            <Link href="/supported-formats" className="transition hover:text-foreground">Formats</Link>
            <Link href="/markdown-cheatsheet" className="transition hover:text-foreground">Guide</Link>
            <a href={`${siteConfig.githubUrl}/blob/main/SECURITY.md`} className="transition hover:text-foreground">Security</a>
            <GithubStarLink variant="text" className="transition hover:text-foreground">Star</GithubStarLink>
          </nav>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-muted-foreground" aria-label="Document converters">
          {converterLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-muted-foreground">
          Built locally. Shared openly.{" "}
          <a href={siteConfig.githubUrl} target="_blank" rel="noreferrer" className="transition hover:text-foreground">
            If it helped, star the source.
          </a>
        </p>
      </div>
    </footer>
  );
}
