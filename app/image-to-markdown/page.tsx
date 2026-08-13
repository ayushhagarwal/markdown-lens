import type { Metadata } from "next";
import { FormatLandingPage } from "@/components/format-landing-page";
import { formatPages } from "@/lib/format-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Image to Markdown with Local OCR",
  description: formatPages.image.summary,
  path: formatPages.image.path,
});

export default function Page() {
  return <FormatLandingPage config={formatPages.image} />;
}
