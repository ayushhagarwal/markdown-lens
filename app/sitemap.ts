import type { MetadataRoute } from "next";
import { siteConfig, sitemapPaths } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(siteConfig.dateModified);
  return sitemapPaths.map((entry) => ({
    url: `${siteConfig.url}${entry.path}`,
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
