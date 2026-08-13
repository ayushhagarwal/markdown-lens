import type { Metadata } from "next";
import { FormatLandingPage } from "@/components/format-landing-page";
import { formatPages } from "@/lib/format-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "PPTX to Markdown Converter",
  description: formatPages.pptx.summary,
  path: formatPages.pptx.path,
});

export default function Page() {
  return <FormatLandingPage config={formatPages.pptx} />;
}
