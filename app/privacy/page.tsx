import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { pageMetadata } from "@/lib/seo";
import { privacySections, privacySummary } from "@/lib/privacy";
import { modifiedFor, siteConfig } from "@/lib/site";

const path = "/privacy";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How Markdown Lens handles your data: files are converted in your browser and never uploaded, with no accounts or analytics. Drafts stay on your device.",
  path,
});

export default function PrivacyPage() {
  const modified = modifiedFor(path);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${siteConfig.url}${path}/#webpage`,
      url: `${siteConfig.url}${path}`,
      name: "Markdown Lens privacy policy",
      isPartOf: { "@id": `${siteConfig.url}/#website` },
      about: { "@id": `${siteConfig.url}/#software` },
      dateModified: modified,
      inLanguage: "en",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: siteConfig.name, item: siteConfig.url },
        { "@type": "ListItem", position: 2, name: "Privacy policy", item: `${siteConfig.url}${path}` },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <SiteHeader />
      <main id="main">
        <article className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Privacy policy</h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            {privacySummary}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated <time dateTime={modified}>{formatDate(modified)}</time>
          </p>
          {privacySections.map((section) => (
            <section key={section.heading} className="mt-12">
              <h2 className="text-2xl font-semibold tracking-tight">{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-4 leading-7 text-muted-foreground">{paragraph}</p>
              ))}
            </section>
          ))}
          <p className="mt-12 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <a href={siteConfig.githubUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline-offset-4 hover:underline">
              Read the source on GitHub
            </a>
            <a href={`${siteConfig.githubUrl}/blob/main/SECURITY.md`} target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline-offset-4 hover:underline">
              Security policy
            </a>
            <Link href="/about" className="font-medium text-accent underline-offset-4 hover:underline">About and contact</Link>
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
