import type { Metadata } from "next";
import { FormatLandingPage } from "@/components/format-landing-page";
import { formatPages } from "@/lib/format-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "JSON to Markdown Converter – Free & Private",
  description:
    "Convert a JSON file to Markdown free in your browser: validated, pretty-printed, and wrapped in a json code block for docs, issues, or prompts. No upload.",
  path: formatPages.json.path,
});

export default function Page() {
  return <FormatLandingPage config={formatPages.json} />;
}
