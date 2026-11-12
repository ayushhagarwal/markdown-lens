import type { NextConfig } from "next";
import { sitemapPaths } from "./lib/site";

// Public pages that also have a Markdown version (app/md, lib/page-markdown.ts).
const markdownPages = sitemapPaths.map((entry) => entry.path.slice(1)).filter(Boolean).join("|");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  async rewrites() {
    const acceptsMarkdown = [{ type: "header" as const, key: "accept", value: "(.*)text/markdown(.*)" }];
    return {
      beforeFiles: [
        // Markdown versions of public pages for AI agents (see lib/page-markdown.ts).
        { source: "/index.md", destination: "/md" },
        { source: `/:page(${markdownPages}).md`, destination: "/md/:page" },
        { source: "/", has: acceptsMarkdown, destination: "/md" },
        { source: `/:page(${markdownPages})`, has: acceptsMarkdown, destination: "/md/:page" },
      ],
    };
  },
  async headers() {
    const developmentScriptSource = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'${developmentScriptSource} 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; worker-src 'self' blob:; media-src 'self' blob:;` },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
      // HTML and Markdown versions of these pages share URLs (content negotiation on Accept).
      { source: "/", headers: [{ key: "Vary", value: "Accept" }] },
      { source: `/:page(${markdownPages})`, headers: [{ key: "Vary", value: "Accept" }] },
    ];
  },
};

export default nextConfig;
