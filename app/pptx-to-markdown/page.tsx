import type { Metadata } from "next";
import { FormatLandingPage } from "@/components/format-landing-page";
import { formatPages } from "@/lib/format-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "PPTX to Markdown (MD) Converter – Free & Private",
  description:
    "Convert PowerPoint PPTX to Markdown (.md) free in your browser. Keeps slide titles, bullet text, speaker notes and images – no upload, no sign-up.",
  path: formatPages.pptx.path,
});

export default function Page() {
  return <FormatLandingPage config={formatPages.pptx} />;
}
