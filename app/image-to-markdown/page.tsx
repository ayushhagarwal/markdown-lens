import type { Metadata } from "next";
import { FormatLandingPage } from "@/components/format-landing-page";
import { formatPages } from "@/lib/format-pages";
export const metadata: Metadata = { title: "Image to Markdown with Local OCR", description: formatPages.image.summary, alternates: { canonical: formatPages.image.path } };
export default function Page() { return <FormatLandingPage config={formatPages.image} />; }
