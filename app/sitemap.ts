import type { MetadataRoute } from "next";
import { modifiedFor, siteConfig, sitemapPaths } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapPaths.map((entry) => ({
    url: `${siteConfig.url}${entry.path}`,
    lastModified: new Date(modifiedFor(entry.path)),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
