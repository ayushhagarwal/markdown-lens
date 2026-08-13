import type { Metadata } from "next";
import { FormatLandingPage } from "@/components/format-landing-page";
import { formatPages } from "@/lib/format-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "ZIP to Markdown Importer",
  description: formatPages.zip.summary,
  path: formatPages.zip.path,
});

export default function Page() {
  return <FormatLandingPage config={formatPages.zip} />;
}
