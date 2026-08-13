import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, CircleAlert, LockKeyhole } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Supported Document and Markdown Formats",
  description:
    "Compare the local PDF, DOCX, PPTX, XLSX, HTML, CSV, JSON, XML, EPUB, ZIP, image OCR, and Markdown workflows supported by Markdown Lens.",
  path: "/supported-formats",
});

const formats = [
  ["Markdown / text", "MD, MARKDOWN, TXT", "Open directly", "Source content is retained.", "/editor"],
  ["PDF", "PDF", "Text and layout inference", "Scans require local OCR; complex layout needs review.", "/pdf-to-markdown"],
  ["Word", "DOCX", "Structured conversion", "Images become local assets; legacy DOC is unsupported.", "/word-to-markdown"],
  ["PowerPoint", "PPTX", "Slide-by-slide conversion", "Animations and exact object placement are omitted.", "/pptx-to-markdown"],
  ["Excel", "XLSX", "Visible sheets to tables", "Macros, charts, and legacy XLS are unsupported.", "/excel-to-markdown"],
  ["HTML", "HTML, HTM", "Reading-order conversion", "Styling and interactive behavior are flattened.", "/html-to-markdown"],
  ["EPUB", "EPUB", "Chapter conversion", "DRM-protected and fixed-layout books are unsupported or flattened.", "/epub-to-markdown"],
  ["CSV / TSV", "CSV, TSV", "Tables from delimited text", "Merged cells and spreadsheet formatting are not represented.", "/csv-to-markdown"],
  ["JSON", "JSON", "Pretty-printed fenced text", "Invalid JSON is rejected; nested data is not tabulated.", "/json-to-markdown"],
  ["XML", "XML", "Validated fenced text", "Invalid XML is rejected; remote DTDs are not fetched.", "/xml-to-markdown"],
  ["Images", "PNG, JPG, WEBP, BMP", "Asset import + optional English OCR", "OCR does not interpret charts or diagrams.", "/image-to-markdown"],
  ["Archives", "ZIP", "Bounded supported-entry import", "100 entries, one nesting level, 128 MB expanded limit.", "/zip-to-markdown"],
] as const;

export default function SupportedFormatsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Supported Markdown and document formats</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">Markdown Lens opens, converts, edits, and exports common technical-document formats entirely in your browser. This matrix distinguishes direct support from structural conversion and clearly identifies content that needs review.</p>
          <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><LockKeyhole className="h-4 w-4 text-accent" />No account, analytics, or document upload.</p>
          <div className="mt-10 overflow-x-auto border border-border">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-surface"><tr>{["Format", "Extensions", "Workflow", "Important limitation"].map((label) => <th key={label} className="border-b border-border px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
              <tbody>
                {formats.map(([format, extensions, workflow, limitation, href]) => (
                  <tr key={format} className="border-b border-border last:border-0">
                    <td className="px-4 py-4 font-medium">
                      <Link href={href} className="underline-offset-4 hover:underline">{format}</Link>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-accent">{extensions}</td>
                    <td className="px-4 py-4"><span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-accent" />{workflow}</span></td>
                    <td className="px-4 py-4 text-muted-foreground">{limitation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <div className="border border-border bg-panel p-6"><h2 className="text-xl font-semibold">Designed for review</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Every conversion opens in the editable workspace with a rendered preview, document outline, warnings, statistics, and asset-aware export.</p></div>
            <div className="border border-border bg-panel p-6"><h2 className="flex items-center gap-2 text-xl font-semibold"><CircleAlert className="h-5 w-5 text-accent" />Legacy formats</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Binary DOC, PPT, and XLS files require export to DOCX, PPTX, or XLSX. This avoids unsafe or abandoned parsing dependencies.</p></div>
          </div>
          <Link href="/editor" className="mt-10 inline-flex h-12 items-center gap-2 rounded-lg bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/88">Open the workspace <ArrowRight className="h-4 w-4" /></Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
