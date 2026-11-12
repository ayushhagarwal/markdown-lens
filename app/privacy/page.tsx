import type { Metadata } from "next";
import Link from "next/link";
import { CloudOff, EyeOff, UserX } from "lucide-react";
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

const glance = [
  { icon: CloudOff, label: "No uploads" },
  { icon: UserX, label: "No accounts" },
  { icon: EyeOff, label: "No analytics" },
] as const;

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
        <div className="relative isolate">
          <div className="backdrop-grid" aria-hidden />
          <div className="backdrop-glow" aria-hidden />
          <header className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-4 pt-16 sm:px-6 sm:pt-24 lg:px-8">
            <p className="eyebrow rise-in">Privacy</p>
            <h1 className="display mt-5 text-4xl sm:text-5xl lg:text-6xl">Privacy policy</h1>
            <p className="rise-in mt-6 text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9" style={{ "--i": 1 } as React.CSSProperties}>
              {privacySummary}
            </p>
            <p className="rise-in mt-4 font-mono text-xs text-muted-foreground" style={{ "--i": 2 } as React.CSSProperties}>
              Last updated <time dateTime={modified}>{formatDate(modified)}</time>
            </p>
            <ul className="rise-in mt-10 grid gap-3 sm:grid-cols-3" aria-label="At a glance" style={{ "--i": 3 } as React.CSSProperties}>
              {glance.map(({ icon: Icon, label }) => (
                <li key={label} className="card flex items-center gap-3 px-4 py-3.5 text-sm font-medium">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </header>
        </div>

        <article className="mx-auto w-full max-w-3xl px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
          <div className="mt-14">
            {privacySections.map((section, index) => (
              <div key={section.heading} className={index > 0 ? "defer-paint [contain-intrinsic-size:auto_240px]" : undefined}>
                <section className="grid gap-x-8 gap-y-3 border-t border-border py-10 sm:grid-cols-[3rem_1fr]">
                  <span className="font-mono text-xs font-medium tracking-[0.18em] text-accent sm:pt-2" aria-hidden>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h2 className="heading text-2xl sm:text-3xl">{section.heading}</h2>
                    {section.body.map((paragraph) => (
                      <p key={paragraph} className="mt-4 leading-8 text-muted-foreground">{paragraph}</p>
                    ))}
                  </div>
                </section>
              </div>
            ))}
          </div>
          <div className="card p-6 sm:p-7">
            <p className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
              <a href={siteConfig.githubUrl} target="_blank" rel="noopener noreferrer" className="link-underline">
                Read the source on GitHub
              </a>
              <a href={`${siteConfig.githubUrl}/blob/main/SECURITY.md`} target="_blank" rel="noopener noreferrer" className="link-underline">
                Security policy
              </a>
              <Link href="/about" className="link-underline">About and contact</Link>
            </p>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
