import type { Metadata } from "next";
import { MarkdownLensApp } from "@/components/markdown-lens-app";
import { markdownViewerFaq, SeoContent } from "@/components/seo-content";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    absolute: siteConfig.title,
  },
  description: siteConfig.description,
  alternates: {
    canonical: "/",
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
      publisher: {
        "@id": `${siteConfig.url}/#creator`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${siteConfig.url}/#webpage`,
      url: siteConfig.url,
      name: siteConfig.title,
      description: siteConfig.description,
      isPartOf: {
        "@id": `${siteConfig.url}/#website`,
      },
      mainEntity: {
        "@id": `${siteConfig.url}/#software`,
      },
      inLanguage: "en",
      dateModified: "2026-06-20",
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
      screenshot: `${siteConfig.url}/opengraph-image`,
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
      softwareVersion: "0.1.0",
      softwareHelp: `${siteConfig.url}/markdown-cheatsheet`,
      dateModified: "2026-06-20",
      inLanguage: "en",
      sameAs: [siteConfig.githubUrl],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${siteConfig.url}/#faq`,
      mainEntity: markdownViewerFaq.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer,
        },
      })),
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
      <main>
        <MarkdownLensApp />
        <SeoContent />
      </main>
    </>
  );
}
