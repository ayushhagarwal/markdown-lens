import { renderOgImage } from "@/lib/og-image";

export const alt = "Markdown cheat sheet with examples – Markdown Lens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    headline: "Markdown cheat sheet",
    subhead: "Headings, lists, tables, links, code, footnotes, math, and Mermaid, each with a live preview.",
    chips: ["GFM syntax", "Math / LaTeX", "Mermaid"],
  });
}
