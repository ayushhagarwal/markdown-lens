import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteConfig.url,
      lastModified: new Date("2026-06-02"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteConfig.url}/markdown-cheatsheet`,
      lastModified: new Date("2026-06-20"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteConfig.url}/llms.txt`,
      lastModified: new Date("2026-06-02"),
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
