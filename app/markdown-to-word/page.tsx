import type { Metadata } from "next";
import { FormatLandingPage } from "@/components/format-landing-page";
import { formatPages } from "@/lib/format-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Markdown to Word (DOCX) Converter – Free & Private",
  description:
    "Convert Markdown (.md) to a Word .docx in your browser. Headings become Word styles, lists get real numbering, tables and images carry over. No upload.",
  path: formatPages.mdToWord.path,
});

export default function Page() {
  return <FormatLandingPage config={formatPages.mdToWord} />;
}
