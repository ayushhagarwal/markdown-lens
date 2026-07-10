import type { Metadata } from "next";
import { FormatLandingPage } from "@/components/format-landing-page";
import { formatPages } from "@/lib/format-pages";
export const metadata: Metadata = { title: "Excel XLSX to Markdown Converter", description: formatPages.excel.summary, alternates: { canonical: formatPages.excel.path } };
export default function Page() { return <FormatLandingPage config={formatPages.excel} />; }
