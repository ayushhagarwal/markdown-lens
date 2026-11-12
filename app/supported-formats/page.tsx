import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, CircleAlert, Eye, LockKeyhole } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { pageMetadata } from "@/lib/seo";
import { modifiedFor, siteConfig } from "@/lib/site";
import { supportedFormats } from "@/lib/supported-formats";

export const metadata: Metadata = pageMetadata({
  title: "Supported Document and Markdown Formats",
  description:
    "Compare the local PDF, DOCX, PPTX, XLSX, HTML, CSV, JSON, XML, EPUB, ZIP, image OCR, and Markdown workflows supported by Markdown Lens.",
  path: "/supported-formats",
});

export default function SupportedFormatsPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${siteConfig.url}/supported-formats/#webpage`,
      url: `${siteConfig.url}/supported-formats`,
      name: "Supported Markdown and document formats",
      description: "Every local document-to-Markdown workflow in Markdown Lens, with its file extensions and main limitation.",
      isPartOf: { "@id": `${siteConfig.url}/#website` },
      about: { "@id": `${siteConfig.url}/#software` },
      dateModified: modifiedFor("/supported-formats"),
      inLanguage: "en",
      mainEntity: {
        "@type": "ItemList",
        name: "Markdown Lens converters",
        numberOfItems: supportedFormats.length,
        itemListElement: supportedFormats.map(([format, extensions, , , href], index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: `${format} (${extensions})`,
          url: `${siteConfig.url}${href}`,
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: siteConfig.name, item: siteConfig.url },
        { "@type": "ListItem", position: 2, name: "Supported formats", item: `${siteConfig.url}/supported-formats` },
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
          <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-12 pt-16 sm:px-6 sm:pb-16 sm:pt-24 lg:px-8">
            <p className="eyebrow rise-in">Format matrix</p>
            <h1 className="display mt-5 max-w-4xl text-4xl sm:text-5xl lg:text-6xl">Supported Markdown and document formats</h1>
            <p className="rise-in mt-6 max-w-3xl text-lg leading-8 text-muted-foreground" style={{ "--i": 1 } as React.CSSProperties}>Markdown Lens opens, converts, edits, and exports common technical-document formats entirely in your browser. This matrix distinguishes direct support from structural conversion and clearly identifies content that needs review.</p>
            <p className="chip rise-in mt-6" style={{ "--i": 2 } as React.CSSProperties}><LockKeyhole aria-hidden="true" className="h-3.5 w-3.5 text-accent" />No account, analytics, or document upload.</p>
          </section>
        </div>

        <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
          <ul className="grid gap-3 md:hidden" role="list" aria-label="Supported formats">
            {supportedFormats.map(([format, extensions, workflow, limitation, href]) => (
              <li key={format} className="card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <Link href={href} className="link-underline text-base focus-visible:ring-2">{format}</Link>
                  <p className="font-mono text-[11px] tracking-wide text-accent">{extensions}</p>
                </div>
                <p className="mt-4 flex items-center gap-2.5 text-sm font-medium">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><Check className="h-3 w-3" aria-hidden /></span>
                  {workflow}
                </p>
                <p className="mt-3 border-t border-border pt-3 text-sm leading-6 text-muted-foreground">{limitation}</p>
              </li>
            ))}
          </ul>
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <caption className="sr-only">Supported formats, their extensions, conversion workflow, and main limitation</caption>
              <thead className="bg-surface"><tr>{["Format", "Extensions", "Workflow", "Important limitation"].map((label) => <th key={label} className="border-b border-border px-5 py-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</th>)}</tr></thead>
              <tbody>
                {supportedFormats.map(([format, extensions, workflow, limitation, href]) => (
                  <tr key={format} className="border-b border-border transition-colors last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-4 font-medium">
                      <Link href={href} className="rounded-sm underline decoration-border underline-offset-4 transition-colors hover:text-accent hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">{format}</Link>
                    </td>
                    <td className="px-5 py-4"><span className="rounded-md bg-accent-soft/60 px-2 py-1 font-mono text-[11px] text-accent">{extensions}</span></td>
                    <td className="px-5 py-4"><span className="inline-flex items-center gap-2.5"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><Check aria-hidden="true" className="h-3 w-3" /></span>{workflow}</span></td>
                    <td className="px-5 py-4 leading-6 text-muted-foreground">{limitation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="defer-paint border-t border-border bg-surface">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="card reveal p-6 sm:p-8">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Eye aria-hidden="true" className="h-5 w-5" /></span>
                <h2 className="heading mt-5 text-2xl">Designed for review</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">Every conversion opens in the editable workspace with a rendered preview, document outline, warnings, statistics, and asset-aware export.</p>
              </div>
              <div className="card reveal p-6 sm:p-8">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><CircleAlert aria-hidden="true" className="h-5 w-5" /></span>
                <h2 className="heading mt-5 text-2xl">Legacy formats</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">Binary DOC, PPT, and XLS files require export to DOCX, PPTX, or XLSX. This avoids unsafe or abandoned parsing dependencies.</p>
              </div>
            </div>
            <div className="mt-10 flex justify-center">
              <Link href="/editor" className="btn-primary group">Open the workspace <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
