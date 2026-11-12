import { renderOgImage } from "@/lib/og-image";

export const alt = "Supported formats in Markdown Lens – Markdown Lens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    headline: "Every format, one workspace",
    subhead: "PDF, Word, PowerPoint, Excel, HTML, CSV, JSON, XML, EPUB, ZIP, and images to Markdown.",
    chips: ["12 workflows", "Local conversion", "Clear limits"],
  });
}
