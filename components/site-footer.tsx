import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { GithubStarLink } from "@/components/github-star-link";
import { converterLinks, moreApps, siteConfig } from "@/lib/site";

const footerLinkClassName = "rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

function ExternalFooterLink({ href, label, children }: { href: string; label: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} (opens in a new tab)`} className={footerLinkClassName}>
      {children}
    </a>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 text-sm sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2.5 rounded-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <BrandIcon className="h-8 w-8" />
              Markdown Lens
            </Link>
            <p className="mt-4 leading-6 text-muted-foreground">
              A free, open-source Markdown editor and document converter that runs entirely in your browser.
            </p>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              No uploads. No accounts. No analytics.
            </p>
            <GithubStarLink variant="button" className="mt-6 focus-visible:ring-2">Star</GithubStarLink>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <nav aria-label="Document converters">
              <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-foreground">Converters</h2>
              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-muted-foreground sm:grid-cols-1 lg:grid-cols-2">
                {converterLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={footerLinkClassName}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Footer navigation">
              <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-foreground">Product</h2>
              <ul className="mt-4 grid gap-2.5 text-muted-foreground">
                <li><Link href="/editor" className={footerLinkClassName}>Editor</Link></li>
                <li><Link href="/supported-formats" className={footerLinkClassName}>Formats</Link></li>
                <li><Link href="/markdown-cheatsheet" className={footerLinkClassName}>Guide</Link></li>
                <li><Link href="/about" className={footerLinkClassName}>About</Link></li>
                <li><Link href="/about#contact" className={footerLinkClassName}>Contact</Link></li>
                <li><Link href="/privacy" className={footerLinkClassName}>Privacy</Link></li>
              </ul>
            </nav>
            <nav aria-label="Open source">
              <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-foreground">Open source</h2>
              <ul className="mt-4 grid gap-2.5 text-muted-foreground">
                <li><ExternalFooterLink href={`${siteConfig.githubUrl}/blob/main/CHANGELOG.md`} label="Read the changelog on GitHub">Changelog</ExternalFooterLink></li>
                <li><ExternalFooterLink href={`${siteConfig.githubUrl}/blob/main/CONTRIBUTING.md`} label="Contribute: read the guidelines on GitHub">Contribute</ExternalFooterLink></li>
                <li><ExternalFooterLink href={`${siteConfig.githubUrl}/blob/main/SECURITY.md`} label="Read security policy on GitHub">Security</ExternalFooterLink></li>
                <li><ExternalFooterLink href={`${siteConfig.githubUrl}/issues/new?template=bug_report.yml`} label="Report a bug">Report a bug</ExternalFooterLink></li>
                <li><ExternalFooterLink href={`${siteConfig.githubUrl}/issues/new?template=feature_request.yml`} label="Request a feature">Request a feature</ExternalFooterLink></li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-6 text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            Built locally. Shared openly.{" "}
            <ExternalFooterLink href={siteConfig.githubUrl} label="If it helped, star the source.">If it helped, star the source.</ExternalFooterLink>
          </p>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 text-xs">
            <span>More apps</span>
            <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="More apps">
              {moreApps.map((app) => (
                <a key={app.href} href={app.href} rel="noopener" className={footerLinkClassName}>
                  {app.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
