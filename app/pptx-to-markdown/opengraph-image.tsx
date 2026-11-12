import { renderOgImage } from "@/lib/og-image";

export const alt = "PPTX to Markdown converter – Markdown Lens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    headline: "PowerPoint to Markdown",
    subhead: "Each slide becomes a heading with bullet points and speaker notes, ready to save as .md.",
    chips: ["PPTX", "Speaker notes", "Slide images"],
  });
}
