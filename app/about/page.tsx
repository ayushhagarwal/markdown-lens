import type { Metadata } from "next";
import Link from "next/link";
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
        <article className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">About Markdown Lens</h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Markdown Lens is a free, open-source Markdown editor and document-to-Markdown converter that runs entirely in
            your browser. It is built and maintained by{" "}
            <a href={siteConfig.author.url} target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-4 hover:underline">
              {siteConfig.author.name}
            </a>
            .
          </p>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold tracking-tight">Why it exists</h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Most online converters ask you to upload a document to someone else’s server before you get Markdown back.
              That is a poor fit for contracts, internal specs, and unpublished writing. Markdown Lens does the conversion
              on your device instead, then opens the result next to an editor and a GitHub-style preview so you can check
              and fix it before you use it.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold tracking-tight">What it does</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-muted-foreground">
              <li>Converts PDF, Word, PowerPoint, Excel, HTML, CSV, JSON, XML, EPUB, ZIP, and image files to Markdown.</li>
              <li>Edits Markdown with a live preview that renders GitHub-flavored Markdown, Mermaid diagrams, and math.</li>
              <li>Keeps documents in a local workspace and works offline once installed.</li>
            </ul>
            <p className="mt-4 text-sm">
              <Link href="/supported-formats" className="font-medium text-accent underline-offset-4 hover:underline">See every supported format and its limits</Link>
              {" · "}
              <Link href="/privacy" className="font-medium text-accent underline-offset-4 hover:underline">Read the privacy policy</Link>
            </p>
          </section>

          <section id="contact" className="mt-12 scroll-mt-20" aria-labelledby="contact-heading">
            <h2 id="contact-heading" className="text-2xl font-semibold tracking-tight">Contact</h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Markdown Lens is developed in the open on GitHub, and that is the best way to get in touch.
            </p>
            <ul className="mt-6 divide-y divide-border border-y border-border">
              {contactLinks.map((link) => (
                <li key={link.href} className="py-4">
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline-offset-4 hover:underline">
                    {link.label}
                  </a>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{link.description}</p>
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
