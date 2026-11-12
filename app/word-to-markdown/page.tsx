import type { Metadata } from "next";
import { ConversionLandingPage } from "@/components/conversion-landing-page";
import { wordPageConfig } from "@/lib/conversion-pages";
import { pageMetadata } from "@/lib/seo";

const title = "Free Word to Markdown Converter (.docx) | Markdown Lens";
const description =
  "Convert a Word .docx file to editable Markdown locally in your browser, keeping headings, lists, links, tables, and formatting without an upload.";

export const metadata: Metadata = pageMetadata({
  title,
  description,
  path: "/word-to-markdown",
  absoluteTitle: true,
});

export default function WordToMarkdownPage() {
  return <ConversionLandingPage config={wordPageConfig} />;
}
