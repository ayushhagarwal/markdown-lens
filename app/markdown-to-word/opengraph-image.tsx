import { renderOgImage } from "@/lib/og-image";

export const alt = "Markdown to Word converter – Markdown Lens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    headline: "Markdown to Word",
    subhead: "Export a .md file as an editable .docx with Word heading styles, numbered lists, and tables, in your browser.",
    chips: ["MD → DOCX", "Word styles", "No upload"],
  });
}
