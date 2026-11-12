import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { pageMetadata } from "@/lib/seo";
import { modifiedFor, siteConfig } from "@/lib/site";

const path = "/about";

export const metadata: Metadata = pageMetadata({
  title: "About Markdown Lens and Contact",
  description:
    "Who builds Markdown Lens, why it converts documents in your browser instead of on a server, and how to report a bug, request a feature, or get in touch.",
  path,
});

const contactLinks = [
  {
    href: `${siteConfig.githubUrl}/issues/new?template=bug_report.yml`,
    label: "Report a bug",
    description: "Something converted wrongly or the editor misbehaved. Attach a sample file only if it contains nothing private.",
  },
  {
    href: `${siteConfig.githubUrl}/issues/new?template=feature_request.yml`,
    label: "Request a feature",
    description: "A format, export option, or workflow you would like Markdown Lens to support.",
  },
  {
    href: `${siteConfig.githubUrl}/blob/main/SECURITY.md`,
    label: "Report a security issue",
    description: "Follow the security policy to report a vulnerability privately rather than in a public issue.",
  },
  {
    href: `${siteConfig.githubUrl}/blob/main/CONTRIBUTING.md`,
    label: "Contribute",
    description: "Read the contribution guide before opening a pull request.",
  },
] as const;

export default function AboutPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": ["AboutPage", "ContactPage"],
      "@id": `${siteConfig.url}${path}/#webpage`,
      url: `${siteConfig.url}${path}`,
      name: "About Markdown Lens",
      isPartOf: { "@id": `${siteConfig.url}/#website` },
      about: { "@id": `${siteConfig.url}/#software` },
      author: { "@id": siteConfig.author.id },
      dateModified: modifiedFor(path),
      inLanguage: "en",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: siteConfig.name, item: siteConfig.url },
        { "@type": "ListItem", position: 2, name: "About", item: `${siteConfig.url}${path}` },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <SiteHeader />
      <main id="main">
        <div className="relative isolate">
          <div className="backdrop-grid" aria-hidden />
          <div className="backdrop-glow" aria-hidden />
          <header className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-4 pt-16 sm:px-6 sm:pt-24 lg:px-8">
            <p className="eyebrow rise-in">About</p>
            <h1 className="display mt-5 text-4xl sm:text-5xl lg:text-6xl">About Markdown Lens</h1>
            <p className="rise-in mt-6 text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9" style={{ "--i": 1 } as React.CSSProperties}>
              Markdown Lens is a free, open-source Markdown editor and document-to-Markdown converter that runs entirely in
              your browser. It is built and maintained by{" "}
              <a href={siteConfig.author.url} target="_blank" rel="noopener noreferrer" className="link-underline">
                {siteConfig.author.name}
              </a>
              .
            </p>
          </header>
        </div>

        <article className="mx-auto w-full max-w-3xl px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
          <section className="mt-14 border-t border-border pt-10">
            <h2 className="heading text-2xl sm:text-3xl">Why it exists</h2>
            <p className="mt-4 leading-8 text-muted-foreground">
              Most online converters ask you to upload a document to someone else’s server before you get Markdown back.
              That is a poor fit for contracts, internal specs, and unpublished writing. Markdown Lens does the conversion
              on your device instead, then opens the result next to an editor and a GitHub-style preview so you can check
              and fix it before you use it.
            </p>
          </section>

          <section className="mt-14 border-t border-border pt-10">
            <h2 className="heading text-2xl sm:text-3xl">What it does</h2>
            <ul className="mt-6 space-y-4 leading-7 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><Check className="h-3 w-3" aria-hidden /></span>
                <span>Converts PDF, Word, PowerPoint, Excel, HTML, CSV, JSON, XML, EPUB, ZIP, and image files to Markdown.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><Check className="h-3 w-3" aria-hidden /></span>
                <span>Edits Markdown with a live preview that renders GitHub-flavored Markdown, Mermaid diagrams, and math.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><Check className="h-3 w-3" aria-hidden /></span>
                <span>Keeps documents in a local workspace and works offline once installed.</span>
              </li>
            </ul>
            <p className="mt-6 flex flex-wrap gap-x-2 gap-y-2 text-sm">
              <Link href="/supported-formats" className="link-underline">See every supported format and its limits</Link>
              <span className="text-muted-foreground" aria-hidden>{" · "}</span>
              <Link href="/privacy" className="link-underline">Read the privacy policy</Link>
            </p>
          </section>

          <section id="contact" className="mt-14 scroll-mt-20 border-t border-border pt-10" aria-labelledby="contact-heading">
            <h2 id="contact-heading" className="heading text-2xl sm:text-3xl">Contact</h2>
            <p className="mt-4 leading-8 text-muted-foreground">
              Markdown Lens is developed in the open on GitHub, and that is the best way to get in touch.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {contactLinks.map((link) => (
                <li key={link.href} className="card card-interactive group relative flex flex-col p-6 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 font-semibold tracking-tight after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none"
                  >
                    {link.label}
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden />
                  </a>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{link.description}</p>
                </li>
              ))}
            </ul>
          </section>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
