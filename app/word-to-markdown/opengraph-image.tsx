import { renderOgImage } from "@/lib/og-image";

export const alt = "Word to Markdown converter – Markdown Lens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    headline: "Word to Markdown",
    subhead: "Convert .docx headings, lists, links, tables, and images into clean Markdown in your browser.",
    chips: ["DOCX", "Tables", "Images as assets"],
  });
}
