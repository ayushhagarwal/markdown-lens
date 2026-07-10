import type { Metadata } from "next";
import { FormatLandingPage } from "@/components/format-landing-page";
import { formatPages } from "@/lib/format-pages";
export const metadata: Metadata = { title: "HTML to Markdown Converter", description: formatPages.html.summary, alternates: { canonical: formatPages.html.path } };
export default function Page() { return <FormatLandingPage config={formatPages.html} />; }
