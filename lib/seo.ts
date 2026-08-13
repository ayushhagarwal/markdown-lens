import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

export const defaultOgImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Markdown Lens local Markdown editor and document-to-Markdown workspace",
} as const;

export function brandedTitle(title: string) {
  return title.includes("Markdown Lens") ? title : `${title} | Markdown Lens`;
}

export function pageMetadata({
  title,
  description,
  path,
  type = "website",
  absoluteTitle = false,
  index = true,
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  absoluteTitle?: boolean;
  index?: boolean;
}): Metadata {
  const fullTitle = brandedTitle(title);
  return {
    title: absoluteTitle ? { absolute: fullTitle } : title,
    description,
    alternates: { canonical: path },
    robots: index
      ? undefined
      : {
          index: false,
          follow: true,
        },
    openGraph: {
      type,
      url: path,
      title: fullTitle,
      description,
      siteName: siteConfig.name,
      images: [defaultOgImage],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [defaultOgImage.url],
    },
  };
}
