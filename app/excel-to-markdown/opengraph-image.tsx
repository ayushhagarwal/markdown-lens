import { renderOgImage } from "@/lib/og-image";

export const alt = "Excel to Markdown table converter – Markdown Lens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    headline: "Excel to Markdown tables",
    subhead: "Every visible XLSX worksheet becomes a GitHub-flavored Markdown table.",
    chips: ["XLSX", "One table per sheet", "Hidden sheets excluded"],
  });
}
