import type { Metadata } from "next";
import { ConversionLandingPage } from "@/components/conversion-landing-page";
import { pdfPageConfig } from "@/lib/conversion-pages";
import { pageMetadata } from "@/lib/seo";

const title = "Free PDF to Markdown Converter | Markdown Lens";
const description =
  "Convert a text-based PDF to editable Markdown locally in your browser. Free and private, keeping headings, lists, links, and page-by-page review.";

export const metadata: Metadata = pageMetadata({
  title,
  description,
  path: "/pdf-to-markdown",
  absoluteTitle: true,
});

export default function PdfToMarkdownPage() {
  return <ConversionLandingPage config={pdfPageConfig} />;
}
