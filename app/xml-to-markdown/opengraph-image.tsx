import { renderOgImage } from "@/lib/og-image";

export const alt = "XML to Markdown converter – Markdown Lens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    headline: "XML to Markdown",
    subhead: "Check, re-indent, and wrap XML in a Markdown code block without leaving your browser.",
    chips: ["XML", "Well-formed check", "Fenced code block"],
  });
}
