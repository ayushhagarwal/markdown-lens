import { renderOgImage } from "@/lib/og-image";

export const alt = "Markdown Lens privacy policy \u2013 Markdown Lens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    headline: "Privacy policy",
    subhead: "Documents are converted in your browser and never uploaded. No accounts, no analytics.",
    chips: ["No upload", "No accounts", "No analytics"],
  });
}
