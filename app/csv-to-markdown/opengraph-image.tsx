import { renderOgImage } from "@/lib/og-image";

export const alt = "CSV to Markdown table converter – Markdown Lens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    headline: "CSV to Markdown table",
    subhead: "Turn CSV or TSV files into GitHub-flavored Markdown tables, quoted commas included.",
    chips: ["CSV", "TSV", "GFM tables"],
  });
}
