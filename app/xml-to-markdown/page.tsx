import type { Metadata } from "next";
import { FormatLandingPage } from "@/components/format-landing-page";
import { formatPages } from "@/lib/format-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "XML to Markdown Converter",
  description: formatPages.xml.summary,
  path: formatPages.xml.path,
});

export default function Page() {
  return <FormatLandingPage config={formatPages.xml} />;
}
