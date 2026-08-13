import type { Metadata } from "next";
import { FormatLandingPage } from "@/components/format-landing-page";
import { formatPages } from "@/lib/format-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Excel XLSX to Markdown Converter",
  description: formatPages.excel.summary,
  path: formatPages.excel.path,
});

export default function Page() {
  return <FormatLandingPage config={formatPages.excel} />;
}
