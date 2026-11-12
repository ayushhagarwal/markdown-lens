import { renderOgImage } from "@/lib/og-image";

export const alt = "ZIP to Markdown importer – Markdown Lens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    headline: "ZIP to Markdown",
    subhead: "Convert the supported documents inside a ZIP archive into Markdown, all in your browser.",
    chips: ["ZIP", "Office · PDF · HTML", "Safe limits"],
  });
}
