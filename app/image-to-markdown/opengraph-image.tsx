import { renderOgImage } from "@/lib/og-image";

export const alt = "Image to Markdown converter with local OCR – Markdown Lens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    headline: "Image to Markdown",
    subhead: "Embed PNG, JPG, WebP, or BMP images in Markdown and extract English text with on-device OCR.",
    chips: ["PNG · JPG · WebP", "Local OCR", "Image bundle"],
  });
}
