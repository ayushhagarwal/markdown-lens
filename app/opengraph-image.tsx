import { renderOgImage } from "@/lib/og-image";

export const alt = "Markdown Lens local Markdown editor and document converter";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    headline: "Edit Markdown locally. Convert documents privately.",
    subhead: "GitHub-style Markdown, local PDF and Word conversion, Mermaid, math, code highlighting, and a private browser workspace.",
    chips: ["Markdown editor", "PDF to Markdown", "Word to Markdown"],
  });
}
