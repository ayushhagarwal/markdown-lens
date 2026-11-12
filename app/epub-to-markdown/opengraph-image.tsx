import { renderOgImage } from "@/lib/og-image";

export const alt = "EPUB to Markdown converter – Markdown Lens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    headline: "EPUB to Markdown",
    subhead: "Convert a DRM-free EPUB into one Markdown document with chapters in reading order.",
    chips: ["EPUB", "Chapter order", "Book title"],
  });
}
