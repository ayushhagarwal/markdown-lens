import type { Metadata } from "next";
import { FormatLandingPage } from "@/components/format-landing-page";
import { formatPages } from "@/lib/format-pages";
export const metadata: Metadata = { title: "PPTX to Markdown Converter", description: formatPages.pptx.summary, alternates: { canonical: formatPages.pptx.path } };
export default function Page() { return <FormatLandingPage config={formatPages.pptx} />; }
