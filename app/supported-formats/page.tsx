import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, CircleAlert, LockKeyhole } from "lucide-react";
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
        <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Supported Markdown and document formats</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">Markdown Lens opens, converts, edits, and exports common technical-document formats entirely in your browser. This matrix distinguishes direct support from structural conversion and clearly identifies content that needs review.</p>
          <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><LockKeyhole aria-hidden="true" className="h-4 w-4 text-accent" />No account, analytics, or document upload.</p>
          <ul className="mt-10 grid gap-4 md:hidden" role="list" aria-label="Supported formats">
            {supportedFormats.map(([format, extensions, workflow, limitation, href]) => (
              <li key={format} className="border border-border bg-panel p-5">
                <Link href={href} className="rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{format}</Link>
                <p className="mt-2 font-mono text-xs text-accent">{extensions}</p>
                <p className="mt-3 flex items-center gap-2 text-sm"><Check className="h-4 w-4 shrink-0 text-accent" aria-hidden />{workflow}</p>
                <p className="mt-2 text-sm text-muted-foreground">{limitation}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10 hidden overflow-x-auto border border-border md:block">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <caption className="sr-only">Supported formats, their extensions, conversion workflow, and main limitation</caption>
              <thead className="bg-surface"><tr>{["Format", "Extensions", "Workflow", "Important limitation"].map((label) => <th key={label} className="border-b border-border px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
              <tbody>
                {supportedFormats.map(([format, extensions, workflow, limitation, href]) => (
                  <tr key={format} className="border-b border-border last:border-0">
                    <td className="px-4 py-4 font-medium">
                      <Link href={href} className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{format}</Link>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-accent">{extensions}</td>
                    <td className="px-4 py-4"><span className="inline-flex items-center gap-2"><Check aria-hidden="true" className="h-4 w-4 text-accent" />{workflow}</span></td>
                    <td className="px-4 py-4 text-muted-foreground">{limitation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <div className="border border-border bg-panel p-6"><h2 className="text-xl font-semibold">Designed for review</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Every conversion opens in the editable workspace with a rendered preview, document outline, warnings, statistics, and asset-aware export.</p></div>
            <div className="border border-border bg-panel p-6"><h2 className="flex items-center gap-2 text-xl font-semibold"><CircleAlert aria-hidden="true" className="h-5 w-5 text-accent" />Legacy formats</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Binary DOC, PPT, and XLS files require export to DOCX, PPTX, or XLSX. This avoids unsafe or abandoned parsing dependencies.</p></div>
          </div>
          <Link href="/editor" className="btn-primary mt-10">Open the workspace <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
