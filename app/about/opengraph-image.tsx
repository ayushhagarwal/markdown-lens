import { renderOgImage } from "@/lib/og-image";

export const alt = "About Markdown Lens \u2013 Markdown Lens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    headline: "About Markdown Lens",
    subhead: "A free, open-source Markdown editor and document converter that runs entirely in your browser.",
    chips: ["Open source", "Local conversion", "GitHub"],
  });
}
