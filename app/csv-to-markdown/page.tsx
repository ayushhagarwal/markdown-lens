import type { Metadata } from "next";
import { FormatLandingPage } from "@/components/format-landing-page";
import { formatPages } from "@/lib/format-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "CSV to Markdown Table Converter – Free",
  description:
    "Convert CSV or TSV to a Markdown table free in your browser. Handles quoted commas, keeps the header row, and outputs GitHub-flavored tables. No upload.",
  path: formatPages.csv.path,
});

export default function Page() {
  return <FormatLandingPage config={formatPages.csv} />;
}
