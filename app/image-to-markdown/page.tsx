import type { Metadata } from "next";
import { FormatLandingPage } from "@/components/format-landing-page";
import { formatPages } from "@/lib/format-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Image to Markdown Converter with Local OCR",
  description:
    "Convert PNG, JPG, WebP, or BMP images to Markdown in your browser, with optional English OCR that runs on your device. Free, private, no upload.",
  path: formatPages.image.path,
});

export default function Page() {
  return <FormatLandingPage config={formatPages.image} />;
}
