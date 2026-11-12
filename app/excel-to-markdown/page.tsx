import type { Metadata } from "next";
import { FormatLandingPage } from "@/components/format-landing-page";
import { formatPages } from "@/lib/format-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Excel to Markdown Table Converter (XLSX)",
  description:
    "Convert Excel XLSX sheets to Markdown tables free in your browser. Each visible worksheet becomes its own GitHub-flavored table. No upload, no sign-up.",
  path: formatPages.excel.path,
});

export default function Page() {
  return <FormatLandingPage config={formatPages.excel} />;
}
