import Link from "next/link";
import { BrandIcon } from "@/components/brand-icon";
import { GithubStarLink } from "@/components/github-star-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { primaryNav } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="border-b border-border/75 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-md font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        >
          <BrandIcon className="h-9 w-9 shadow-sm" priority />
          <span>Markdown Lens</span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Main navigation">
          {primaryNav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:inline-flex"
            >
              {link.label}
            </Link>
          ))}
          <GithubStarLink variant="nav" className="h-10" />
          <ThemeToggle />
          <Link
            href="/editor"
            className="ml-1 hidden h-10 items-center rounded-md border border-accent px-4 text-sm font-semibold text-accent transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
          >
            Open workspace
          </Link>
        </nav>
      </div>
    </header>
  );
}
