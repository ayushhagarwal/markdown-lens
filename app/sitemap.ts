import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-07-11");
  return [
    {
      url: siteConfig.url,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteConfig.url}/pdf-to-markdown`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteConfig.url}/word-to-markdown`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteConfig.url}/markdown-cheatsheet`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...[
      "supported-formats",
      "pptx-to-markdown",
      "excel-to-markdown",
      "html-to-markdown",
      "csv-to-markdown",
      "epub-to-markdown",
      "image-to-markdown",
    ].map((path) => ({
      url: `${siteConfig.url}/${path}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: path === "supported-formats" ? 0.9 : 0.8,
    })),
  ];
}
