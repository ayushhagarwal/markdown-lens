import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { GithubIcon } from "@/components/github-icon";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

const variantClassName = {
  nav: "github-star-nav inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  text: "inline-flex items-center gap-2",
  button:
    "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border px-5 text-sm font-semibold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
} as const;

export function GithubStarLink({
  variant,
  className,
  onClick,
  children,
}: {
  variant: "nav" | "text" | "button";
  className?: string;
  onClick?: () => void;
  children?: ReactNode;
}) {
  const label = children ?? (variant === "nav" ? "Star" : "Star on GitHub");

  return (
    <a
      href={siteConfig.githubUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="Star Markdown Lens on GitHub"
      onClick={onClick}
      className={cn(variantClassName[variant], className)}
    >
      {variant === "nav" ? <GithubIcon className="h-4 w-4" aria-hidden /> : null}
      <span>{label}</span>
      {variant === "text" && children == null ? <ExternalLink className="h-4 w-4" aria-hidden /> : null}
    </a>
  );
}
