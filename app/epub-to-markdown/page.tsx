import type { Metadata } from "next";
import { FormatLandingPage } from "@/components/format-landing-page";
import { formatPages } from "@/lib/format-pages";
export const metadata: Metadata = { title: "EPUB to Markdown Converter", description: formatPages.epub.summary, alternates: { canonical: formatPages.epub.path } };
export default function Page() { return <FormatLandingPage config={formatPages.epub} />; }
