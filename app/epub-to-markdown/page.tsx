import type { Metadata } from "next";
import { FormatLandingPage } from "@/components/format-landing-page";
import { formatPages } from "@/lib/format-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "EPUB to Markdown Converter",
  description: formatPages.epub.summary,
  path: formatPages.epub.path,
});

export default function Page() {
  return <FormatLandingPage config={formatPages.epub} />;
}
