import type { Metadata } from "next";
import { Homepage } from "@/components/home/homepage";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Local Document to Markdown Workspace | Markdown Lens" },
  description:
    "Convert documents into clean Markdown, review the result, edit the source, and export entirely in your browser.",
  alternates: { canonical: "/" },
};

export default function Home() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#website`,
      name: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.description,
      inLanguage: "en",
      publisher: { "@id": `${siteConfig.url}/#creator` },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${siteConfig.url}/#webpage`,
      url: siteConfig.url,
      name: "Local Document to Markdown Workspace | Markdown Lens",
      description: siteConfig.description,
      isPartOf: { "@id": `${siteConfig.url}/#website` },
      mainEntity: { "@id": `${siteConfig.url}/#software` },
      inLanguage: "en",
      dateModified: "2026-07-11",
    },
    {
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": `${siteConfig.url}/#creator`,
      name: siteConfig.author.name,
      url: siteConfig.author.url,
      sameAs: [siteConfig.author.url],
    },
    {
      "@context": "https://schema.org",
      "@type": ["SoftwareApplication", "WebApplication"],
      "@id": `${siteConfig.url}/#software`,
      name: siteConfig.name,
      applicationCategory: "DeveloperApplication",
      applicationSubCategory: "Document to Markdown workspace",
      operatingSystem: "Any",
      browserRequirements: "Requires a modern web browser with JavaScript enabled.",
      url: siteConfig.url,
      screenshot: `${siteConfig.url}/opengraph-image`,
      codeRepository: siteConfig.githubUrl,
      isAccessibleForFree: true,
      license: `${siteConfig.githubUrl}/blob/main/LICENSE`,
      creator: { "@id": `${siteConfig.url}/#creator` },
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description: siteConfig.description,
      featureList: siteConfig.features,
      softwareVersion: "0.9.1",
      softwareHelp: `${siteConfig.url}/markdown-cheatsheet`,
      dateModified: "2026-07-11",
      inLanguage: "en",
      sameAs: [siteConfig.githubUrl],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <Homepage />
    </>
  );
}
