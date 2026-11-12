import { renderOgImage } from "@/lib/og-image";

export const alt = "HTML to Markdown converter – Markdown Lens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    headline: "HTML to Markdown",
    subhead: "Clean Markdown from local HTML files, with scripts, styles, and forms removed.",
    chips: ["HTML", "Links and tables", "Scripts stripped"],
  });
}
