import type { Metadata } from "next";
import { FormatLandingPage } from "@/components/format-landing-page";
import { formatPages } from "@/lib/format-pages";
export const metadata: Metadata = { title: "CSV to Markdown Table Converter", description: formatPages.csv.summary, alternates: { canonical: formatPages.csv.path } };
export default function Page() { return <FormatLandingPage config={formatPages.csv} />; }
