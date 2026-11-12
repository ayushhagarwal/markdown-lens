import { renderOgImage } from "@/lib/og-image";

export const alt = "JSON to Markdown converter – Markdown Lens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    headline: "JSON to Markdown",
    subhead: "Validate and pretty-print JSON inside a Markdown code block for docs, issues, and prompts.",
    chips: ["JSON", "Validated", "Fenced code block"],
  });
}
