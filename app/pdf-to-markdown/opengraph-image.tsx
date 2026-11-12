import { renderOgImage } from "@/lib/og-image";

export const alt = "PDF to Markdown converter – Markdown Lens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    headline: "PDF to Markdown",
    subhead: "Turn text-based PDFs into editable Markdown, page by page, without uploading the file.",
    chips: ["Headings and lists", "Page markers", "Download .md"],
  });
}
