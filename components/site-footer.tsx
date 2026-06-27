import Link from "next/link";
import { Eye, Github } from "lucide-react";
import { siteConfig } from "@/lib/site";

const footerLinks = [
  {
    title: "Convert",
    links: [
      { href: "/pdf-to-markdown", label: "PDF to Markdown" },
      { href: "/word-to-markdown", label: "Word to Markdown" },
      { href: "/editor", label: "Open the editor" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/markdown-cheatsheet", label: "Markdown cheatsheet" },
      { href: "/llms.txt", label: "AI-readable summary" },
      { href: siteConfig.githubUrl, label: "Source on GitHub", external: true },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border/75 bg-surface">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1fr_auto_auto] lg:px-8">
        <div className="max-w-md">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded-md font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-panel text-accent shadow-sm">
              <Eye className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <span>Markdown Lens</span>
          </Link>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Free, open-source document-to-Markdown conversion and Markdown preview. Your files are
            processed locally in your browser.
          </p>
          <a
            href={siteConfig.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Github className="h-4 w-4" aria-hidden />
            Free and open source
          </a>
        </div>

        {footerLinks.map((group) => (
          <nav key={group.title} aria-label={`${group.title} links`} className="min-w-40">
            <h2 className="text-sm font-semibold">{group.title}</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {group.links.map((link) => (
                <li key={link.href}>
                  {"external" in link && link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="transition hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="transition hover:text-foreground">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}
