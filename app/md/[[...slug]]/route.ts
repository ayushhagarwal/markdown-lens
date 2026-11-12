import { markdownPagePaths, pageMarkdown } from "@/lib/page-markdown";
import { siteConfig } from "@/lib/site";

// Markdown versions of public pages. Reached through the rewrites in
// next.config.ts: /<page>.md, /index.md, or any page requested with
// `Accept: text/markdown`.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return markdownPagePaths.map((path) => ({ slug: path === "/" ? [] : path.slice(1).split("/") }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const path = slug?.length ? `/${slug.join("/")}` : "/";
  const markdown = pageMarkdown(path);
  if (!markdown) return new Response("Not found\n", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const canonical = `${siteConfig.url}${path === "/" ? "" : path}`;
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // The HTML page is the canonical, indexable version.
      Link: `<${canonical}>; rel="canonical"`,
      "X-Robots-Tag": "noindex",
      Vary: "Accept",
    },
  });
}
