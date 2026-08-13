import type { Metadata } from "next";
import { FormatLandingPage } from "@/components/format-landing-page";
import { formatPages } from "@/lib/format-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "HTML to Markdown Converter",
  description: formatPages.html.summary,
  path: formatPages.html.path,
});

export default function Page() {
  return <FormatLandingPage config={formatPages.html} />;
}
