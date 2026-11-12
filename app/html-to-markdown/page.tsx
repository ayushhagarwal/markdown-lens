import type { Metadata } from "next";
import { FormatLandingPage } from "@/components/format-landing-page";
import { formatPages } from "@/lib/format-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "HTML to Markdown Converter – Free & Private",
  description:
    "Convert an HTML file to clean Markdown free in your browser. Keeps headings, links, lists, tables, and code; strips scripts, styles, and forms. No upload.",
  path: formatPages.html.path,
});

export default function Page() {
  return <FormatLandingPage config={formatPages.html} />;
}
