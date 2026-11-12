import type { Metadata } from "next";
import { FormatLandingPage } from "@/components/format-landing-page";
import { formatPages } from "@/lib/format-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "XML to Markdown Converter – Free & Private",
  description:
    "Convert an XML file to Markdown free in your browser. Checks it is well-formed, re-indents it, and wraps it in an xml code block. No upload, no sign-up.",
  path: formatPages.xml.path,
});

export default function Page() {
  return <FormatLandingPage config={formatPages.xml} />;
}
