import { MarkdownLensApp } from "@/components/markdown-lens-app";
import { siteConfig } from "@/lib/site";

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
      publisher: {
        "@id": `${siteConfig.url}/#creator`,
      },
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
      "@type": "SoftwareApplication",
      "@id": `${siteConfig.url}/#software`,
      name: siteConfig.name,
      alternateName: [
        "Online Markdown Editor",
        "Online Markdown Viewer",
        "Markdown Preview Tool",
      ],
      applicationCategory: "DeveloperApplication",
      applicationSubCategory: "Markdown editor",
      operatingSystem: "Any",
      browserRequirements: "Requires a modern web browser with JavaScript enabled.",
      url: siteConfig.url,
      downloadUrl: siteConfig.url,
      installUrl: siteConfig.url,
      codeRepository: siteConfig.githubUrl,
      isAccessibleForFree: true,
      isFamilyFriendly: true,
      license: "https://github.com/ayushhagarwal/markdown-lens/blob/main/LICENSE",
      creator: {
        "@id": `${siteConfig.url}/#creator`,
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      description: siteConfig.description,
      featureList: siteConfig.features,
      keywords: siteConfig.keywords.join(", "),
      sameAs: [siteConfig.githubUrl],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <MarkdownLensApp />
    </>
  );
}
