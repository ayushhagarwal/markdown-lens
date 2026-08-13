import type { Metadata } from "next";
import { Homepage } from "@/components/home/homepage";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  ...pageMetadata({
    title: siteConfig.title,
    description: siteConfig.shortDescription,
    path: "/",
    absoluteTitle: true,
  }),
  alternates: {
    canonical: "/",
    types: {
      "text/plain": [
        { url: "/llms.txt", title: "Markdown Lens AI summary" },
        { url: "/llms-full.txt", title: "Markdown Lens full AI reference" },
      ],
    },
  },
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
      name: siteConfig.title,
      description: siteConfig.description,
      isPartOf: { "@id": `${siteConfig.url}/#website` },
      mainEntity: { "@id": `${siteConfig.url}/#software` },
      inLanguage: "en",
      dateModified: siteConfig.dateModified,
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
      applicationSubCategory: "Markdown editor and document-to-Markdown workspace",
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
      softwareVersion: siteConfig.softwareVersion,
      softwareHelp: `${siteConfig.url}/markdown-cheatsheet`,
      dateModified: siteConfig.dateModified,
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
